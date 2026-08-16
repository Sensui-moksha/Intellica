import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit3, Trash2, X, Users, Monitor, Cpu, Cog,
  Leaf, FlaskConical, Building2, Loader2, CheckCircle2, AlertTriangle,
  CheckSquare, Square, Search, Layers, RefreshCw
} from 'lucide-react';
import { adminApi } from '../../api/services';

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
  const [departments, setDepartments]     = useState([]);
  const [hods, setHods]                   = useState([]);
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
    ]).then(([deptRes, hodRes]) => {
      const deptsData = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.departments || [];
      const hodsData  = hodRes.data || [];
      setHods(hodsData);

      const formatted = deptsData.map((d, i) => ({
        _id: d._id || `dept-${d.name || i}`,
        name: d.name || d.department || '',
        code: d.code || d.name || '',
        hod: d.hod || d.hodName || 'Unassigned',
        facultyCount: d.facultyCount || 0,
        credits: d.credits || d.totalCredits || 0,
        description: d.description || '',
        colorIdx: i,
      }));
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

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
          <p className="text-slate-500 text-sm mt-1">Manage academic departments, view credit statistics, and HOD assignments.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2.5 bg-white border rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm transition-colors"
            style={{ borderColor: '#e2e8f0' }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <motion.button
            whileHover={{ y: -1, boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}
            whileTap={{ scale: 0.97 }}
            onClick={openCreate}
            className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl transition-all shadow-sm"
            style={{ background: '#2563eb' }}
          >
            <Plus className="w-4 h-4" /> Create Department
          </motion.button>
        </div>
      </motion.div>

      {/* Search & Bulk Action Bar */}
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-3 flex-wrap bg-white p-3.5 rounded-2xl border shadow-sm"
        style={{ borderColor: '#e8edf5' }}>
        
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search departments or HODs…"
            className="w-full pl-10 pr-4 py-1.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50/50"
            style={{ borderColor: '#e2e8f0' }}
          />
        </div>

        {/* Selection & Multiple Delete Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors"
          >
            {selectedIds.length > 0 && selectedIds.length === filteredDepartments.length ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>{selectedIds.length > 0 ? `Deselect (${selectedIds.length})` : 'Select All'}</span>
          </button>

          {selectedIds.length > 0 && (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={() => setShowBulk(true)}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition-all"
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
                whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                onClick={() => toggleSelectOne(dept._id)}
                className={`bg-white rounded-2xl p-5 border flex flex-col justify-between transition-all cursor-pointer relative ${
                  isSelected ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50/20' : ''
                }`}
                style={{ borderColor: isSelected ? '#3b82f6' : '#e8edf5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                {/* Top row */}
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSelectOne(dept._id); }}
                        className="text-slate-400 hover:text-blue-600 transition-colors"
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
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#dbeafe', color: '#1e40af' }}>
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
                  <h3 className="text-base font-bold text-slate-900 mt-3 leading-tight">
                    {dept.name}
                  </h3>
                </div>

                {/* Info rows */}
                <div className="mt-4 space-y-2 pt-3 border-t" style={{ borderColor: '#f8fafc' }}>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Users className="w-3.5 h-3.5" />
                      <span className={dept.hod === 'Unassigned' ? 'text-rose-500 font-medium' : 'text-slate-800 font-semibold'}>
                        {dept.hod}
                      </span>
                    </div>
                    {dept.hod !== 'Unassigned' && (
                      <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full"
                        style={{ background: '#dbeafe', color: '#1d4ed8' }}>HOD</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{dept.facultyCount} Active Faculty</span>
                    <button
                      onClick={(e) => openEdit(dept, e)}
                      className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
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
        <div className="bg-white rounded-2xl border p-12 text-center text-slate-400" style={{ borderColor: '#e8edf5' }}>
          <Layers className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No departments found</p>
          <p className="text-xs text-slate-400 mt-1">Create a new department to get started.</p>
        </div>
      )}

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
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. COMPUTER SCIENCE"
                    className="w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department Code / Short Key</label>
                  <input
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g. CSE"
                    className="w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assign Head of Department (HOD)</label>
                  <select
                    value={form.hod}
                    onChange={e => setForm({ ...form, hod: e.target.value })}
                    className="w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all"
                    style={{ borderColor: '#e2e8f0' }}
                  >
                    <option value="">Unassigned</option>
                    {hods.map(h => (
                      <option key={h._id} value={h.name}>
                        {h.name} ({h.department || 'HOD'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description or focus area..."
                    className="w-full border rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>

                <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t" style={{ borderColor: '#f1f5f9' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={acting || !form.name.trim()}
                    className="px-5 py-2 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
                    style={{ background: '#2563eb' }}
                  >
                    {acting ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Department'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SINGLE DELETE CONFIRMATION MODAL */}
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
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center">Delete Department?</h3>
              <p className="text-xs text-slate-500 text-center mt-1.5 leading-relaxed">
                Are you sure you want to remove <span className="font-bold text-slate-800">{deleteTarget.name}</span>? This action cannot be undone.
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

      {/* MULTIPLE / BULK DELETE CONFIRMATION MODAL */}
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
