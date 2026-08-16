import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Lock, Eye, EyeOff, BookOpen, Award, CheckCircle2,
  ArrowRight, ArrowLeft, Sparkles, User, Briefcase, GraduationCap,
  Camera, Crop, Upload, Check, Loader2, RefreshCw
} from 'lucide-react';
import { authApi } from '../api/services';
import ImageCropperModal from '../components/ImageCropperModal';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Photo & Role, 2: Security, 3: Research IDs

  // Profile data
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Profile Photo & Cropper State
  const fileInputRef = useRef(null);
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [croppedFile, setCroppedFile] = useState(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState('');

  // Form Fields
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPass]     = useState('');
  const [showPass, setShowPass]               = useState(false);
  const [designation, setDesignation]         = useState('Assistant Professor');
  const [googleScholar, setGoogleScholar]     = useState('');
  const [vidwanId, setVidwanId]               = useState('');
  const [scopusId, setScopusId]               = useState('');

  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState('');
  const [success, setSuccess]                 = useState(false);

  useEffect(() => {
    authApi.getMe().then(res => {
      const u = res.data;
      setCurrentUser(u);
      if (u.designation) setDesignation(u.designation);
      if (u.googleScholar) setGoogleScholar(u.googleScholar);
      if (u.vidwanId) setVidwanId(u.vidwanId);
      if (u.scopusId) setScopusId(u.scopusId);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setLoadingUser(false);
    });
  }, []);

  // Handle local file selection for cropper
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Selected image size must be less than 10MB.');
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

  const handleCropComplete = ({ file, previewUrl }) => {
    setCroppedFile(file);
    setCroppedPreviewUrl(previewUrl);
    setError('');
  };

  const handleNextFromStep1 = (e) => {
    e.preventDefault();
    setError('');
    setStep(2);
  };

  const handleNextFromStep2 = (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // 1. Upload Cropped Profile Image if provided
      if (croppedFile) {
        const formData = new FormData();
        formData.append('profileImage', croppedFile);
        const imgRes = await authApi.updateProfileImage(formData);
        if (imgRes.data?.profileImage) {
          localStorage.setItem('profileImage', imgRes.data.profileImage);
          window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { profileImage: imgRes.data.profileImage } }));
        }
      }

      // 2. Complete Onboarding Profile Details
      await authApi.completeOnboarding({
        newPassword,
        designation,
        googleScholar,
        vidwanId,
        scopusId,
      });

      setSuccess(true);
      setTimeout(() => {
        const role = localStorage.getItem('role') || currentUser?.role;
        if (role === 'ADMIN') navigate('/admin/dashboard');
        else if (role === 'HOD') navigate('/hod/dashboard');
        else navigate('/faculty/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete onboarding. Please try again.');
      setSaving(false);
    }
  };

  const userInitial = (currentUser?.name || 'M').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: '#f0f4ff' }}>
      
      {/* Ambience */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full blur-[100px]"
        style={{ background: 'rgba(37,99,235,0.10)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full blur-[100px]"
        style={{ background: 'rgba(99,102,241,0.09)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl border relative z-10"
        style={{ borderColor: '#e8edf5' }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>First-Time Account Activation</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome to Intellica{currentUser?.name ? `, ${currentUser.name}` : ''}!
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Set up your profile picture, secure password, and academic identifiers to activate your portal.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            step === 1 ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
          }`}>
            <span>1</span>
            <span>Profile Photo</span>
          </div>
          <div className="w-6 h-[2px] bg-slate-200" />
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            step === 2 ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
          }`}>
            <span>2</span>
            <span>Security</span>
          </div>
          <div className="w-6 h-[2px] bg-slate-200" />
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            step === 3 ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
          }`}>
            <span>3</span>
            <span>Research IDs</span>
          </div>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-medium"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-black text-emerald-900">Account Activated Successfully!</p>
                <p className="text-[11px] text-emerald-700 font-medium">Redirecting to your dashboard…</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden File Input for Cropper */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* ── STEP 1: PROFILE PICTURE & DESIGNATION ── */}
        {step === 1 && (
          <motion.form
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleNextFromStep1}
            className="space-y-5"
          >
            {/* Circular Profile Avatar Upload & Preview */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-3.5">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-blue-500/20 shadow-xl bg-white border border-slate-200 flex items-center justify-center">
                  {croppedPreviewUrl ? (
                    <img
                      src={croppedPreviewUrl}
                      alt="Profile Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 text-white font-black text-4xl flex items-center justify-center">
                      {userInitial}
                    </div>
                  )}
                </div>

                {/* Camera Click Trigger */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg border-2 border-white transition-transform active:scale-90 cursor-pointer"
                  title="Upload & Crop Photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  {croppedPreviewUrl ? 'Photo Selected & Cropped' : 'Upload Your Profile Photo'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Choose a photo to adjust and crop in our circular alignment tool.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-blue-600 border border-blue-200/80 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <Crop className="w-3.5 h-3.5" />
                  <span>{croppedPreviewUrl ? 'Re-crop / Change Photo' : 'Select Photo & Crop'}</span>
                </button>
              </div>
            </div>

            {/* Designation Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Academic Designation / Title
              </label>
              <select
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-2xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800"
                style={{ borderColor: '#e2e8f0' }}
              >
                <option value="Professor & HOD">Professor & HOD</option>
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Institutional Administrator">Institutional Administrator</option>
                <option value="Dean / Director">Dean / Director</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue to Security</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.form>
        )}

        {/* ── STEP 2: SECURITY / NEW PASSWORD ── */}
        {step === 2 && (
          <motion.form
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleNextFromStep2}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-2xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 pr-10"
                  style={{ borderColor: '#e2e8f0' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-2xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: '#e2e8f0' }}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Research IDs</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.form>
        )}

        {/* ── STEP 3: ACADEMIC & RESEARCH IDS ── */}
        {step === 3 && (
          <motion.form
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleComplete}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Google Scholar User ID (Optional)
              </label>
              <input
                type="text"
                value={googleScholar}
                onChange={e => setGoogleScholar(e.target.value)}
                placeholder="e.g. user=abc1234"
                className="w-full px-3.5 py-2 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: '#e2e8f0' }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vidwan ID (Optional)
              </label>
              <input
                type="text"
                value={vidwanId}
                onChange={e => setVidwanId(e.target.value)}
                placeholder="e.g. 192837"
                className="w-full px-3.5 py-2 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: '#e2e8f0' }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Scopus Author ID (Optional)
              </label>
              <input
                type="text"
                value={scopusId}
                onChange={e => setScopusId(e.target.value)}
                placeholder="e.g. 57201928"
                className="w-full px-3.5 py-2 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: '#e2e8f0' }}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activating Account…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Activation</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}

        {/* ── POPUP CROPPER MODAL ── */}
        <ImageCropperModal
          isOpen={showCropper}
          imageSrc={rawImageSrc}
          onClose={() => setShowCropper(false)}
          onCropComplete={handleCropComplete}
        />
      </motion.div>
    </div>
  );
}
