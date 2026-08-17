import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon, User, Lock, Bell, Shield,
  CheckCircle2, AlertCircle, Save, Key, Mail, Building2,
  Eye, EyeOff, Calendar, CalendarDays, Star, Clock, Plus, Trash2
} from 'lucide-react';
import { authApi, academicYearApi } from '../../api/services';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('PROFILE');
  const [toastMsg, setToastMsg]   = useState('');
  const [errorMsg, setErrorMsg]   = useState('');
  const [acting, setActing]       = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Academic Years state (for Admin)
  const [academicYears, setAcademicYears] = useState([]);
  const [newYearForm, setNewYearForm] = useState({ year: '', label: '', description: '', isCurrent: false });
  const [yearActing, setYearActing] = useState(false);
  const [deleteYearTarget, setDeleteYearTarget] = useState(null);

  const role = user?.role || localStorage.getItem('role') || 'ADMIN';
  const isAdmin = role === 'ADMIN';

  const loadAcademicYears = async () => {
    try {
      const res = await academicYearApi.getAll();
      setAcademicYears(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    authApi.getMe().then(res => {
      if (res?.data) {
        setUser(res.data);
        setName(res.data.name || '');
        setEmail(res.data.email || '');
      }
    }).catch(console.error);

    loadAcademicYears();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    setActing(true);
    setErrorMsg('');
    try {
      await authApi.changePassword({
        currentPassword: oldPassword,
        newPassword
      });
      showToast('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update password');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account & System Settings</h1>
        <p className="text-slate-500 text-xs mt-1">Manage security, credentials, and institutional academic cycles.</p>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 border shadow-xs space-y-6" style={{ borderColor: '#e8edf5' }}>
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 flex-wrap">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PROFILE' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('SECURITY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'SECURITY' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Security & Password
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('ACADEMIC_YEARS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ACADEMIC_YEARS' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Academic Years & Archival</span>
            </button>
          )}
        </div>

        {activeTab === 'PROFILE' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  disabled
                  value={name}
                  className="w-full px-3.5 py-2 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-700"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3.5 py-2 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-700"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  disabled
                  value={user?.department || 'CSE'}
                  className="w-full px-3.5 py-2 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-700"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role / Designation</label>
                <input
                  type="text"
                  disabled
                  value={user?.designation || user?.role || 'Professor & HOD'}
                  className="w-full px-3.5 py-2 bg-slate-50 border rounded-2xl text-xs font-bold text-slate-700"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'SECURITY' && (
          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showOldPass ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="Enter current password (if set)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-2xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 pr-10"
                  style={{ borderColor: '#e2e8f0' }}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-2xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 pr-10"
                  style={{ borderColor: '#e2e8f0' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-2xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 pr-10"
                  style={{ borderColor: '#e2e8f0' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={acting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-50"
            >
              {acting ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}

        {activeTab === 'ACADEMIC_YEARS' && isAdmin && (
          <div className="space-y-6">
            {/* Active / Current Year Banner */}
            <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50/30 border border-blue-200/80 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Star className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider block">College-Wide Active Academic Year</span>
                  <p className="text-sm font-black text-slate-900">
                    {academicYears.find(y => y.isCurrent)?.label || academicYears.find(y => y.isCurrent)?.year || 'AY 2025-26'}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl">
                ● Active for Submissions
              </span>
            </div>

            {/* List of configured years */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">All Configured Cycles ({academicYears.length})</h3>
              <div className="space-y-2.5">
                {academicYears.map((ay) => (
                  <div
                    key={ay._id || ay.year}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      ay.isCurrent
                        ? 'bg-blue-50/40 border-blue-300 shadow-xs'
                        : ay.isArchived
                          ? 'bg-slate-50 border-slate-200/70'
                          : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        ay.isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {ay.isCurrent ? '★' : 'AY'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-xs">{ay.label || `AY ${ay.year}`}</h4>
                          {ay.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-800 uppercase">
                              Active Current Year
                            </span>
                          )}
                          {ay.isArchived && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 uppercase flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> Archived (Read-Only)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {ay.isCurrent
                            ? 'Current Active College Cycle • Open for Submissions'
                            : ay.isArchived
                              ? 'Archived Historical Records • View-Only for All Users'
                              : (ay.description || 'Upcoming Academic Cycle • Ready for Activation')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!ay.isCurrent && (
                        <button
                          type="button"
                          disabled={yearActing}
                          onClick={async () => {
                            setYearActing(true);
                            try {
                              await academicYearApi.setCurrent(ay._id);
                              showToast(`Activated AY ${ay.year} college-wide! Previous years archived.`);
                              loadAcademicYears();
                            } catch (err) {
                              setErrorMsg('Failed to switch academic year');
                            } finally {
                              setYearActing(false);
                            }
                          }}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          Set Active
                        </button>
                      )}

                      {!ay.isCurrent && (
                        <button
                          type="button"
                          onClick={() => setDeleteYearTarget(ay)}
                          title="Delete Academic Year"
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create new academic year form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newYearForm.year.trim()) return;
                setYearActing(true);
                try {
                  await academicYearApi.create({
                    year: newYearForm.year.trim(),
                    label: newYearForm.label.trim() || `AY ${newYearForm.year.trim()}`,
                    description: newYearForm.description.trim(),
                    isCurrent: newYearForm.isCurrent,
                  });
                  showToast(`Created Academic Year ${newYearForm.year}!`);
                  setNewYearForm({ year: '', label: '', description: '', isCurrent: false });
                  loadAcademicYears();
                } catch (err) {
                  setErrorMsg(err.response?.data?.message || 'Failed to create academic year');
                } finally {
                  setYearActing(false);
                }
              }}
              className="p-5 bg-slate-50/70 border border-slate-200 rounded-3xl space-y-4"
            >
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Add New Academic Year</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Academic Year Code *</label>
                  <input
                    required
                    value={newYearForm.year}
                    onChange={e => setNewYearForm({ ...newYearForm, year: e.target.value })}
                    placeholder="e.g. 2026-27"
                    className="w-full px-3.5 py-2 border rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    style={{ borderColor: '#cbd5e1' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Display Label</label>
                  <input
                    value={newYearForm.label}
                    onChange={e => setNewYearForm({ ...newYearForm, label: e.target.value })}
                    placeholder="e.g. AY 2026-2027"
                    className="w-full px-3.5 py-2 border rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    style={{ borderColor: '#cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
                <input
                  value={newYearForm.description}
                  onChange={e => setNewYearForm({ ...newYearForm, description: e.target.value })}
                  placeholder="e.g. Upcoming 2026-2027 Academic Cycle"
                  className="w-full px-3.5 py-2 border rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  style={{ borderColor: '#cbd5e1' }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newYearForm.isCurrent}
                    onChange={e => setNewYearForm({ ...newYearForm, isCurrent: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">Set as Active College-Wide immediately</span>
                </label>

                <button
                  type="submit"
                  disabled={yearActing}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {yearActing ? 'Creating…' : '+ Add Year'}
                </button>
              </div>
            </form>
          </div>
        )}
        {/* ── 🗑️ DELETE ACADEMIC YEAR THEMED CONFIRMATION MODAL ── */}
        <AnimatePresence>
          {deleteYearTarget && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs"
                onClick={() => setDeleteYearTarget(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-60 w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-1">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 text-center">Delete Academic Year?</h3>
                <p className="text-xs text-slate-500 text-center leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-slate-800">{deleteYearTarget.label || `AY ${deleteYearTarget.year}`}</strong>? This action cannot be undone.
                </p>
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteYearTarget(null)}
                    className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={yearActing}
                    onClick={async () => {
                      setYearActing(true);
                      try {
                        await academicYearApi.delete(deleteYearTarget._id);
                        showToast(`Deleted academic year ${deleteYearTarget.year}`);
                        setDeleteYearTarget(null);
                        loadAcademicYears();
                      } catch (err) {
                        setErrorMsg(err.response?.data?.message || 'Failed to delete year');
                      } finally {
                        setYearActing(false);
                      }
                    }}
                    className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {yearActing ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
