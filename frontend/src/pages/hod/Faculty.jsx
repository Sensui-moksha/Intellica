import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, CheckCircle, Loader2, UserCheck,
  Clock, Plus, X, AlertTriangle, Building2, ShieldCheck, Check, Calculator
} from 'lucide-react';
import { hodApi, pbasApi } from '../../api/services';

export default function HodFaculty() {
  const [approvedFaculty, setApprovedFaculty] = useState([]);
  const [pendingFaculty, setPendingFaculty]   = useState([]);
  const [tab, setTab]                         = useState('APPROVED'); // 'APPROVED' | 'PENDING'
  const [search, setSearch]                   = useState('');
  const [loading, setLoading]                 = useState(true);
  const [acting, setActing]                   = useState(false);

  // Department State
  const [hodDepartment, setHodDepartment]     = useState('');
  const [pbasMap, setPbasMap]                 = useState({});

  // Add Faculty Modal State
  const [showAddModal, setShowAddModal]       = useState(false);
  const [creating, setCreating]               = useState(false);
  const [toastMsg, setToastMsg]               = useState('');
  const [modalError, setModalError]           = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    designation: 'Assistant Professor',
    googleScholar: '',
    vidwanId: '',
    scopusId: '',
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const fetchFaculty = () => {
    setLoading(true);
    Promise.all([
      hodApi.getFacultyList(),
      hodApi.getPendingFaculty(),
      hodApi.getProfile(),
      pbasApi.getDeptAppraisals('2025-26').catch(() => ({ data: [] }))
    ]).then(([appRes, pendRes, profRes, pbasRes]) => {
      setApprovedFaculty(Array.isArray(appRes.data) ? appRes.data : appRes.data?.faculty || []);
      setPendingFaculty(Array.isArray(pendRes.data) ? pendRes.data : pendRes.data?.faculty || []);
      if (profRes.data?.department) {
        setHodDepartment(profRes.data.department);
      }
      const pbasData = Array.isArray(pbasRes?.data) ? pbasRes.data : [];
      const pMap = {};
      pbasData.forEach(p => {
        const fId = p.faculty?._id || p.faculty;
        if (fId) pMap[fId] = p;
      });
      setPbasMap(pMap);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const handleApprove = async (id) => {
    setActing(true);
    try {
      await hodApi.approveFaculty(id);
      showToast('Faculty registration approved!');
      fetchFaculty();
    } catch (e) {
      console.error(e);
    } finally {
      setActing(false);
    }
  };

  const handleDiscuss = async (id) => {
    setActing(true);
    try {
      await hodApi.discussionFaculty(id, {});
      showToast('Faculty called for discussion.');
      fetchFaculty();
    } catch (e) {
      console.error(e);
    } finally {
      setActing(false);
    }
  };

  const handleAddFacultySubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.employeeId.trim()) {
      setModalError('Please enter Name, Email, and Employee ID.');
      return;
    }

    setCreating(true);
    setModalError('');

    try {
      const res = await hodApi.createFaculty({
        ...form,
        department: hodDepartment || undefined
      });

      showToast(res.data?.message || 'Faculty added! Submitted to Admin for approval.');
      setShowAddModal(false);
      setForm({
        name: '', email: '', employeeId: '',
        designation: 'Assistant Professor',
        googleScholar: '', vidwanId: '', scopusId: ''
      });
      setTab('PENDING'); // Switch to pending tab to see the new entry
      fetchFaculty();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to create faculty member. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const currentList = tab === 'APPROVED' ? approvedFaculty : pendingFaculty;
  const filtered = currentList.filter(f =>
    (f.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.employeeId || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Toast Banner */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-600 text-white rounded-2xl text-xs font-bold shadow-lg flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg('')}><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">Department Faculty</h1>
            {hodDepartment && (
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold">
                {hodDepartment} Department
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Manage departmental faculty, add new members, and track registration approvals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTab('APPROVED')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                tab === 'APPROVED' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Approved ({approvedFaculty.length})
            </button>
            <button
              onClick={() => setTab('PENDING')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                tab === 'PENDING' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Pending Admin ({pendingFaculty.length})
            </button>
          </div>

          {/* Add Faculty CTA Button */}
          <button
            type="button"
            onClick={() => {
              setModalError('');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Faculty</span>
          </button>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants} className="relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by faculty name, email, or employee ID…"
          className="w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          style={{ borderColor: '#e2e8f0' }}
        />
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-3xl border overflow-hidden shadow-xs"
        style={{ borderColor: '#e8edf5' }}>
        {loading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e8edf5' }}>
              <tr>
                {['Faculty Member', 'Employee ID', 'Designation', 'Total Credits', 'PBAS Score', 'Approval Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#f8fafc' }}>
              {filtered.map((f, i) => (
                <motion.tr key={f._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 bg-blue-100 text-blue-700">
                        {f.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'F'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{f.name}</p>
                        <p className="text-[11px] text-slate-400">{f.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600 font-mono text-xs">{f.employeeId || '—'}</td>
                  <td className="px-5 py-4 text-slate-600 text-xs">{f.designation || 'Assistant Professor'}</td>
                  <td className="px-5 py-4 font-bold text-blue-600 text-xs">
                    {f.totalCredits || 0} <span className="text-[10px] text-slate-400 font-normal">pts</span>
                  </td>
                  <td className="px-5 py-4">
                    {pbasMap[f._id]?.calculatedScores?.total !== undefined ? (
                      <div className="flex flex-col">
                        <span className="font-black text-indigo-700 text-xs">
                          {pbasMap[f._id].calculatedScores.total.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">/ 1000</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{pbasMap[f._id].academicYear}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Not submitted</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1"
                      style={{
                        background: f.status === 'APPROVED' || f.isApproved ? '#d1fae5' : '#fef3c7',
                        color: f.status === 'APPROVED' || f.isApproved ? '#065f46' : '#92400e',
                        borderColor: f.status === 'APPROVED' || f.isApproved ? '#a7f3d0' : '#fde68a'
                      }}>
                      {f.status === 'APPROVED' || f.isApproved ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Active / Approved</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pending Admin Approval</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {tab === 'PENDING' ? (
                      <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        Awaiting Admin
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        Active Member
                      </span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-xs space-y-1">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No faculty members found</p>
            <p className="text-slate-400">Click "+ Add Faculty" to register a faculty member for your department.</p>
          </div>
        )}
      </motion.div>

      {/* ── ADD FACULTY MODAL (HOD DEPARTMENT) ── */}
      <AnimatePresence>
        {showAddModal && (
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
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/25">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Add Faculty Member</h3>
                    <p className="text-xs text-slate-500">Register new faculty for {hodDepartment || 'your department'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Department & Approval Notice */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs space-y-1">
                <p className="font-bold text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  Admin Approval Required
                </p>
                <p className="text-blue-800 text-[11px] leading-relaxed">
                  Faculty added will be assigned to <strong>{hodDepartment || 'your department'}</strong> and sent to <strong>Admin</strong> for approval in the Faculty Approvals tab.
                </p>
              </div>

              {/* Error Callout */}
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAddFacultySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Department
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-slate-100 border rounded-2xl text-xs font-bold text-slate-700 flex items-center gap-2" style={{ borderColor: '#e2e8f0' }}>
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span>{hodDepartment || 'Your Department'} (Auto-Assigned)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. John Doe"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 transition-all"
                      style={{ borderColor: '#e2e8f0' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Employee ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EMP1024"
                      value={form.employeeId}
                      onChange={e => setForm({ ...form, employeeId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 transition-all"
                      style={{ borderColor: '#e2e8f0' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. faculty@college.edu"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 transition-all"
                      style={{ borderColor: '#e2e8f0' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Designation <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={form.designation}
                      onChange={e => setForm({ ...form, designation: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 transition-all cursor-pointer"
                      style={{ borderColor: '#e2e8f0' }}
                    >
                      <option value="Assistant Professor">Assistant Professor</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Professor">Professor</option>
                      <option value="Senior Lecturer">Senior Lecturer</option>
                      <option value="Research Scholar">Research Scholar</option>
                      <option value="Visiting Faculty">Visiting Faculty</option>
                    </select>
                  </div>
                </div>

                {/* Optional Academic Research IDs */}
                <div className="pt-2 space-y-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Academic Research IDs (Optional)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Google Scholar ID</label>
                      <input
                        type="text"
                        placeholder="e.g. GS-12345"
                        value={form.googleScholar}
                        onChange={e => setForm({ ...form, googleScholar: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                        style={{ borderColor: '#e2e8f0' }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Vidwan ID</label>
                      <input
                        type="text"
                        placeholder="e.g. 182930"
                        value={form.vidwanId}
                        onChange={e => setForm({ ...form, vidwanId: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                        style={{ borderColor: '#e2e8f0' }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Scopus Author ID</label>
                      <input
                        type="text"
                        placeholder="e.g. 57201923"
                        value={form.scopusId}
                        onChange={e => setForm({ ...form, scopusId: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                        style={{ borderColor: '#e2e8f0' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>{creating ? 'Adding Faculty…' : 'Create & Submit for Admin Approval'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
