import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../api/services';
import { joinSocketRooms } from '../utils/socket';
import {
  Mail, Lock, Eye, EyeOff, ShieldCheck, KeyRound,
  ArrowRight, ArrowLeft, CheckCircle2, RotateCcw,
  Sparkles, AlertCircle
} from 'lucide-react';
import micLogo from '../assets/mic_logo.png';

export default function Login() {
  const [identifier, setIdentifier] = useState(localStorage.getItem('last_login_identifier') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPass] = useState(false);

  // User Validation State: null | { name, email, role, department, hasPassword, isFirstLogin }
  const [validatedUser, setValidatedUser] = useState(null);
  const [validating, setValidating] = useState(false);

  // Steps: 'IDENTIFIER' | 'PASSWORD' | 'FIRST_TIME' | 'LOGIN_OTP' | 'FORGOT_REQUEST' | 'FORGOT_OTP' | 'FORGOT_NEW_PASSWORD'
  const [step, setStep] = useState('IDENTIFIER');

  // 6-Digit OTP Box Arrays
  const [loginOtp, setLoginOtp] = useState(['', '', '', '', '', '']);
  const [resetOtp, setResetOtp] = useState(['', '', '', '', '', '']);
  const [verifiedOtpString, setVerifiedOtpString] = useState('');

  // Password Reset Fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPass] = useState('');
  const [showNewPassword, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfPass] = useState(false);

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [successMessage, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const navigate = useNavigate();

  // Refs for 6-box inputs
  const loginOtpRefs = useRef([]);
  const resetOtpRefs = useRef([]);

  // Save identifier to localStorage for convenience
  useEffect(() => {
    if (identifier.trim()) {
      localStorage.setItem('last_login_identifier', identifier.trim());
    }
  }, [identifier]);

  // Helper for 6-digit OTP Box Inputs
  const handleOtpChange = (index, value, digitsArray, setDigitsArray, refsArray) => {
    const cleanVal = value.replace(/\D/g, '');
    const newDigits = [...digitsArray];

    if (cleanVal.length > 1) {
      const pasted = cleanVal.slice(0, 6).split('');
      pasted.forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setDigitsArray(newDigits);
      const focusIndex = Math.min(pasted.length, 5);
      refsArray.current[focusIndex]?.focus();
      return;
    }

    newDigits[index] = cleanVal ? cleanVal[0] : '';
    setDigitsArray(newDigits);

    if (cleanVal && index < 5) {
      refsArray.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e, digitsArray, setDigitsArray, refsArray) => {
    if (e.key === 'Backspace') {
      if (!digitsArray[index] && index > 0) {
        const newDigits = [...digitsArray];
        newDigits[index - 1] = '';
        setDigitsArray(newDigits);
        refsArray.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refsArray.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      refsArray.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e, setDigitsArray, refsArray) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = ['', '', '', '', '', ''];
    pastedData.split('').forEach((char, i) => {
      if (i < 6) newDigits[i] = char;
    });
    setDigitsArray(newDigits);

    const focusIndex = Math.min(pastedData.length, 5);
    refsArray.current[focusIndex]?.focus();
  };

  // ── Step 1: Validate Email / ID in DB ──
  const handleCheckIdentifier = async (e) => {
    e?.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError('Please enter your Email or Employee / Admin ID.');
      return;
    }

    setValidating(true);
    setError('');
    setInfoMessage('');
    setSuccessMsg('');

    try {
      const res = await authApi.checkUser({ identifier: cleanId });
      const user = res.data;
      setValidatedUser(user);

      if (user.isFirstLogin || !user.hasPassword) {
        // FIRST TIME USER: Do NOT show password or forgot password!
        setStep('FIRST_TIME');
      } else {
        // EXISTING USER WITH ESTABLISHED PASSWORD
        setStep('PASSWORD');
      }
    } catch (err) {
      setValidatedUser(null);
      setError(err.response?.data?.message || 'No account found with this Email or ID. Please check or register.');
    } finally {
      setValidating(false);
    }
  };

  // Reset back to initial identifier step
  const handleResetToIdentifier = () => {
    setStep('IDENTIFIER');
    setPassword('');
    setValidatedUser(null);
    setError('');
    setInfoMessage('');
    setSuccessMsg('');
  };

  // ── Step 2A: Password Login for Existing User ──
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your Password.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');
    setSuccessMsg('');

    try {
      const res = await authApi.login({
        identifier: identifier.trim(),
        password,
        loginMethod: 'PASSWORD',
      });
      const data = res.data;

      if (data.requiresOtp) {
        setInfoMessage(data.message || '2-Step Verification is active: 6-digit code sent to your email.');
        setStep('LOGIN_OTP');
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('userName', data.name || '');
        localStorage.setItem('department', data.department || '');
        localStorage.setItem('userId', data.id || data._id || '');
        if (data.profileImage) localStorage.setItem('profileImage', data.profileImage);

        joinSocketRooms({
          role: data.role,
          department: data.department || '',
          userId: data.id || data._id || ''
        });

        if (data.isFirstLogin) {
          navigate('/onboarding');
        } else {
          const role = data.role;
          if (role === 'ADMIN') navigate('/admin/dashboard');
          else if (role === 'HOD') navigate('/hod/dashboard');
          else navigate('/faculty/dashboard');
        }
      }
    } catch (err) {
      if (err.response?.data?.requiresFirstTimeOtp) {
        setStep('FIRST_TIME');
        setInfoMessage('First-time account activation required: Please verify with OTP.');
        return;
      }
      setError(err.response?.data?.message || 'Incorrect password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2B: Send OTP for First-Time User or OTP Login ──
  const handleSendOtp = async () => {
    setOtpLoading(true);
    setError('');
    setInfoMessage('');
    setSuccessMsg('');

    try {
      const res = await authApi.login({
        identifier: identifier.trim(),
        loginMethod: 'OTP',
      });
      setInfoMessage(res.data?.message || `Verification code sent to ${validatedUser?.email || identifier.trim()}`);
      setLoginOtp(['', '', '', '', '', '']);
      setStep('LOGIN_OTP');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Step 3: Verify 6-Digit OTP ──
  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    const otpCode = loginOtp.join('');
    if (otpCode.length < 6) {
      setError('Please enter all 6 digits of the OTP code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.verifyOtp({ identifier: identifier.trim(), otp: otpCode });
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('userName', data.name || '');
      localStorage.setItem('department', data.department || '');
      localStorage.setItem('userId', data.id || data._id || '');
      if (data.profileImage) localStorage.setItem('profileImage', data.profileImage);

      joinSocketRooms({
        role: data.role,
        department: data.department || '',
        userId: data.id || data._id || ''
      });

      if (data.isFirstLogin) {
        navigate('/onboarding');
      } else {
        const role = data.role;
        if (role === 'ADMIN') navigate('/admin/dashboard');
        else if (role === 'HOD') navigate('/hod/dashboard');
        else navigate('/faculty/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password Request ──
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const res = await authApi.forgotPassword({ identifier: identifier.trim() });
      setInfoMessage(res.data?.message || 'Password reset OTP has been sent to your registered email.');
      setResetOtp(['', '', '', '', '', '']);
      setStep('FORGOT_OTP');
    } catch (err) {
      setError(err.response?.data?.message || 'No matching account found with this Email or ID.');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password OTP Verify ──
  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    const otpCode = resetOtp.join('');
    if (otpCode.length < 6) {
      setError('Please enter all 6 digits of the OTP.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authApi.verifyResetOtp({
        identifier: identifier.trim(),
        otp: otpCode,
      });
      setVerifiedOtpString(otpCode);
      setSuccessMsg(res.data?.message || 'OTP Verified! Please set your new password.');
      setStep('FORGOT_NEW_PASSWORD');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password - Set New Password ──
  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authApi.resetPassword({
        identifier: identifier.trim(),
        otp: verifiedOtpString,
        newPassword,
      });
      setSuccessMsg(res.data?.message || 'Password updated successfully! Please sign in with your new password.');
      setPassword('');
      setNewPassword('');
      setConfirmPass('');
      setStep('PASSWORD');
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed. Please request a new OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 50%, #e2e8f0 100%)' }}>

      {/* Background Ambient Blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-[550px] h-[550px] rounded-full blur-[130px] pointer-events-none"
        style={{ background: 'rgba(37, 99, 235, 0.12)' }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] rounded-full blur-[130px] pointer-events-none"
        style={{ background: 'rgba(79, 70, 229, 0.10)' }} />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[450px] bg-white rounded-3xl shadow-2xl p-8 border relative z-10"
        style={{ borderColor: '#e2e8f0' }}
      >
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-full max-w-[320px] px-2 py-1.5 mb-2.5 flex items-center justify-center">
            <img src={micLogo} alt="DVR & Dr. HS MIC College of Technology" className="w-full h-auto max-h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Intellica</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Faculty Research Management System</p>
        </div>

        {/* Global Notifications & Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-start gap-2.5 overflow-hidden"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
          {infoMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl text-xs font-semibold flex items-start gap-2.5 overflow-hidden"
            >
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </motion.div>
          )}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-start gap-2.5 overflow-hidden"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* ─────────────────────────────────────────────────────────── */}
          {/* STEP 1: ENTER EMAIL / ID (INITIAL STEP)                     */}
          {/* ─────────────────────────────────────────────────────────── */}
          {step === 'IDENTIFIER' && (
            <motion.form
              key="identifier-step"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 14 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleCheckIdentifier}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email or Employee / Admin ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="e.g. yourname@college.edu or admin"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>
              </div>

              {/* Continue Button */}
              <button
                type="submit"
                disabled={validating || !identifier.trim()}
                className="w-full text-white font-bold py-3 rounded-2xl transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2 text-xs cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                {validating ? 'Validating Account…' : <><span>Continue</span> <ArrowRight className="w-4 h-4" /></>}
              </button>
            </motion.form>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* STEP 2A: FIRST TIME USER ONBOARDING (NO PASSWORD PROMPTED)   */}
          {/* ─────────────────────────────────────────────────────────── */}
          {step === 'FIRST_TIME' && validatedUser && (
            <motion.div
              key="first-time-step"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* User Identity Chip */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {validatedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">{validatedUser.name}</span>
                    <span className="text-[11px] text-blue-700 font-medium">
                      {validatedUser.role} {validatedUser.department ? `· ${validatedUser.department}` : ''}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetToIdentifier}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* First Time Welcome Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">First-Time Activation</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  As a new user, you have not set up a password yet. Please verify your email with a one-time code to activate your account and establish your secure password.
                </p>
              </div>

              {/* Action Button: Send Verification OTP */}
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpLoading}
                className="w-full text-white font-bold py-3 rounded-2xl transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2 text-xs cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                {otpLoading ? (
                  'Dispatching Verification Code…'
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Send Verification OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetToIdentifier}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to email entry
              </button>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* STEP 2B: EXISTING USER (PASSWORD + FORGOT PASSWORD SHOWN)   */}
          {/* ─────────────────────────────────────────────────────────── */}
          {step === 'PASSWORD' && (
            <motion.form
              key="password-step"
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.2 }}
              onSubmit={handlePasswordLogin}
              className="space-y-4"
            >
              {/* Active User Banner */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {validatedUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-slate-900 text-xs block truncate">{validatedUser?.name || identifier}</span>
                    <span className="text-[10px] text-slate-500 truncate block">{validatedUser?.email || identifier}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetToIdentifier}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Enter Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('FORGOT_REQUEST');
                      setError('');
                      setInfoMessage('');
                      setSuccessMsg('');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoFocus
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In Primary Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-bold py-3 rounded-2xl transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2 text-xs cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                {loading ? 'Signing in…' : <><span>Sign In</span> <ArrowRight className="w-4 h-4" /></>}
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t w-full border-slate-200" />
                <span className="bg-white px-3 text-[11px] text-slate-400 uppercase tracking-wider font-bold">or</span>
                <div className="border-t w-full border-slate-200" />
              </div>

              {/* Sign In with OTP */}
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading || otpLoading}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-2xl border border-slate-200 transition-all flex items-center justify-center gap-2 text-xs shadow-2xs cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-blue-600" />
                <span>{otpLoading ? 'Dispatching OTP…' : 'Sign in with OTP'}</span>
              </button>
            </motion.form>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* STEP 3: VERIFY LOGIN / ONBOARDING OTP                       */}
          {/* ─────────────────────────────────────────────────────────── */}
          {step === 'LOGIN_OTP' && (
            <motion.form
              key="login-otp-form"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleVerifyLoginOtp}
              className="space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Email Verification</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Enter the 6-digit code sent to your email.</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetToIdentifier}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Change
                </button>
              </div>

              {/* 6 Numerical Input Boxes */}
              <div
                className="flex justify-between gap-2 my-4"
                onPaste={(e) => handleOtpPaste(e, setLoginOtp, loginOtpRefs)}
              >
                {loginOtp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => (loginOtpRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    autoFocus={idx === 0}
                    onChange={e => handleOtpChange(idx, e.target.value, loginOtp, setLoginOtp, loginOtpRefs)}
                    onKeyDown={e => handleOtpKeyDown(idx, e, loginOtp, setLoginOtp, loginOtpRefs)}
                    className="w-12 h-13 text-center text-lg font-black bg-slate-50 border-2 rounded-2xl outline-none transition-all focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900"
                    style={{ borderColor: digit ? '#3b82f6' : '#e2e8f0' }}
                  />
                ))}
              </div>

              {/* Verify & Proceed Button */}
              <button
                type="submit"
                disabled={loading || loginOtp.join('').length < 6}
                className="w-full text-white font-bold py-3 rounded-2xl transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2 text-xs cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                {loading ? 'Verifying Code…' : <><span>Verify & Continue</span> <ArrowRight className="w-4 h-4" /></>}
              </button>

              {/* Resend Link */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${otpLoading ? 'animate-spin' : ''}`} />
                  <span>{otpLoading ? 'Resending Code…' : 'Resend OTP Code'}</span>
                </button>
              </div>
            </motion.form>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* STEP 4: FORGOT PASSWORD REQUEST OTP                         */}
          {/* ─────────────────────────────────────────────────────────── */}
          {step === 'FORGOT_REQUEST' && (
            <motion.form
              key="forgot-request-form"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleForgotRequest}
              className="space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Reset Password</h3>
                    <p className="text-[11px] text-slate-500">We'll send a 6-digit recovery code to your email.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetToIdentifier}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Registered Email or ID</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !identifier.trim()}
                className="w-full text-white font-bold py-3 rounded-2xl transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2 text-xs cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                {loading ? 'Sending Recovery OTP…' : <><span>Send Recovery Code</span> <ArrowRight className="w-4 h-4" /></>}
              </button>

              <button
                type="button"
                onClick={handleResetToIdentifier}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to sign in
              </button>
            </motion.form>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* STEP 5: FORGOT PASSWORD OTP VERIFY                          */}
          {/* ─────────────────────────────────────────────────────────── */}
          {step === 'FORGOT_OTP' && (
            <motion.form
              key="forgot-otp-form"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleVerifyResetOtp}
              className="space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Enter Reset OTP</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Please check your email for the recovery code.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('FORGOT_REQUEST')}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
              </div>

              {/* 6 Numerical Input Boxes for Reset OTP */}
              <div
                className="flex justify-between gap-2 my-4"
                onPaste={(e) => handleOtpPaste(e, setResetOtp, resetOtpRefs)}
              >
                {resetOtp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => (resetOtpRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    autoFocus={idx === 0}
                    onChange={e => handleOtpChange(idx, e.target.value, resetOtp, setResetOtp, resetOtpRefs)}
                    onKeyDown={e => handleOtpKeyDown(idx, e, resetOtp, setResetOtp, resetOtpRefs)}
                    className="w-12 h-13 text-center text-lg font-black bg-slate-50 border-2 rounded-2xl outline-none transition-all focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900"
                    style={{ borderColor: digit ? '#3b82f6' : '#e2e8f0' }}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || resetOtp.join('').length < 6}
                className="w-full text-white font-bold py-3 rounded-2xl transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2 text-xs cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                {loading ? 'Verifying OTP…' : <><span>Verify Code</span> <ArrowRight className="w-4 h-4" /></>}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleForgotRequest}
                  disabled={loading}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Resend Recovery Code</span>
                </button>
              </div>
            </motion.form>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* STEP 6: SET NEW PASSWORD                                    */}
          {/* ─────────────────────────────────────────────────────────── */}
          {step === 'FORGOT_NEW_PASSWORD' && (
            <motion.form
              key="forgot-new-password-form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSetNewPassword}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Set New Password</h3>
                  <p className="text-[11px] text-slate-500">Create a secure password for your account.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPass(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfPass(!showConfirmPass)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full text-white font-bold py-3 rounded-2xl transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2 text-xs cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                {loading ? 'Updating Password…' : <><span>Save & Sign In</span> <ArrowRight className="w-4 h-4" /></>}
              </button>
            </motion.form>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
