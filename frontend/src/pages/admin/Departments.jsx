import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit3, Trash2, X, Users, Monitor, Cpu, Cog,
  Leaf, FlaskConical, Building2, Loader2, CheckCircle2, AlertTriangle,
  CheckSquare, Square, Search, Layers, RefreshCw, Mail, Award,
  ArrowRight, ExternalLink, ShieldCheck, Crown, UserPlus, UserCheck,
  GraduationCap
} from 'lucide-react';
import { adminApi } from '../../api/services';
import { resolveProfileImageUrl } from '../../components/Header';

const DEPT_ICONS = [Monitor, Cpu, Cog, Leaf, FlaskConical, Building2];
const DEPT_COLORS = [
  { bg: '#dbeafe', icon: '#2563eb' },
  { bg: '#fde68a', icon: '#d97706' },
  { bg: '#d1fae5', icon: '#059669' },
  { bg: '#fce7f3', icon: '#db2777' },
  { bg: '#ede9fe', icon: '#7c3aed' },
  { bg: '#fee2e2', icon: '#dc2626' },
];

export default function AdminDepartments() {
  const navigate = useNavigate();
  const [departments, setDepartments]     = useState([]);
  const [hods, setHods]                   = useState([]);
  const [allFaculty, setAllFaculty]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [acting, setActing]               = useState(false);
  const [search, setSearch]               = useState('');
  
  // Selection for Multiple Delete
  const [selectedIds, setSelectedIds]     = useState([]);

  // Modal States
  const [showModal, setShowModal]         = useState(false);
  const [editTarget, setEditTarget]       = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null); // single delete confirmation
  const [showBulkConfirm, setShowBulk]    = useState(false); // multiple delete confirmation
  const [toastMsg, setToastMsg]           = useState('');
  const [errorMsg, setErrorMsg]           = useState('');

  // Department Faculty Roster Modal State
  const [viewFacultyDept, setViewFacultyDept] = useState(null); // dept object or null
  const [deptFacultySearch, setDeptFacultySearch] = useState('');
  const [facultyRoleFilter, setFacultyRoleFilter] = useState('ALL'); // 'ALL' | 'HOD' | 'FACULTY'

  const [form, setForm]                   = useState({ name: '', code: '', hod: '', description: '' });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const loadData = () => {
    setLoading(true);
    setErrorMsg('');
    Promise.all([
      adminApi.getDepartments(),
      adminApi.getAllHods(),
      adminApi.getAllFaculty().catch(() => ({ data: [] })),
    ]).then(([deptRes, hodRes, facRes]) => {
      const deptsData = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.departments || [];
      const hodsData  = hodRes.data || [];
      const facData   = Array.isArray(facRes.data) ? facRes.data : facRes.data?.faculty || [];
      
      setHods(hodsData);
      setAllFaculty(facData);

      const formatted = deptsData.map((d, i) => {
        const deptName = (d.name || d.department || '').trim();
        // Calculate dynamic actual faculty count if available
        const actualCount = facData.filter(f => (f.department || '').trim().toUpperCase() === deptName.toUpperCase()).length;
        return {
          _id: d._id || `dept-${d.name || i}`,
          name: deptName,
          code: d.code || deptName,
          hod: d.hod || d.hodName || 'Unassigned',
          facultyCount: actualCount > 0 ? actualCount : (d.facultyCount || 0),
          credits: d.credits || d.totalCredits || 0,
          description: d.description || '',
          colorIdx: i,
        };
      });
      setDepartments(formatted);
      setSelectedIds([]);
    }).catch(err => {
      console.error(err);
      setErrorMsg('Failed to load departments.');
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
    if (selectedIds.length === filteredDepartments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDepartments.map(d => d._id));
    }
  };

  // Open Department Faculty Roster
  const openDepartmentFaculty = (dept, e) => {
    e?.stopPropagation();
    setViewFacultyDept(dept);
    setDeptFacultySearch('');
    setFacultyRoleFilter('ALL');
  };

  // Create / Update Submit
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setActing(true);
    try {
      if (editTarget) {
        // UPDATE
        await adminApi.updateDepartment(editTarget._id, {
          name: form.name.trim().toUpperCase(),
          code: form.code.trim().toUpperCase() || form.name.trim().toUpperCase(),
          hod: form.hod || 'Unassigned',
          description: form.description || '',
        });
        showToast(`Department ${form.name.toUpperCase()} updated successfully!`);
      } else {
        // CREATE
        await adminApi.createDepartment({
          name: form.name.trim().toUpperCase(),
          code: form.code.trim().toUpperCase() || form.name.trim().toUpperCase(),
          hod: form.hod || 'Unassigned',
          description: form.description || '',
        });
        showToast(`Department ${form.name.toUpperCase()} created successfully!`);
      }
      setShowModal(false);
      setEditTarget(null);
      setForm({ name: '', code: '', hod: '', description: '' });
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Operation failed. Please try again.');
    } finally {
      setActing(false);
    }
  };

  // Single Delete
  const handleConfirmSingleDelete = async () => {
    if (!deleteTarget) return;
    setActing(true);
    try {
      await adminApi.deleteDepartment(deleteTarget._id);
      showToast(`Department ${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Delete failed.');
    } finally {
      setActing(false);
    }
  };

  // Bulk Multiple Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setActing(true);
    try {
      await adminApi.bulkDeleteDepartments(selectedIds);
      showToast(`${selectedIds.length} department(s) deleted successfully.`);
      setShowBulk(false);
      setSelectedIds([]);
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Bulk delete failed.');
    } finally {
      setActing(false);
    }
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: '', code: '', hod: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (dept, e) => {
    e?.stopPropagation();
    setEditTarget(dept);
    setForm({
      name: dept.name,
      code: dept.code || dept.name,
      hod: dept.hod === 'Unassigned' ? '' : dept.hod,
      description: dept.description || '',
    });
    setShowModal(true);
  };

  const filteredDepartments = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.code && d.code.toLowerCase().includes(search.toLowerCase())) ||
    (d.hod && d.hod.toLowerCase().includes(search.toLowerCase()))
  );

  // Faculty in selected department
  const currentDeptFaculty = viewFacultyDept
    ? allFaculty.filter(f => (f.department || '').trim().toUpperCase() === viewFacultyDept.name.trim().toUpperCase())
    : [];

  const filteredDeptFaculty = currentDeptFaculty.filter(f => {
    const matchesSearch = 
      (f.name || '').toLowerCase().includes(deptFacultySearch.toLowerCase()) ||
      (f.email || '').toLowerCase().includes(deptFacultySearch.toLowerCase()) ||
      (f.employeeId || f.regId || '').toLowerCase().includes(deptFacultySearch.toLowerCase()) ||
      (f.designation || '').toLowerCase().includes(deptFacultySearch.toLowerCase());

    const isHod = f.role === 'HOD' || (f.designation || '').toLowerCase().includes('hod');
    if (facultyRoleFilter === 'HOD') return matchesSearch && isHod;
    if (facultyRoleFilter === 'FACULTY') return matchesSearch && !isHod;
    return matchesSearch;
  });

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
          <p className="text-slate-500 text-sm mt-1">Manage academic departments, view credit statistics, and explore faculty rosters.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Refresh list"
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Department
          </button>
        </div>
      </motion.div>

      {/* Search & Bulk Actions Bar */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments, codes, or HOD names…"
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Select All Toggle */}
          <button
            type="button"
            onClick={selectAll}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 px-3 py-2 rounded-xl hover:bg-slate-50 border border-slate-200 transition-colors"
          >
            {selectedIds.length > 0 && selectedIds.length === filteredDepartments.length ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>Select All</span>
          </button>

          {/* Bulk Delete Button */}
          {selectedIds.length > 0 && (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              type="button"
              onClick={() => setShowBulk(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedIds.length})
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Error alert */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center justify-between"
          >
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-800 p-1"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Department Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map((dept, i) => {
            const ci = dept.colorIdx ?? i;
            const color = DEPT_COLORS[ci % DEPT_COLORS.length];
            const Icon = DEPT_ICONS[ci % DEPT_ICONS.length];
            const isSelected = selectedIds.includes(dept._id);

            return (
              <motion.div
                key={dept._id}
                variants={itemVariants}
                whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)' }}
                onClick={() => openDepartmentFaculty(dept)}
                className={`bg-white rounded-2xl p-5 border flex flex-col justify-between transition-all cursor-pointer relative group ${
                  isSelected ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50/20' : 'border-slate-200/80 hover:border-blue-300'
                }`}
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                {/* Top row */}
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSelectOne(dept._id); }}
                        className="text-slate-400 hover:text-blue-600 transition-colors p-0.5"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </button>

                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: color.bg }}>
                        <Icon className="w-5 h-5" style={{ color: color.icon }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: '#dbeafe', color: '#1e40af' }}>
                        {dept.credits.toLocaleString()} CR
                      </span>
                      
                      {/* Edit single */}
                      <button
                        onClick={(e) => openEdit(dept, e)}
                        title="Edit Department"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete single */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(dept); }}
                        title="Delete Department"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Dept Name */}
                  <h3 className="text-base font-bold text-slate-900 mt-3 leading-tight group-hover:text-blue-600 transition-colors">
                    {dept.name}
                  </h3>
                  {dept.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{dept.description}</p>
                  )}
                </div>

                {/* Info rows */}
                <div className="mt-4 space-y-2.5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className={dept.hod === 'Unassigned' ? 'text-rose-500 font-medium' : 'text-slate-800 font-semibold'}>
                        {dept.hod}
                      </span>
                    </div>
                    {dept.hod !== 'Unassigned' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-700 border border-blue-200/50">
                        HOD
                      </span>
                    )}
                  </div>

                  {/* Clickable Active Faculty button */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <button
                      type="button"
                      onClick={(e) => openDepartmentFaculty(dept, e)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-700 font-bold transition-all border border-blue-200/60 cursor-pointer shadow-2xs group/btn"
                      title={`View all faculty in ${dept.name}`}
                    >
                      <Users className="w-3.5 h-3.5 text-blue-600 group-hover/btn:scale-110 transition-transform" />
                      <span>{dept.facultyCount} Active Faculty</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={(e) => openEdit(dept, e)}
                      className="text-xs font-semibold text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                    >
                      Edit Details →
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {!loading && filteredDepartments.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Layers className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No departments found</p>
          <p className="text-xs text-slate-400 mt-1">Create a new department to get started.</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DEPARTMENT FACULTY ROSTER MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {viewFacultyDept && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs"
              onClick={() => setViewFacultyDept(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-55 w-full max-w-3xl max-h-[88vh] bg-white rounded-3xl p-6 shadow-2xl border border-slate-200/90 flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg border border-blue-100 shrink-0">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">
                        {viewFacultyDept.name} Department Faculty
                      </h2>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        {currentDeptFaculty.length} Members
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      HOD: <span className="font-semibold text-slate-700">{viewFacultyDept.hod}</span> · Total Department Credits: <span className="font-semibold text-blue-600">{viewFacultyDept.credits.toLocaleString()} CR</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewFacultyDept(null)}
                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filters & Search Inside Modal */}
              <div className="flex flex-wrap gap-2.5 items-center justify-between py-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={deptFacultySearch}
                    onChange={(e) => setDeptFacultySearch(e.target.value)}
                    placeholder="Search by faculty name, designation, or ID…"
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
                  {['ALL', 'HOD', 'FACULTY'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFacultyRoleFilter(r)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        facultyRoleFilter === r
                          ? 'bg-white text-blue-600 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {r === 'ALL' ? `All (${currentDeptFaculty.length})` : r === 'HOD' ? 'HOD' : 'Faculty'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Faculty List (Scrollable) */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 my-2 max-h-[50vh]">
                {filteredDeptFaculty.length > 0 ? (
                  filteredDeptFaculty.map((member) => {
                    const isHod = member.role === 'HOD' || (member.designation || '').toLowerCase().includes('hod');
                    const profileUrl = resolveProfileImageUrl(member.profileImage);

                    return (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-blue-50/40 border border-slate-200/70 hover:border-blue-200 rounded-2xl transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            {profileUrl ? (
                              <img
                                src={profileUrl}
                                alt={member.name}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-2xs ${
                                isHod ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                                {isHod ? <Crown className="w-5 h-5 text-amber-600" /> : (member.name?.charAt(0)?.toUpperCase() || 'F')}
                              </div>
                            )}
                          </div>

                          {/* Member Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {member.name}
                              </h4>
                              {isHod ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                  <Crown className="w-3 h-3 text-amber-600" />
                                  Department HOD
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                                  Faculty
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                              <span className="font-medium text-slate-700">{member.designation || 'Faculty Member'}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-slate-500">ID: {member.employeeId || member.regId || 'N/A'}</span>
                              {member.email && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <a href={`mailto:${member.email}`} className="text-slate-500 hover:text-blue-600 flex items-center gap-1 truncate max-w-[200px]">
                                    <Mail className="w-3 h-3" />
                                    {member.email}
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Credits Pill & View details */}
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Award className="w-3.5 h-3.5 text-emerald-600" />
                              {(member.totalCredits || 0).toLocaleString()} CR
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No faculty members found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {deptFacultySearch ? 'Try a different search query' : `No faculty members currently registered in ${viewFacultyDept.name}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const deptName = viewFacultyDept.name;
                    setViewFacultyDept(null);
                    navigate(`/admin/faculty?dept=${encodeURIComponent(deptName)}`);
                  }}
                  className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  <span>Open in Full Faculty Directory</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewFacultyDept(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const deptName = viewFacultyDept.name;
                      setViewFacultyDept(null);
                      navigate(`/admin/faculty?dept=${encodeURIComponent(deptName)}`);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Manage Faculty Directory</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT MODAL */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl"
              style={{ border: '1px solid #e2e8f0' }}
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-slate-900">
                  {editTarget ? `Edit Department: ${editTarget.name}` : 'Create Department'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. COMPUTER SCIENCE & ENGINEERING"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assign Head of Department (HOD)</label>
                  <select
                    value={form.hod}
                    onChange={(e) => setForm({ ...form, hod: e.target.value })}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="">Unassigned (No HOD Assigned)</option>
                    {hods.map((h) => (
                      <option key={h._id || h.name} value={h.name}>
                        {h.name} ({h.department || 'Academic'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of department academic focus..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={acting}
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                  >
                    {acting ? 'Saving…' : (editTarget ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SINGLE DELETE CONFIRM MODAL */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
              onClick={() => setDeleteTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
              style={{ border: '1px solid #e2e8f0' }}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center">
                Delete {deleteTarget.name}?
              </h3>
              <p className="text-xs text-slate-500 text-center mt-1.5 leading-relaxed">
                Are you sure you want to remove this department? Faculty members currently assigned to it may need reassignment.
              </p>
              <div className="flex gap-2.5 mt-6">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={handleConfirmSingleDelete}
                  className="flex-1 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {acting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* BULK DELETE CONFIRM MODAL */}
      <AnimatePresence>
        {showBulkConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowBulk(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
              style={{ border: '1px solid #e2e8f0' }}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center">
                Delete {selectedIds.length} Department(s)?
              </h3>
              <p className="text-xs text-slate-500 text-center mt-1.5 leading-relaxed">
                You are about to permanently delete <span className="font-bold text-slate-800">{selectedIds.length}</span> selected departments.
              </p>
              <div className="flex gap-2.5 mt-6">
                <button
                  type="button"
                  onClick={() => setShowBulk(false)}
                  className="flex-1 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={handleConfirmBulkDelete}
                  className="flex-1 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {acting ? 'Deleting…' : `Delete (${selectedIds.length})`}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 z-50 text-sm font-semibold"
            style={{ background: '#059669' }}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
