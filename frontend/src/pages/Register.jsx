import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, User, Mail, Building2, Briefcase,
  CheckCircle, Upload, Camera, Crop, Sparkles, Check
} from 'lucide-react';
import { authApi } from '../api/services';
import ImageCropperModal from '../components/ImageCropperModal';

const STEPS = ['Account Info', 'Academic Details', 'Confirm'];

const DEPARTMENTS = [
  'COMPUTER SCIENCE',
  'ELECTRONICS',
  'MECHANICAL',
  'CIVIL',
  'CHEMICAL',
  'INFORMATION TECHNOLOGY',
  'ELECTRICAL ENGINEERING',
];

const FACULTY_DESIGNATIONS = [
  'Assistant Professor',
  'Associate Professor',
  'Professor',
  'Senior Professor',
  'Adjunct Faculty / Lecturer',
];

const HOD_DESIGNATIONS = [
  'Professor & Head of Department (HOD)',
  'Associate Professor & Head of Department (HOD)',
];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [role, setRole] = useState('FACULTY'); // 'FACULTY' | 'HOD'

  // Photo & Crop Tool State
  const fileInputRef = useRef(null);
  const [profileImage, setProfileImage] = useState(null);
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    department: '',
    designation: '',
    googleScholar: '',
    vidwanId: '',
    scopusId: '',
  });

  const update = (field, val) => setForm(f => ({ ...f, [field]: val }));

  // File picker selection -> opens circular crop modal
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
    setProfileImage(file);
    setCroppedPreviewUrl(previewUrl);
    setError('');
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.name || !form.email || !form.employeeId) return 'Please fill all required fields in this step.';
      if (!profileImage) return 'Please select and crop your profile photo.';
    }
    if (step === 1) {
      if (!form.department || !form.designation) return 'Department and Designation are required.';
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('email', form.email);
      formData.append('employeeId', form.employeeId);
      formData.append('department', form.department);
      formData.append('designation', form.designation);
      if (form.googleScholar) formData.append('googleScholar', form.googleScholar);
      if (form.vidwanId) formData.append('vidwanId', form.vidwanId);
      if (form.scopusId) formData.append('scopusId', form.scopusId);
      if (profileImage) formData.append('profileImage', profileImage);

      if (role === 'HOD') {
        const res = await authApi.registerHod(formData);
        setSuccessMsg(res.data?.message || 'HOD registered successfully. Waiting for Admin approval.');
      } else {
        const res = await authApi.registerFaculty(formData);
        setSuccessMsg(res.data?.message || 'Faculty registered successfully. Waiting for HOD approval.');
      }
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
    exit: { opacity: 0, x: -40, transition: { duration: 0.15 } },
  };

  const userInitial = (form.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12"
      style={{ background: '#f0f4ff' }}>
      
      {/* Background Ambience */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full blur-[100px]"
        style={{ background: 'rgba(37,99,235,0.08)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full blur-[100px]"
        style={{ background: 'rgba(99,102,241,0.08)' }} />

      <div className="w-full max-w-lg p-8 relative z-10 bg-white rounded-3xl shadow-xl border mx-4"
        style={{ borderColor: '#e8edf5' }}>
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-lg mb-2 shadow-md shadow-blue-500/20">I</div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create an Account</h1>
          <p className="text-slate-500 mt-0.5 text-xs font-medium">Join the Intellica Research & Institutional Portal</p>
        </div>

        {/* Role Toggle */}
        <div className="flex bg-slate-100/80 p-1 rounded-2xl mb-6 border border-slate-200/60">
          <button
            type="button"
            onClick={() => setRole('FACULTY')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              role === 'FACULTY' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Faculty Member
          </button>
          <button
            type="button"
            onClick={() => setRole('HOD')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              role === 'HOD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Head of Department (HOD)
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-0 mb-6">
          {STEPS.map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center flex-1">
                <motion.div
                  animate={{
                    backgroundColor: i <= step ? '#2563eb' : '#e2e8f0',
                    color: i <= step ? '#ffffff' : '#94a3b8',
                  }}
                  transition={{ duration: 0.3 }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs"
                >
                  {i < step ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                </motion.div>
                <span className={`text-[11px] mt-1 font-bold ${i <= step ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 max-w-[36px]">
                  <motion.div animate={{ backgroundColor: i < step ? '#2563eb' : '#e2e8f0' }} className="h-0.5 w-full" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Error / Success messages */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs font-medium">
              {error}
            </motion.div>
          )}
          {successMsg && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg} Redirecting to login…</span>
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

        {/* Steps */}
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    placeholder="Dr. Jane Smith"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="jane.smith@institution.ac.in"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID *</label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    value={form.employeeId}
                    onChange={e => update('employeeId', e.target.value)}
                    placeholder="e.g. CSE-102"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>
              </div>

              {/* Profile Photo & Crop Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Profile Photo *</label>
                
                <div className="p-4 bg-slate-50 border border-dashed rounded-2xl border-slate-300 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      <div className="w-13 h-13 rounded-full overflow-hidden ring-2 ring-blue-500/20 bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                        {croppedPreviewUrl ? (
                          <img src={croppedPreviewUrl} alt="Cropped Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center">
                            {userInitial}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs border border-white cursor-pointer"
                        title="Upload Photo"
                      >
                        <Camera className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {profileImage ? (profileImage.name || 'Cropped Profile Photo') : 'Select Profile Photo'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {profileImage ? 'Photo cropped & ready' : 'Crop & align to circular frame'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>{profileImage ? 'Re-crop' : 'Select & Crop'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <select
                    value={form.department}
                    onChange={e => update('department', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: '#e2e8f0' }}
                  >
                    <option value="">Select department…</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation *</label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <select
                    value={form.designation}
                    onChange={e => update('designation', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: '#e2e8f0' }}
                  >
                    <option value="">Select Academic Designation…</option>
                    {(role === 'HOD' ? HOD_DESIGNATIONS : FACULTY_DESIGNATIONS).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-slate-700">Academic & Research Identifiers</p>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Optional</span>
                </div>
                
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Google Scholar ID (Optional)</label>
                    <input
                      value={form.googleScholar}
                      onChange={e => update('googleScholar', e.target.value)}
                      placeholder="e.g. user=abc1234 or Scholar Profile ID"
                      className="w-full px-3.5 py-2 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                      style={{ borderColor: '#e2e8f0' }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Vidwan ID (Optional)</label>
                    <input
                      value={form.vidwanId}
                      onChange={e => update('vidwanId', e.target.value)}
                      placeholder="e.g. 192837"
                      className="w-full px-3.5 py-2 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                      style={{ borderColor: '#e2e8f0' }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Scopus Author ID (Optional)</label>
                    <input
                      value={form.scopusId}
                      onChange={e => update('scopusId', e.target.value)}
                      placeholder="e.g. 57201928"
                      className="w-full px-3.5 py-2 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                      style={{ borderColor: '#e2e8f0' }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-3">
              {/* Profile Preview Card in Confirmation */}
              <div className="bg-slate-50 p-4 rounded-2xl border space-y-3 text-xs" style={{ borderColor: '#e2e8f0' }}>
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                  <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-blue-500/20 bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    {croppedPreviewUrl ? (
                      <img src={croppedPreviewUrl} alt="Confirm Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center">
                        {userInitial}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{form.name}</h4>
                    <p className="text-[11px] font-semibold text-slate-500">{form.designation} • {form.department}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-slate-500">Role:</span><span className="font-bold text-slate-800">{role}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Email:</span><span className="font-bold text-slate-800">{form.email}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Employee ID:</span><span className="font-bold text-slate-800">{form.employeeId}</span></div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 text-center">After submission, your account will be pending approval.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t" style={{ borderColor: '#f1f5f9' }}>
          {step > 0 ? (
            <button
              type="button"
              onClick={() => { setStep(s => s - 1); setError(''); }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : (
            <Link to="/login" className="text-xs text-slate-500 hover:text-slate-800 font-semibold self-center">
              Already registered? Sign In
            </Link>
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-1.5 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md shadow-blue-500/25 cursor-pointer"
              style={{ background: '#2563eb' }}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-1.5 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-md shadow-emerald-500/25 disabled:opacity-50 cursor-pointer"
              style={{ background: '#059669' }}
            >
              {loading ? 'Submitting…' : <><CheckCircle className="w-3.5 h-3.5" /> Register</>}
            </button>
          )}
        </div>

        {/* ── POPUP CROPPER MODAL ── */}
        <ImageCropperModal
          isOpen={showCropper}
          imageSrc={rawImageSrc}
          onClose={() => setShowCropper(false)}
          onCropComplete={handleCropComplete}
        />
      </div>
    </div>
  );
}
