import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell, Search, User, ShieldCheck, LogOut, ChevronDown,
  Building2, Sparkles, CheckCircle2, Settings, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationApi, authApi, hodApi, facultyApi } from '../api/services';
import { subscribeToRealtimeEvent, SYNC_EVENTS } from '../utils/syncEvents';
import { joinSocketRooms } from '../utils/socket';

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
        const uid = res.data._id || res.data.id;
        if (uid) {
          localStorage.setItem('userId', uid);
          joinSocketRooms({
            userId: uid,
            role: res.data.role || role,
            department: res.data.department || department
          });
        }
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

    // 1. Fallback Background Polling every 20 seconds (Socket.IO handles instant push)
    const intervalId = setInterval(loadNotifications, 20000);

    // 2. Real-time focus & event sync
    const handleProfileUpdate = () => {
      fetchProfile();
      setImgError(false);
    };

    const handleSyncEvent = () => {
      loadNotifications();
    };

    const unsubNotif = subscribeToRealtimeEvent(SYNC_EVENTS.NOTIFICATIONS_UPDATED, handleSyncEvent);
    const unsubApp = subscribeToRealtimeEvent(SYNC_EVENTS.APPROVALS_UPDATED, handleSyncEvent);

    window.addEventListener('focus', handleSyncEvent);
    window.addEventListener('notificationUpdated', handleSyncEvent);
    window.addEventListener('approvalsUpdated', handleSyncEvent);
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      clearInterval(intervalId);
      unsubNotif();
      unsubApp();
      window.removeEventListener('focus', handleSyncEvent);
      window.removeEventListener('notificationUpdated', handleSyncEvent);
      window.removeEventListener('approvalsUpdated', handleSyncEvent);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
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
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true, read: true } : n));
      await notificationApi.markAsRead(id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
      await notificationApi.markAllAsRead();
    } catch (e) {
      console.error(e);
    }
  };

  const formatNotifTime = (dateStr) => {
    if (!dateStr) return 'Recent';
    const d = new Date(dateStr);
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-xs animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
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
                className="absolute right-0 mt-2 w-92 bg-white rounded-3xl shadow-2xl border p-4 space-y-3 z-50"
                style={{ borderColor: '#e2e8f0' }}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">Notifications</span>
                    {unreadCount > 0 ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                        {unreadCount} New
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        All Read
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Unread / Active Notifications */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {notifications.filter(n => !n.isRead && !n.read).length > 0 ? (
                    notifications
                      .filter(n => !n.isRead && !n.read)
                      .map(n => {
                        return (
                          <div
                            key={n._id}
                            onClick={() => handleMarkAsRead(n._id)}
                            className="p-3 rounded-2xl transition-all text-xs space-y-1 cursor-pointer border bg-blue-50/60 border-blue-200/80 hover:bg-blue-50"
                            title="Click to mark as read and move to history"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[11px] leading-tight font-bold text-slate-900">
                                {n.message}
                              </p>
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1 animate-pulse" />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                              <span>{formatNotifTime(n.createdAt)}</span>
                              <span className="text-blue-600 font-semibold hover:underline">Mark read ✓</span>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="py-5 text-center text-slate-400 text-xs space-y-1.5">
                      <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                      <p className="font-bold text-slate-700">No new notifications</p>
                      <p className="text-[10px] text-slate-400">All read messages are saved in your notification history.</p>
                    </div>
                  )}
                </div>

                {/* View All Notifications Button */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      const baseRole = (role || 'faculty').toLowerCase();
                      navigate(`/${baseRole}/notifications`);
                    }}
                    className="w-full py-2 px-3 text-center text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50/70 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>View all notifications</span>
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700">
                      {notifications.length}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>
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
