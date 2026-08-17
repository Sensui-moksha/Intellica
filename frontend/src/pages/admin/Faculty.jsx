import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Plus, Search, Loader2, CheckCircle2,
  Clock, Trash2, Edit3, X, AlertTriangle, CheckSquare, Square,
  Mail, User, RefreshCw, ShieldCheck, Crown
} from 'lucide-react';
import { adminApi } from '../../api/services';

export default function AdminFaculty() {
  const [searchParams] = useSearchParams();
  const urlDept = searchParams.get('dept') || searchParams.get('department');

  const [faculty, setFaculty]               = useState([]);
  const [pendingFaculty, setPending]       = useState([]);
  const [departments, setDepartments]       = useState([]);
  const [tab, setTab]                       = useState('ALL'); // 'ALL' | 'FACULTY' | 'HOD' | 'ADMIN' | 'PENDING'
  const [search, setSearch]                 = useState('');
  const [deptFilter, setDeptFilter]         = useState(urlDept || 'ALL');
  const [loading, setLoading]               = useState(true);
  const [acting, setActing]                 = useState(false);

  // Selection for Multiple Delete
  const [selectedIds, setSelectedIds]       = useState([]);

  // Modals & Toasts
  const [showModal, setShowModal]           = useState(false);
  const [editTarget, setEditTarget]         = useState(null);
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [showBulkConfirm, setShowBulk]      = useState(false);
  const [toastMsg, setToastMsg]             = useState('');
  const [errorMsg, setErrorMsg]             = useState('');

  // Form State (Handles Faculty, HOD, and ADMIN creation)
  const [form, setForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    department: '',
    designation: 'Assistant Professor',
    role: 'FACULTY', // 'FACULTY' | 'HOD' | 'ADMIN'
    password: '',
    googleScholar: '',
    vidwanId: '',
    scopusId: '',
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadData = () => {
    setLoading(true);
    setErrorMsg('');
    Promise.all([
      adminApi.getAllFaculty(),
      adminApi.getPendingFaculty(),
      adminApi.getDepartments(),
    ]).then(([allRes, pendRes, deptRes]) => {
      const allData  = Array.isArray(allRes.data) ? allRes.data : allRes.data?.faculty || [];
      const pendData = Array.isArray(pendRes.data) ? pendRes.data : pendRes.data?.faculty || [];
      const depts    = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.departments || [];

      setFaculty(allData);
      setPending(pendData);
      setDepartments(depts.map(d => typeof d === 'string' ? d : d.name));
      setSelectedIds([]);
    }).catch(err => {
      console.error(err);
      setErrorMsg('Failed to load faculty & staff directory.');
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Selection Logic
  const toggleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredFaculty.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFaculty.map(f => f._id));
    }
  };

  // Create / Update Submit
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setErrorMsg('Please enter Name and Email.');
      return;
    }

    if (form.role !== 'ADMIN' && (!form.employeeId.trim() || !form.department)) {
      setErrorMsg('Please fill Employee ID and Department.');
      return;
    }

    setActing(true);
    setErrorMsg('');

    try {
      if (editTarget) {
        // UPDATE
        await adminApi.updateFaculty(editTarget._id, form);
        showToast(`${form.role === 'ADMIN' ? 'Administrator' : form.role === 'HOD' ? 'HOD' : 'Faculty'} ${form.name} updated successfully!`);
      } else {
        // CREATE (Faculty, HOD, or ADMIN)
        await adminApi.createFaculty(form);
        showToast(`${form.role === 'ADMIN' ? 'Administrator' : form.role === 'HOD' ? 'HOD' : 'Faculty'} account for ${form.name} created successfully!`);
      }
      setShowModal(false);
      setEditTarget(null);
      setForm({
        name: '', email: '', employeeId: '', department: '',
        designation: 'Assistant Professor', role: 'FACULTY', password: '',
        googleScholar: '', vidwanId: '', scopusId: ''
      });
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Operation failed. Please check your inputs.');
    } finally {
      setActing(false);
    }
  };

  // Single Delete
  const handleConfirmSingleDelete = async () => {
    if (!deleteTarget) return;
    setActing(true);
    try {
      await adminApi.deleteFaculty(deleteTarget._id);
      showToast(`Account ${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Delete failed.');
    } finally {
      setActing(false);
    }
  };

  // Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setActing(true);
    try {
      await adminApi.bulkDeleteFaculty(selectedIds);
      showToast(`${selectedIds.length} member(s) deleted successfully.`);
      setShowBulk(false);
      setSelectedIds([]);
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Bulk delete failed.');
    } finally {
      setActing(false);
    }
  };

  // Approve Pending Registration
  const handleApprove = async (id) => {
    setActing(true);
    try {
      await adminApi.approveFaculty(id);
      showToast('Faculty registration approved!');
      loadData();
    } catch (e) {
      console.error(e);
      setErrorMsg('Approval failed.');
    } finally {
      setActing(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const list = tab === 'PENDING' ? pendingFaculty : faculty;
    if (!list.length) return;
    const headers = ['Name', 'Role', 'Email', 'EmployeeID', 'Department', 'Designation', 'TotalCredits', 'Status'];
    const rows = list.map(f => [
      `"${f.name || ''}"`,
      `"${f.role || 'FACULTY'}"`,
      `"${f.email || ''}"`,
      `"${f.employeeId || f.regId || ''}"`,
      `"${f.department || ''}"`,
      `"${f.designation || ''}"`,
      f.totalCredits || 0,
      `"${f.status || (f.isApproved ? 'APPROVED' : 'PENDING')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `intellica_staff_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openCreate = (initialRole = 'FACULTY') => {
    setEditTarget(null);
    setForm({
      name: '',
      email: '',
      employeeId: initialRole === 'ADMIN' ? `ADM-${Date.now().toString().slice(-4)}` : '',
      department: initialRole === 'ADMIN' ? 'ADMINISTRATION' : (departments[0] || 'CSE'),
      designation: initialRole === 'ADMIN' ? 'Institutional Administrator' : initialRole === 'HOD' ? 'Head of Department (HOD)' : 'Assistant Professor',
      role: initialRole,
      password: '',
      googleScholar: '',
      vidwanId: '',
      scopusId: ''
    });
    setShowModal(true);
  };

  const openEdit = (fac, e) => {
    e?.stopPropagation();
    setEditTarget(fac);
    setForm({
      name: fac.name || '',
      email: fac.email || '',
      employeeId: fac.employeeId || fac.regId || '',
      department: fac.department || '',
      designation: fac.designation || 'Assistant Professor',
      role: fac.role || (fac.designation?.includes('HOD') ? 'HOD' : 'FACULTY'),
      password: '',
      googleScholar: fac.googleScholar || '',
      vidwanId: fac.vidwanId || '',
      scopusId: fac.scopusId || '',
    });
    setShowModal(true);
  };

  // Filter based on Tab, Search, and Department
  const facultyCount = faculty.filter(f => f.role === 'FACULTY' || (!f.role && !f.designation?.includes('HOD'))).length;
  const hodCount     = faculty.filter(f => f.role === 'HOD' || f.designation?.includes('HOD')).length;
  const adminCount   = faculty.filter(f => f.role === 'ADMIN').length;

  const currentList = tab === 'PENDING'
    ? pendingFaculty
    : tab === 'FACULTY'
      ? faculty.filter(f => f.role === 'FACULTY' || (!f.role && !f.designation?.includes('HOD')))
      : tab === 'HOD'
        ? faculty.filter(f => f.role === 'HOD' || f.designation?.includes('HOD'))
        : tab === 'ADMIN'
          ? faculty.filter(f => f.role === 'ADMIN')
          : faculty;

  const filteredFaculty = currentList.filter(f => {
    const query = search.toLowerCase();
    const nameMatch = (f.name || '').toLowerCase().includes(query) ||
                      (f.employeeId || f.regId || '').toLowerCase().includes(query) ||
                      (f.email || '').toLowerCase().includes(query);
    const deptMatch = deptFilter === 'ALL' || (f.department || '').toUpperCase() === deptFilter.toUpperCase();
    return nameMatch && deptMatch;
  });

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff & Administrator Directory</h1>
          <p className="text-slate-500 text-xs mt-1">
            Manage institutional users, create administrators with full admin rights, and assign HODs and faculty.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2.5 bg-white border rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            style={{ borderColor: '#e2e8f0' }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          {/* Add Admin Button */}
          <button
            onClick={() => openCreate('ADMIN')}
            className="flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>+ Add Admin</span>
          </button>

          {/* Add Faculty / HOD Button */}
          <motion.button
            whileHover={{ y: -1, boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openCreate('FACULTY')}
            className="flex items-center gap-2 text-xs font-bold text-white px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-md shadow-blue-500/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Filter and Bulk Action Bar */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between gap-3 flex-wrap bg-white p-3.5 rounded-2xl border shadow-xs"
        style={{ borderColor: '#e8edf5' }}
      >
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl flex-wrap gap-1">
          <button
            onClick={() => { setTab('ALL'); setSelectedIds([]); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'ALL' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Members ({faculty.length})
          </button>
          <button
            onClick={() => { setTab('FACULTY'); setSelectedIds([]); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'FACULTY' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Faculty ({facultyCount})
          </button>
          <button
            onClick={() => { setTab('HOD'); setSelectedIds([]); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'HOD' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            HODs ({hodCount})
          </button>
          <button
            onClick={() => { setTab('ADMIN'); setSelectedIds([]); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === 'ADMIN' ? 'bg-white text-purple-700 shadow-2xs' : 'text-purple-600 hover:text-purple-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Admins ({adminCount})</span>
          </button>
          <button
            onClick={() => { setTab('PENDING'); setSelectedIds([]); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === 'PENDING' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Approvals</span>
            {pendingFaculty.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-extrabold">
                {pendingFaculty.length}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or employee/admin ID…"
            className="w-full pl-10 pr-4 py-1.5 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50/50"
            style={{ borderColor: '#e2e8f0' }}
          />
        </div>

        {/* Department Filter */}
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="border rounded-xl px-3 py-1.5 text-xs bg-slate-50/50 outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium cursor-pointer"
          style={{ borderColor: '#e2e8f0' }}
        >
          <option value="ALL">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
          <option value="ADMINISTRATION">Administration</option>
        </select>

        {/* Bulk Delete Button */}
        {selectedIds.length > 0 && (
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={() => setShowBulk(true)}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected ({selectedIds.length})
          </motion.button>
        )}
      </motion.div>

      {/* Error and Toast Alerts */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-800 p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staff & Administrator Table */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-3xl border overflow-hidden shadow-xs"
        style={{ borderColor: '#e8edf5' }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center p-14 gap-2">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs text-slate-500 font-semibold">Loading directory…</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e8edf5' }}>
              <tr>
                <th className="w-12 px-5 py-3 text-left">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    {selectedIds.length > 0 && selectedIds.length === filteredFaculty.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                  </button>
                </th>
                {['Staff Member', 'ID / Reg ID', 'Role', 'Department', 'Designation', 'Credits', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#f8fafc' }}>
              {filteredFaculty.map((f, i) => {
                const isSelected = selectedIds.includes(f._id);
                const isAdmin = f.role === 'ADMIN';
                const isHOD = f.role === 'HOD' || f.designation?.includes('HOD');

                return (
                  <motion.tr
                    key={f._id || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(f._id)}
                        className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    </td>

                    {/* Member */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          isAdmin ? 'bg-purple-100 text-purple-700' :
                          isHOD ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {f.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">{f.name}</span>
                          <p className="text-[11px] text-slate-400 font-mono">{f.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Employee ID */}
                    <td className="px-4 py-3.5 text-slate-600 font-mono text-xs font-semibold">
                      {f.employeeId || f.regId || '—'}
                    </td>

                    {/* Role Badge */}
                    <td className="px-4 py-3.5">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                          <ShieldCheck className="w-3 h-3 text-purple-600" />
                          <span>ADMIN</span>
                        </span>
                      ) : isHOD ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          <Crown className="w-3 h-3 text-blue-600" />
                          <span>HOD</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          FACULTY
                        </span>
                      )}
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                        {f.department || (isAdmin ? 'Administration' : 'General')}
                      </span>
                    </td>

                    {/* Designation */}
                    <td className="px-4 py-3.5 text-slate-600 text-xs font-medium">
                      {f.designation || (isAdmin ? 'Institutional Administrator' : isHOD ? 'Head of Department (HOD)' : 'Assistant Professor')}
                    </td>

                    {/* Credits */}
                    <td className="px-4 py-3.5 font-black text-blue-600 text-xs">
                      {f.totalCredits || 0} <span className="text-[10px] text-slate-400 font-normal">pts</span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {f.isApproved !== false && f.status !== 'PENDING' ? (
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          APPROVED
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApprove(f._id)}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer shadow-2xs"
                        >
                          Approve Now
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => openEdit(f, e)}
                          title="Edit Details"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(f)}
                          title="Delete Member"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}

              {filteredFaculty.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400 text-xs">
                    No members found in this category. Click <strong>"+ Add Member"</strong> or <strong>"+ Add Admin"</strong> above to register accounts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* ── CREATE / EDIT MEMBER & ADMIN MODAL ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border p-6 space-y-5 max-h-[90vh] overflow-y-auto"
              style={{ borderColor: '#e2e8f0' }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-white shadow-md ${
                    form.role === 'ADMIN'
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-700 shadow-purple-500/25'
                      : form.role === 'HOD'
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-500/25'
                        : 'bg-gradient-to-br from-blue-600 to-cyan-600 shadow-blue-500/25'
                  }`}>
                    {form.role === 'ADMIN' ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {editTarget
                        ? `Edit ${form.role === 'ADMIN' ? 'Administrator' : form.role === 'HOD' ? 'HOD' : 'Faculty'}`
                        : `Add New ${form.role === 'ADMIN' ? 'Administrator' : form.role === 'HOD' ? 'HOD' : 'Faculty Member'}`}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {form.role === 'ADMIN'
                        ? 'Create account with complete administrative privileges'
                        : 'Register academic staff and research profile'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSave} className="space-y-4">
                {/* 1. ROLE SELECTOR (FACULTY vs HOD vs ADMIN) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Account Type / Access Level <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'FACULTY', label: 'Faculty Member', desc: 'Standard staff access' },
                      { key: 'HOD', label: 'Head of Dept (HOD)', desc: 'Review dept proposals' },
                      { key: 'ADMIN', label: 'Administrator', desc: 'Full admin rights' },
                    ].map(r => (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => {
                          setForm({
                            ...form,
                            role: r.key,
                            department: r.key === 'ADMIN' ? 'ADMINISTRATION' : (form.department === 'ADMINISTRATION' ? (departments[0] || 'CSE') : form.department),
                            designation: r.key === 'ADMIN' ? 'Institutional Administrator' : r.key === 'HOD' ? 'Head of Department (HOD)' : 'Assistant Professor',
                            employeeId: r.key === 'ADMIN' && !form.employeeId ? `ADM-${Date.now().toString().slice(-4)}` : form.employeeId
                          });
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          form.role === r.key
                            ? r.key === 'ADMIN'
                              ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/25 ring-2 ring-purple-400/40'
                              : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40'
                            : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xs font-black block">{r.label}</span>
                        <span className={`text-[10px] mt-0.5 block ${form.role === r.key ? 'text-white/80' : 'text-slate-400'}`}>
                          {r.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ADMIN PRIVILEGES CALLOUT */}
                {form.role === 'ADMIN' && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-xs space-y-1 text-purple-950"
                  >
                    <div className="flex items-center gap-2 font-bold text-purple-900">
                      <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Full Institutional Administrator Rights</span>
                    </div>
                    <p className="text-[11px] text-purple-800 leading-relaxed">
                      This user will have full access to approve credits, manage all academic departments, configure scoring algorithms, and register other administrators.
                    </p>
                  </motion.div>
                )}

                {/* HOD CALLOUT */}
                {form.role === 'HOD' && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-1 text-blue-950"
                  >
                    <div className="flex items-center gap-2 font-bold text-blue-900">
                      <Crown className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Department Head Assignment</span>
                    </div>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      This user will be assigned as active HOD for <strong>{form.department || 'the selected department'}</strong> to evaluate research submissions.
                    </p>
                  </motion.div>
                )}

                {/* Full Name & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder={form.role === 'ADMIN' ? 'e.g. Dr. John Admin' : 'e.g. Dr. Sarah Jenkins'}
                        className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                        style={{ borderColor: '#e2e8f0' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="e.g. admin@university.edu"
                        className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                        style={{ borderColor: '#e2e8f0' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Employee / Admin ID & Department */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {form.role === 'ADMIN' ? 'Administrator ID / Reg ID' : 'Employee ID'} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.employeeId}
                      onChange={e => setForm({ ...form, employeeId: e.target.value })}
                      placeholder={form.role === 'ADMIN' ? 'e.g. ADM-101' : 'e.g. CSE-101'}
                      className="w-full px-3.5 py-2 bg-slate-50 border rounded-2xl text-xs font-mono font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                      style={{ borderColor: '#e2e8f0' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Department <span className="text-rose-500">*</span>
                    </label>
                    {form.role === 'ADMIN' ? (
                      <input
                        type="text"
                        value={form.department || 'ADMINISTRATION'}
                        onChange={e => setForm({ ...form, department: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-100 border rounded-2xl text-xs font-bold text-slate-700 outline-none"
                        style={{ borderColor: '#e2e8f0' }}
                      />
                    ) : (
                      <select
                        required
                        value={form.department}
                        onChange={e => setForm({ ...form, department: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        style={{ borderColor: '#e2e8f0' }}
                      >
                        <option value="">Select Department…</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    )}
                  </div>
                </div>

                {/* Designation Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Designation <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={form.designation}
                    onChange={e => setForm({ ...form, designation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 transition-all cursor-pointer"
                    style={{ borderColor: '#e2e8f0' }}
                  >
                    {form.role === 'ADMIN' ? (
                      <>
                        <option value="Institutional Administrator">Institutional Administrator</option>
                        <option value="Principal / Dean">Principal / Dean</option>
                        <option value="Director">Director</option>
                        <option value="Academic Administrator">Academic Administrator</option>
                        <option value="System Administrator">System Administrator</option>
                      </>
                    ) : form.role === 'HOD' ? (
                      <>
                        <option value="Head of Department (HOD)">Head of Department (HOD)</option>
                        <option value="Professor & HOD">Professor & HOD</option>
                        <option value="Associate Professor & HOD">Associate Professor & HOD</option>
                      </>
                    ) : (
                      <>
                        <option value="Assistant Professor">Assistant Professor</option>
                        <option value="Associate Professor">Associate Professor</option>
                        <option value="Professor">Professor</option>
                        <option value="Senior Lecturer">Senior Lecturer</option>
                        <option value="Lecturer">Lecturer</option>
                        <option value="Research Scholar">Research Scholar</option>
                        <option value="Visiting Faculty">Visiting Faculty</option>
                        <option value="Adjunct Professor">Adjunct Professor</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={acting}
                    className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      form.role === 'ADMIN'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/25'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{acting ? 'Saving…' : editTarget ? 'Save Changes' : form.role === 'ADMIN' ? 'Create Administrator' : 'Create Member'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SINGLE DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200"
            >
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Account</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete <strong>{deleteTarget.name}</strong> ({deleteTarget.role || 'Member'})? This will permanently remove their access and associated research files.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={handleConfirmSingleDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {acting ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BULK DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showBulkConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200"
            >
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Bulk Delete Members</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete <strong>{selectedIds.length}</strong> selected accounts? This action cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulk(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={handleConfirmBulkDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {acting ? 'Deleting…' : `Yes, Delete (${selectedIds.length})`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
