import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCircle2, XCircle, AlertTriangle, MessageSquare,
  Clock, Trash2, Check, Search, Filter, RefreshCw,
  Sparkles, Layers, ShieldCheck, ArrowRight, BookOpen
} from 'lucide-react';
import { notificationApi } from '../../api/services';
import { subscribeToRealtimeEvent, emitRealtimeEvent, SYNC_EVENTS } from '../../utils/syncEvents';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState('ALL'); // 'ALL' | 'UNREAD' | 'READ'
  const [search, setSearch]               = useState('');
  const [acting, setActing]               = useState(false);
  const [toastMsg, setToastMsg]           = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const loadNotifications = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await notificationApi.getAll();
      const list = Array.isArray(res.data) ? res.data : res.data?.notifications || [];
      setNotifications(list);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(true);

    // Real-time subscription & periodic polling
    const unsub = subscribeToRealtimeEvent(SYNC_EVENTS.NOTIFICATIONS_UPDATED, () => loadNotifications(false));
    const interval = setInterval(() => loadNotifications(false), 5000);

    const handleFocus = () => loadNotifications(false);
    window.addEventListener('focus', handleFocus);

    return () => {
      unsub();
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true, read: true } : n));
      await notificationApi.markAsRead(id);
      emitRealtimeEvent(SYNC_EVENTS.NOTIFICATIONS_UPDATED);
      window.dispatchEvent(new CustomEvent('notificationUpdated'));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setActing(true);
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
      await notificationApi.markAllAsRead();
      emitRealtimeEvent(SYNC_EVENTS.NOTIFICATIONS_UPDATED);
      window.dispatchEvent(new CustomEvent('notificationUpdated'));
      showToast('All notifications marked as read.');
    } catch (err) {
      console.error('Error marking all read:', err);
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    try {
      setNotifications(prev => prev.filter(n => n._id !== id));
      await notificationApi.delete(id);
      emitRealtimeEvent(SYNC_EVENTS.NOTIFICATIONS_UPDATED);
      window.dispatchEvent(new CustomEvent('notificationUpdated'));
      showToast('Notification deleted.');
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleClearRead = async () => {
    setActing(true);
    try {
      setNotifications(prev => prev.filter(n => !n.isRead && !n.read));
      await notificationApi.clearRead();
      emitRealtimeEvent(SYNC_EVENTS.NOTIFICATIONS_UPDATED);
      window.dispatchEvent(new CustomEvent('notificationUpdated'));
      showToast('Read notifications cleared.');
    } catch (err) {
      console.error('Error clearing read notifications:', err);
    } finally {
      setActing(false);
    }
  };

  const formatNotifTime = (dateStr) => {
    if (!dateStr) return { relative: 'Recent', full: '' };
    const d = new Date(dateStr);
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    
    let relative = 'Just now';
    if (diffSec >= 60 && diffSec < 3600) relative = `${Math.floor(diffSec / 60)}m ago`;
    else if (diffSec >= 3600 && diffSec < 86400) relative = `${Math.floor(diffSec / 3600)}h ago`;
    else if (diffSec >= 86400) relative = `${Math.floor(diffSec / 86400)}d ago`;

    const full = d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return { relative, full };
  };

  const getNotifMeta = (msg = '') => {
    const text = msg.toLowerCase();
    if (text.includes('approved') || text.includes('awarded') || text.includes('verified')) {
      return {
        icon: CheckCircle2,
        bg: '#d1fae5',
        color: '#059669',
        border: '#a7f3d0',
        badge: 'Approved',
        badgeBg: '#ecfdf5',
        badgeColor: '#047857'
      };
    }
    if (text.includes('rejected')) {
      return {
        icon: XCircle,
        bg: '#fee2e2',
        color: '#dc2626',
        border: '#fca5a5',
        badge: 'Rejected',
        badgeBg: '#fef2f2',
        badgeColor: '#b91c1c'
      };
    }
    if (text.includes('discussion') || text.includes('needs revision')) {
      return {
        icon: MessageSquare,
        bg: '#ffedd5',
        color: '#ea580c',
        border: '#fed7aa',
        badge: 'Discussion',
        badgeBg: '#fff7ed',
        badgeColor: '#c2410c'
      };
    }
    if (text.includes('submission') || text.includes('submitted')) {
      return {
        icon: BookOpen,
        bg: '#dbeafe',
        color: '#2563eb',
        border: '#bfdbfe',
        badge: 'Submission',
        badgeBg: '#eff6ff',
        badgeColor: '#1d4ed8'
      };
    }
    return {
      icon: Bell,
      bg: '#ede9fe',
      color: '#7c3aed',
      border: '#ddd6fe',
      badge: 'Notification',
      badgeBg: '#f5f3ff',
      badgeColor: '#6d28d9'
    };
  };

  // Filtered Notifications
  const unreadList = notifications.filter(n => !n.isRead && !n.read);
  const readList = notifications.filter(n => n.isRead || n.read);

  const activeList = activeTab === 'UNREAD'
    ? unreadList
    : activeTab === 'READ'
    ? readList
    : notifications;

  const filteredNotifications = activeList.filter(n =>
    (n.message || '').toLowerCase().includes(search.toLowerCase())
  );

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
  const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">Notification Center</h1>
            {unreadList.length > 0 && (
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
                {unreadList.length} Unread
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Real-time updates, activity reviews, verification notices, and institutional decisions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadNotifications(true)}
            title="Refresh notifications"
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {unreadList.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={acting}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100/80 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-all cursor-pointer shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              Mark All as Read
            </button>
          )}

          {readList.length > 0 && (
            <button
              onClick={handleClearRead}
              disabled={acting}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              Clear Read History
            </button>
          )}
        </div>
      </motion.div>

      {/* Filter Tabs & Search Bar */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-wrap gap-3 items-center justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
          {[
            { id: 'ALL', label: 'All Notifications', count: notifications.length },
            { id: 'UNREAD', label: 'Unread', count: unreadList.length },
            { id: 'READ', label: 'Read History', count: readList.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-2xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notification messages…"
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
          />
        </div>
      </motion.div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notif) => {
                const isUnread = !notif.isRead && !notif.read;
                const meta = getNotifMeta(notif.message);
                const Icon = meta.icon;
                const timeInfo = formatNotifTime(notif.createdAt);

                return (
                  <motion.div
                    key={notif._id}
                    variants={itemVariants}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => isUnread && handleMarkAsRead(notif._id)}
                    className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer group relative ${
                      isUnread
                        ? 'bg-blue-50/40 hover:bg-blue-50/70 border-blue-200/80 shadow-2xs'
                        : 'bg-white hover:bg-slate-50/80 border-slate-200/80 text-slate-600'
                    }`}
                  >
                    {/* Left Icon & Message Content */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                        style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: meta.color }} />
                      </div>

                      {/* Content */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border"
                            style={{ background: meta.badgeBg, color: meta.badgeColor, borderColor: meta.border }}
                          >
                            {meta.badge}
                          </span>
                          {isUnread && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                              Unread
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-medium ml-auto sm:ml-0" title={timeInfo.full}>
                            {timeInfo.relative} • {timeInfo.full}
                          </span>
                        </div>

                        <p className={`text-xs leading-relaxed ${isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {notif.message}
                        </p>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif._id); }}
                          title="Mark as read"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100/50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(notif._id, e)}
                        title="Delete notification"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="font-bold text-slate-800 text-base">No notifications found</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {search
                    ? 'No messages matched your search query.'
                    : activeTab === 'UNREAD'
                    ? 'You have no unread notifications.'
                    : 'All notifications have been cleared.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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
