import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, ExternalLink, Save, CheckCircle2,
  Loader2, ShieldCheck, Key, Lock, Eye, EyeOff, Camera, Trash2, Upload
} from 'lucide-react';
import { authApi } from '../api/services';
import { resolveProfileImageUrl } from '../components/Header';
import ImageCropperModal from '../components/ImageCropperModal';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

export default function Profile() {
  const [saved, setSaved]             = useState(false);
  const [editing, setEditing]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [toastMsg, setToastMsg]       = useState('Profile updated successfully!');
  const [errorMsg, setErrorMsg]       = useState('');

  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    name: localStorage.getItem('userName') || 'User',
    email: '',
    employeeId: '',
    department: localStorage.getItem('department') || '',
    designation: '',
    googleScholar: '',
    vidwanId: '',
    scopusId: '',
    role: localStorage.getItem('role') || 'FACULTY',
    twoFactorEnabled: false,
    profileImage: localStorage.getItem('profileImage') || '',
  });

  // Password Change Form State
  const [showPasswordModal, setShowPassModal] = useState(false);
  const [currentPassword, setCurrentPass]     = useState('');
  const [newPassword, setNewPass]             = useState('');
  const [confirmPassword, setConfirmPass]     = useState('');
  const [showPassText, setShowPassText]       = useState(false);
  const [changingPass, setChangingPass]       = useState(false);
  const [passError, setPassError]             = useState('');

  useEffect(() => {
    authApi.getMe()
      .then(res => {
        if (res.data) {
          setProfile(prev => ({
            ...prev,
            ...res.data,
            twoFactorEnabled: res.data.twoFactorEnabled || false,
            profileImage: res.data.profileImage || '',
          }));
          if (res.data.profileImage) {
            localStorage.setItem('profileImage', res.data.profileImage);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load user profile:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const update = (field, val) => setProfile(p => ({ ...p, [field]: val }));

  const showToast = (msg) => {
    setToastMsg(msg);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Image Selection -> Opens Cropper Modal
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = async ({ file, previewUrl }) => {
    setUploadingImg(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      const res = await authApi.updateProfileImage(formData);
      const newPath = res.data?.profileImage || '';
      update('profileImage', newPath);
      localStorage.setItem('profileImage', newPath);
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { profileImage: newPath } }));
      showToast('Profile photo updated successfully!');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to upload profile image.');
    } finally {
      setUploadingImg(false);
    }
  };

  // Remove Photo Handler
  const handleRemovePhoto = async (e) => {
    e.stopPropagation();
    setUploadingImg(true);
    try {
      await authApi.removeProfileImage();
      update('profileImage', '');
      localStorage.removeItem('profileImage');
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { profileImage: '' } }));
      showToast('Profile photo removed.');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to remove profile photo.');
    } finally {
      setUploadingImg(false);
    }
  };

  // Save Profile Details
  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await authApi.updateProfile({
        name: profile.name,
        designation: profile.designation,
        googleScholar: profile.googleScholar,
        vidwanId: profile.vidwanId,
        scopusId: profile.scopusId,
        twoFactorEnabled: profile.twoFactorEnabled,
      });

      if (res.data?.user?.name) {
        localStorage.setItem('userName', res.data.user.name);
      }
      showToast('Profile details saved successfully!');
      setEditing(false);
    } catch (e) {
      console.error(e);
      setErrorMsg(e.response?.data?.message || 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle 2FA
  const handleToggle2FA = async () => {
    const nextState = !profile.twoFactorEnabled;
    update('twoFactorEnabled', nextState);
    try {
      await authApi.updateProfile({
        name: profile.name,
        twoFactorEnabled: nextState,
      });
      showToast(nextState ? '2-Step Verification enabled!' : '2-Step Verification disabled.');
    } catch (e) {
      console.error(e);
      update('twoFactorEnabled', !nextState);
      setErrorMsg('Failed to update 2-Step Verification setting.');
    }
  };

  // Submit Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match.');
      return;
    }

    setChangingPass(true);
    setPassError('');

    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
      });
      showToast('Account password changed successfully!');
      setShowPassModal(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err) {
      setPassError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setChangingPass(false);
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } } };

  const initials = profile.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const imageUrl = resolveProfileImageUrl(profile.profileImage);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-3xl mx-auto space-y-6">
      
      {/* Top Header */}
      <motion.div variants={itemVariants} className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile & Security</h1>
          <p className="text-slate-500 text-sm mt-1">Manage personal details, profile picture, and account security.</p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowPassModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
            style={{ borderColor: '#e2e8f0' }}
          >
            <Key className="w-3.5 h-3.5 text-blue-600" />
            Change Password
          </button>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all"
              style={{ background: '#2563eb' }}
            >
              Edit Profile Details
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-3.5 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-60"
                style={{ background: '#059669' }}
              >
                <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
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
            className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center justify-between"
          >
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-rose-500">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar & Profile Photo Card */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 border flex items-center justify-between gap-5 shadow-sm flex-wrap"
        style={{ borderColor: '#e8edf5' }}>
        
        <div className="flex items-center gap-5">
          {/* Avatar with Camera Trigger */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center font-bold text-2xl text-blue-700 shadow-sm border"
              style={{ background: '#dbeafe', borderColor: '#bfdbfe' }}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            {/* Hover overlay button to trigger upload */}
            <button
              type="button"
              disabled={uploadingImg}
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 text-white rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]"
            >
              {uploadingImg ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Camera className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] font-bold">Change</span>
                </>
              )}
            </button>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">{profile.name}</h2>
            <p className="text-slate-500 text-xs mt-0.5">{profile.designation || profile.role} · {profile.department || 'Administration'}</p>
            {profile.email && <p className="text-slate-400 text-xs mt-1 font-mono">{profile.email}</p>}
          </div>
        </div>

        {/* Photo Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFileChange}
            accept="image/png, image/jpeg, image/jpg"
            className="hidden"
          />

          <button
            type="button"
            disabled={uploadingImg}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm bg-white"
            style={{ borderColor: '#e2e8f0' }}
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>{imageUrl ? 'Change Photo' : 'Upload Photo'}</span>
          </button>

          {imageUrl && (
            <button
              type="button"
              disabled={uploadingImg}
              onClick={handleRemovePhoto}
              title="Remove profile photo"
              className="p-2 border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors shadow-sm bg-white"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Security & 2-Step Verification */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 border space-y-4 shadow-sm"
        style={{ borderColor: '#e8edf5' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${profile.twoFactorEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">2-Step Verification (2FA OTP)</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-md">
                When enabled, logging in with a password will require entering a 6-digit verification code dispatched to your email.
                When disabled (default), entering your password signs you in immediately.
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            onClick={handleToggle2FA}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              profile.twoFactorEnabled ? 'bg-blue-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                profile.twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </motion.div>

      {/* Personal Info */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 border space-y-4 shadow-sm"
        style={{ borderColor: '#e8edf5' }}>
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" /> Account Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
            <input
              type="text"
              value={profile.name || ''}
              onChange={e => update('name', e.target.value)}
              disabled={!editing}
              className={`w-full px-3.5 py-2 border rounded-xl text-xs outline-none transition-all ${
                editing ? 'bg-white border-blue-400 focus:ring-2 focus:ring-blue-500 font-semibold' : 'bg-slate-50 border-transparent text-slate-700'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Designation</label>
            <input
              type="text"
              value={profile.designation || ''}
              onChange={e => update('designation', e.target.value)}
              disabled={!editing}
              placeholder="e.g. Associate Professor"
              className={`w-full px-3.5 py-2 border rounded-xl text-xs outline-none transition-all ${
                editing ? 'bg-white border-blue-400 focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 border-transparent text-slate-700'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Email Address</label>
            <input
              type="text"
              value={profile.email || ''}
              disabled
              className="w-full px-3.5 py-2 border border-transparent bg-slate-50 text-slate-500 rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Employee / Admin ID</label>
            <input
              type="text"
              value={profile.employeeId || profile.regId || '—'}
              disabled
              className="w-full px-3.5 py-2 border border-transparent bg-slate-50 text-slate-500 rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Department</label>
            <input
              type="text"
              value={profile.department || 'Administration'}
              disabled
              className="w-full px-3.5 py-2 border border-transparent bg-slate-50 text-slate-500 rounded-xl text-xs"
            />
          </div>
        </div>
      </motion.div>

      {/* Academic IDs */}
      {profile.role !== 'ADMIN' && (
        <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 border space-y-4 shadow-sm"
          style={{ borderColor: '#e8edf5' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-600" /> Academic & Research Identifiers
            </h3>
            {editing && <span className="text-[11px] text-blue-600 font-semibold">Editable</span>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Google Scholar ID</label>
              <input
                type="text"
                value={profile.googleScholar || ''}
                onChange={e => update('googleScholar', e.target.value)}
                disabled={!editing}
                placeholder="e.g. user=abc1234"
                className={`w-full px-3.5 py-2 border rounded-xl text-xs outline-none transition-all ${
                  editing ? 'bg-white border-blue-400 focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 border-transparent text-slate-700'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Vidwan ID</label>
              <input
                type="text"
                value={profile.vidwanId || ''}
                onChange={e => update('vidwanId', e.target.value)}
                disabled={!editing}
                placeholder="e.g. 192837"
                className={`w-full px-3.5 py-2 border rounded-xl text-xs outline-none transition-all ${
                  editing ? 'bg-white border-blue-400 focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 border-transparent text-slate-700'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Scopus Author ID</label>
              <input
                type="text"
                value={profile.scopusId || ''}
                onChange={e => update('scopusId', e.target.value)}
                disabled={!editing}
                placeholder="e.g. 57201928"
                className={`w-full px-3.5 py-2 border rounded-xl text-xs outline-none transition-all ${
                  editing ? 'bg-white border-blue-400 focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 border-transparent text-slate-700'
                }`}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      <AnimatePresence>
        {showPasswordModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowPassModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl"
              style={{ border: '1px solid #e2e8f0' }}
            >
              <div className="flex justify-between items-center mb-4 pb-2 border-b" style={{ borderColor: '#f1f5f9' }}>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" /> Change Password
                </h3>
                <button onClick={() => setShowPassModal(false)} className="text-slate-400 hover:text-slate-700">×</button>
              </div>

              {passError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold">
                  {passError}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                  <input
                    type={showPassText ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPass(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3.5 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (Min 6 characters) *</label>
                  <div className="relative">
                    <input
                      type={showPassText ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={e => setNewPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3.5 pr-10 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ borderColor: '#e2e8f0' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassText(!showPassText)}
                      className="absolute right-3 top-2 text-slate-400"
                    >
                      {showPassText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
                  <input
                    type={showPassText ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: '#f1f5f9' }}>
                  <button
                    type="button"
                    onClick={() => setShowPassModal(false)}
                    className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={changingPass || !newPassword || !confirmPassword}
                    className="px-5 py-2 text-white text-xs font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
                    style={{ background: '#2563eb' }}
                  >
                    {changingPass ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 z-50 text-xs font-semibold"
            style={{ background: '#059669' }}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={showCropper}
        imageSrc={rawImageSrc}
        onClose={() => setShowCropper(false)}
        onCropComplete={handleCropComplete}
      />
    </motion.div>
  );
}
