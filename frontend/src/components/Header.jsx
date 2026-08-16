import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell, Search, User, ShieldCheck, LogOut, ChevronDown,
  Building2, Sparkles, CheckCircle2, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationApi, authApi, hodApi, facultyApi } from '../api/services';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

export const resolveProfileImageUrl = (img) => {
  if (!img || typeof img !== 'string') return null;
  const trimmed = img.trim();
  if (!trimmed) return null;
  // Already an absolute URL (data URI, http/https)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  // Relative path — served via Vite proxy → /uploads/...
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (cleanPath.startsWith('/uploads/')) return cleanPath;
  return `/uploads/${trimmed.replace(/^uploads\//, '')}`;
};

export default function Header() {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu]     = useState(false);
  const [notifications, setNotifications]         = useState([]);
  const [profileData, setProfileData]             = useState(null);
  const [imgError, setImgError]                   = useState(false);
  
  const profileRef = useRef(null);
  const notifRef   = useRef(null);

  const role       = localStorage.getItem('role') || 'FACULTY';
  const userName   = localStorage.getItem('userName') || 'moksha';
  const department = localStorage.getItem('department') || 'CSE';
  const designation = localStorage.getItem('designation') || (role === 'HOD' ? 'Professor & HOD' : role === 'ADMIN' ? 'Administrator' : 'Faculty Member');

  const profilePath = `/${role.toLowerCase()}/profile`;
  const settingsPath = `/${role.toLowerCase()}/settings`;

  const fetchProfile = () => {
    authApi.getMe().then(res => {
      if (res?.data) {
        setProfileData(res.data);
        if (res.data.profileImage) {
          localStorage.setItem('profileImage', res.data.profileImage);
        }
      }
    }).catch(() => {});
  };

  const loadNotifications = () => {
    notificationApi.getAll()
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : res.data?.notifications || [];
        setNotifications(list);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
    fetchProfile();

    const handleProfileUpdate = () => {
      fetchProfile();
      setImgError(false);
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead && !n.read).length;

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true, read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const displayName = profileData?.name || userName;
  const userInitial = (displayName || 'M').charAt(0).toUpperCase();
  const displayRole = profileData?.designation || designation;
  const profileImg = profileData?.profileImage || localStorage.getItem('profileImage');
  const imageUrl = resolveProfileImageUrl(profileImg);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch (_) {}
    localStorage.clear();
    navigate('/login');
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="h-16 flex items-center justify-between px-6 shrink-0 border-b bg-white relative z-30"
      style={{ borderColor: '#e8edf5' }}
    >
      {/* Search Bar with ⌘K Badge */}
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border text-xs w-72 sm:w-80 bg-slate-50/70 border-slate-200/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 transition-all">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search for anything…"
          className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder-slate-400 font-medium"
        />
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-extrabold text-slate-400 bg-white border border-slate-200 rounded-md shadow-2xs">
          ⌘K
        </kbd>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors relative cursor-pointer"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.21, 0.47, 0.32, 0.98] }}
                className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-xl border border-slate-200 p-4 space-y-3 z-50"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-slate-900">Notifications</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {unreadCount} New
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div
                        key={n._id}
                        onClick={() => handleMarkAsRead(n._id)}
                        className="p-2.5 rounded-2xl bg-slate-50 hover:bg-blue-50/50 transition-colors text-xs space-y-0.5 cursor-pointer"
                      >
                        <p className="font-bold text-slate-900 text-[11px]">{n.title || 'Department Update'}</p>
                        <p className="text-[10px] text-slate-500">{n.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      <p className="font-bold text-slate-600">No new notifications</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">You're all caught up!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile Chip with Live Photo */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
            className="flex items-center gap-2.5 p-1.5 pl-2 hover:bg-slate-100/80 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-slate-200"
          >
            {imageUrl && !imgError ? (
              <img
                src={imageUrl}
                alt={displayName}
                onError={() => setImgError(true)}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20 shadow-2xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                {userInitial}
              </div>
            )}
            
            <div className="text-left hidden sm:block">
              <span className="text-xs font-black text-slate-900 block leading-tight">{displayName}</span>
              <span className="text-[10px] font-bold text-slate-400 block leading-tight">{displayRole}</span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Profile Menu Dropdown */}
          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.21, 0.47, 0.32, 0.98] }}
                className="absolute right-0 mt-2 w-56 bg-white rounded-3xl shadow-xl border border-slate-200 p-2 space-y-1 z-50"
              >
                <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2.5">
                  {imageUrl && !imgError ? (
                    <img
                      src={imageUrl}
                      alt={displayName}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/20 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {userInitial}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">{displayName}</p>
                    <p className="text-[10px] font-semibold text-slate-400 truncate">{profileData?.email || 'user@intellica.edu'}</p>
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to={profilePath}
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50/60 rounded-xl transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to={settingsPath}
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50/60 rounded-xl transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Settings & Security</span>
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </motion.header>
  );
}
