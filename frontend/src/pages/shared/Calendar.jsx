import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon, Clock, MapPin, Plus,
  ChevronLeft, ChevronRight, Users, Trash2,
  Edit3, X, CheckCircle2, AlertCircle, Building2,
  CalendarCheck, CalendarDays, Filter, Shield,
  BookOpen, Wrench, Mic, Coins, Building, Bookmark,
  Sparkles, Link2, ExternalLink, Globe
} from 'lucide-react';
import { activityApi, authApi } from '../../api/services';
import { emitRealtimeEvent, subscribeToRealtimeEvent, SYNC_EVENTS } from '../../utils/syncEvents';

const TYPE_CONFIG = {
  MEETING:         { label: 'Department Meeting', color: 'bg-blue-50 text-blue-700 border-blue-200/80', icon: Users },
  RESEARCH_REVIEW: { label: 'Research Review',    color: 'bg-purple-50 text-purple-700 border-purple-200/80', icon: BookOpen },
  WORKSHOP:        { label: 'Workshop',           color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', icon: Wrench },
  SEMINAR:         { label: 'Seminar',            color: 'bg-indigo-50 text-indigo-700 border-indigo-200/80', icon: Mic },
  BUDGET:          { label: 'Budget Discussion',  color: 'bg-amber-50 text-amber-700 border-amber-200/80', icon: Coins },
  DEADLINE:        { label: 'Submission Deadline', color: 'bg-rose-50 text-rose-700 border-rose-200/80', icon: Clock },
  CONFERENCE:      { label: 'Conference',         color: 'bg-cyan-50 text-cyan-700 border-cyan-200/80', icon: Building },
  OTHER:           { label: 'General Activity',   color: 'bg-slate-50 text-slate-700 border-slate-200/80', icon: Bookmark },
  CUSTOM:          { label: '+ Custom Type',      color: 'bg-violet-50 text-violet-700 border-violet-200/80', icon: Sparkles },
};

const getActivityDisplay = (act) => {
  if (act.type === 'CUSTOM' || act.customTypeName) {
    return {
      label: act.customTypeName || 'Custom Activity',
      color: 'bg-violet-50 text-violet-700 border-violet-200/80',
      icon: Sparkles
    };
  }
  return TYPE_CONFIG[act.type] || TYPE_CONFIG.OTHER;
};

const isLink = (val) => {
  if (!val) return false;
  return val.startsWith('http://') || val.startsWith('https://') || val.includes('meet.google.com') || val.includes('zoom.us') || val.includes('teams.microsoft.com');
};

const formatUrl = (val) => {
  if (!val) return '';
  if (val.startsWith('http://') || val.startsWith('https://')) return val;
  return `https://${val}`;
};

export default function DepartmentCalendar() {
  const [activities, setActivities]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [currentUser, setCurrentUser]   = useState(null);
  const [selectedDept, setSelectedDept] = useState('');
  const [typeFilter, setTypeFilter]     = useState('ALL');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Modal State
  const [showModal, setShowModal]       = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [acting, setActing]             = useState(false);
  const [toastMsg, setToastMsg]         = useState('');
  const [errorMsg, setErrorMsg]         = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    time: '10:00 AM',
    venue: 'Department Conference Room',
    link: '',
    type: 'MEETING',
    customTypeName: '',
    department: ''
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [actRes, meRes] = await Promise.all([
        activityApi.getActivities(),
        authApi.getMe().catch(() => null)
      ]);
      const actList = actRes.data?.activities || actRes.data || [];
      setActivities(actList);
      const user = meRes?.data || { role: localStorage.getItem('role') || 'FACULTY' };
      setCurrentUser(user);
      setSelectedDept(actRes.data?.department || user.department || 'CSE');
    } catch (err) {
      console.error(err);
      if (!isSilent) setErrorMsg('Failed to load calendar events');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);

    // Subscribe to cross-tab and component realtime events
    const unsubscribe = subscribeToRealtimeEvent(SYNC_EVENTS.ACTIVITIES_UPDATED, () => {
      loadData(true);
    });

    // Auto-update when tab gains focus
    const handleFocus = () => loadData(true);
    window.addEventListener('focus', handleFocus);

    // Heartbeat sync every 10 seconds (silent background refresh)
    const interval = setInterval(() => {
      loadData(true);
    }, 10000);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const role = currentUser?.role || localStorage.getItem('role') || 'FACULTY';
  const isSuperAdmin = role === 'ADMIN';
  const isHOD = role === 'HOD';
  const canPlan = isSuperAdmin || isHOD;

  const handleOpenCreate = (prefilledDate) => {
    setEditTarget(null);
    setShowLinkInput(false);
    setForm({
      title: '',
      description: '',
      date: prefilledDate || new Date().toISOString().slice(0, 10),
      time: isSuperAdmin ? '11:00 AM' : '03:00 PM',
      venue: isSuperAdmin ? 'Institutional Board Room' : `${selectedDept || 'Department'} Conference Hall`,
      link: '',
      type: 'MEETING',
      customTypeName: '',
      department: isSuperAdmin ? 'ALL' : (selectedDept || 'CSE')
    });
    setShowModal(true);
  };

  const handleDoubleClickDay = (dayNumber) => {
    if (!canPlan) return;
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(dayNumber).padStart(2, '0');
    const dateStr = `${year}-${mm}-${dd}`;
    handleOpenCreate(dateStr);
  };

  const handleOpenEdit = (act) => {
    setEditTarget(act);
    setShowLinkInput(Boolean(act.link));
    setForm({
      title: act.title,
      description: act.description || '',
      date: new Date(act.date).toISOString().slice(0, 10),
      time: act.time || '10:00 AM',
      venue: act.venue || 'Conference Room',
      link: act.link || '',
      type: act.type || (act.customTypeName ? 'CUSTOM' : 'MEETING'),
      customTypeName: act.customTypeName || '',
      department: act.department || (isSuperAdmin ? 'ALL' : selectedDept)
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) {
      setErrorMsg('Please enter Title and Date');
      return;
    }
    if (form.type === 'CUSTOM' && !form.customTypeName.trim()) {
      setErrorMsg('Please enter your Custom Activity Type Name');
      return;
    }
    setActing(true);
    setErrorMsg('');
    try {
      if (editTarget) {
        await activityApi.updateActivity(editTarget._id, form);
        showToast(`Activity "${form.title}" updated successfully!`);
      } else {
        await activityApi.createActivity({
          ...form,
          department: isSuperAdmin ? 'ALL' : (selectedDept || form.department || 'CSE')
        });
        const audienceText = isSuperAdmin ? 'All Department HODs' : `${selectedDept} Faculty`;
        showToast(`Activity scheduled for ${audienceText}!`);
      }
      setShowModal(false);
      setEditTarget(null);
      await loadData(true);
      // Emit realtime sync event across all tabs/dashboards
      emitRealtimeEvent(SYNC_EVENTS.ACTIVITIES_UPDATED, { title: form.title });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save activity');
    } finally {
      setActing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setActing(true);
    setErrorMsg('');
    try {
      await activityApi.deleteActivity(deleteTarget._id);
      showToast(`Activity "${deleteTarget.title}" deleted`);
      setDeleteTarget(null);
      await loadData(true);
      // Emit realtime sync event across all tabs/dashboards
      emitRealtimeEvent(SYNC_EVENTS.ACTIVITIES_UPDATED, { deletedId: deleteTarget._id });
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to delete activity');
    } finally {
      setActing(false);
    }
  };

  // Month navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Calendar Day Generation
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const filteredActivities = activities.filter(a => {
    if (typeFilter !== 'ALL') {
      if (typeFilter === 'CUSTOM') {
        if (a.type !== 'CUSTOM' && !a.customTypeName) return false;
      } else if (a.type !== typeFilter) {
        return false;
      }
    }
    return true;
  });

  const getDayActivities = (dayNumber) => {
    return activities.filter(a => {
      const d = new Date(a.date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === dayNumber;
    });
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isSuperAdmin ? 'Institutional & Department Calendar' : 'Department Calendar'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 text-[11px] font-black">
              {isSuperAdmin ? 'College-Wide' : selectedDept || 'CSE'}
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            {isSuperAdmin
              ? 'Plan institutional meetings and milestone reviews visible to all Department HODs.'
              : isHOD
                ? `Plan departmental meetings, reviews, and submission deadlines visible to your ${selectedDept || 'CSE'} faculty.`
                : `Upcoming academic activities and milestone schedules planned by your Head of Department.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canPlan && (
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleOpenCreate}
              className="flex items-center gap-2 text-xs font-bold text-white px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-md shadow-blue-500/25 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isSuperAdmin ? '+ Plan Activity for All HODs' : '+ Plan Department Activity'}</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Toast and Error Notifications */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center justify-between shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-800 p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-bold text-[11px] flex items-center gap-1 shrink-0">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        <button
          onClick={() => setTypeFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
            typeFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Activities ({activities.length})
        </button>
        {Object.entries(TYPE_CONFIG).map(([typeKey, cfg]) => {
          if (typeKey === 'CUSTOM') return null; // Only show predefined in pills
          const count = activities.filter(a => a.type === typeKey).length;
          if (count === 0 && typeFilter !== typeKey) return null;
          const Icon = cfg.icon;
          return (
            <button
              key={typeKey}
              onClick={() => setTypeFilter(typeKey)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                typeFilter === typeKey
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cfg.label}</span>
              <span className="text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left 2 Columns: Interactive Calendar Grid ── */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 bg-white rounded-3xl p-6 border shadow-xs space-y-4"
          style={{ borderColor: '#e8edf5' }}
        >
          {/* Calendar Month Controls */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-black text-slate-900">
                {monthNames[month]} {year}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-400 py-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-1 uppercase text-[10px] tracking-wider font-extrabold">{d}</div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 sm:h-24 p-1.5 rounded-2xl bg-slate-50/40 border border-transparent" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNumber = i + 1;
              const isToday =
                new Date().getDate() === dayNumber &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              const dayActs = getDayActivities(dayNumber);

              return (
                <div
                  key={dayNumber}
                  onDoubleClick={() => handleDoubleClickDay(dayNumber)}
                  title={canPlan ? `Double-click to plan activity for ${monthNames[month]} ${dayNumber}, ${year}` : undefined}
                  className={`h-20 sm:h-24 p-1.5 rounded-2xl border transition-all flex flex-col justify-between select-none ${
                    canPlan ? 'cursor-pointer' : ''
                  } ${
                    isToday
                      ? 'bg-blue-50/40 border-blue-300 ring-2 ring-blue-400/20'
                      : dayActs.length > 0
                        ? 'bg-white border-slate-200/90 hover:border-blue-300 shadow-2xs'
                        : 'bg-slate-50/40 border-slate-100 hover:bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black w-5 h-5 rounded-full flex items-center justify-center ${
                      isToday ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-700'
                    }`}>
                      {dayNumber}
                    </span>
                    <div className="flex items-center gap-1">
                      {canPlan && (
                        <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                          +
                        </span>
                      )}
                      {dayActs.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-12 pr-0.5">
                    {dayActs.slice(0, 2).map((act) => {
                      const display = getActivityDisplay(act);
                      const Icon = display.icon;
                      const canEditThis = isSuperAdmin || (isHOD && act.createdByRole !== 'ADMIN');
                      return (
                        <div
                          key={act._id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canEditThis) handleOpenEdit(act);
                          }}
                          title={`${act.title} (${act.time}) - ${act.venue}`}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate cursor-pointer transition-transform hover:scale-102 flex items-center gap-1 ${display.color}`}
                        >
                          <Icon className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{act.title}</span>
                        </div>
                      );
                    })}
                    {dayActs.length > 2 && (
                      <span className="text-[9px] font-bold text-slate-400 block text-center">
                        +{dayActs.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Right Column: Agenda & Upcoming Activity Cards ── */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-3xl p-6 border shadow-xs flex flex-col space-y-4"
          style={{ borderColor: '#e8edf5' }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-black text-slate-900">Upcoming Agenda</h3>
            </div>
            <span className="text-[11px] font-extrabold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-xl border border-purple-100">
              {filteredActivities.length} Scheduled
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[500px]">
            {filteredActivities.map((act) => {
              const display = getActivityDisplay(act);
              const Icon = display.icon;
              const actDate = new Date(act.date);
              const formattedDate = actDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              const isAdminActivity = act.createdByRole === 'ADMIN' || act.targetAudience === 'ALL_HODS';
              const canEditThis = isSuperAdmin || (isHOD && !isAdminActivity);

              const webLink = act.link || (isLink(act.venue) ? act.venue : null);

              return (
                <motion.div
                  key={act._id}
                  whileHover={{ y: -1 }}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-blue-300 transition-all bg-white shadow-2xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${display.color}`}>
                        <Icon className="w-3 h-3" />
                        <span>{display.label}</span>
                      </span>
                      {isAdminActivity ? (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/70 flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5" /> All HODs
                        </span>
                      ) : (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70 flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" /> {act.department || selectedDept} Faculty
                        </span>
                      )}
                    </div>

                    {canEditThis && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(act)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded-md cursor-pointer transition-colors"
                          title="Edit Activity"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(act)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer transition-colors"
                          title="Delete Activity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-slate-900">{act.title}</h4>
                    {act.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{act.description}</p>
                    )}
                  </div>

                  {/* Date, Venue and Direct Redirect Link */}
                  <div className="pt-2 border-t border-slate-100 space-y-2 text-[10px] font-semibold text-slate-500">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedDate} · {act.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{act.venue || 'Conference Room'}</span>
                      </div>
                    </div>

                    {/* Interactive Web / Virtual Link Button */}
                    {webLink && (
                      <div className="pt-1">
                        <a
                          href={formatUrl(webLink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-bold text-[11px] border border-blue-200/80 transition-all shadow-2xs group cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                          <span>Join Meeting / Open Link</span>
                        </a>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {filteredActivities.length === 0 && (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <CalendarCheck className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No scheduled activities</p>
                <p className="text-[11px] text-slate-400">
                  {canPlan ? 'Click "+ Plan Activity" above to schedule events.' : 'No upcoming activities scheduled yet.'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── MODAL: PLAN / EDIT DEPARTMENT ACTIVITY ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              className="bg-white rounded-3xl p-7 max-w-2xl w-full space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/25 shrink-0">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {editTarget
                        ? 'Edit Activity'
                        : isSuperAdmin
                          ? 'Plan Institutional Activity for All HODs'
                          : `Plan Department Activity for ${selectedDept || 'CSE'}`}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isSuperAdmin
                        ? 'Schedule meetings and milestone reviews visible to all Department Heads (HODs)'
                        : `Schedule meetings and reviews visible to ${selectedDept || 'CSE'} faculty members`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Target Audience Banner */}
              <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-2xl text-xs font-bold text-blue-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  {isSuperAdmin
                    ? 'Target Audience: Visible to All Department Heads (HODs)'
                    : `Target Audience: Visible only to Department of ${selectedDept || 'CSE'} Faculty`}
                </span>
              </div>

              <form onSubmit={handleSave} className="space-y-4.5">
                {/* Activity Type Selector with Custom Option */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Activity Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {Object.entries(TYPE_CONFIG).map(([typeKey, cfg]) => {
                      const Icon = cfg.icon;
                      const isSelected = form.type === typeKey;
                      return (
                        <button
                          key={typeKey}
                          type="button"
                          onClick={() => setForm({ ...form, type: typeKey })}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer text-left ${
                            isSelected
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                              : 'bg-slate-50/80 text-slate-700 border-slate-200/80 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                          <span className="leading-snug text-[11px] font-bold">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* If Custom Type Selected, Show Custom Name Input */}
                  {form.type === 'CUSTOM' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 p-3.5 bg-violet-50/70 border border-violet-200 rounded-2xl space-y-1.5"
                    >
                      <label className="block text-xs font-bold text-violet-900">
                        Custom Activity Type Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.customTypeName}
                        onChange={e => setForm({ ...form, customTypeName: e.target.value })}
                        placeholder="e.g. Hackathon, Guest Lecture, Industrial Visit, FDP, NAAC Audit"
                        className="w-full px-3.5 py-2 bg-white border border-violet-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Activity Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Department Meeting / Research Review / Budget Discussion"
                    className="w-full px-4 py-2.5 bg-slate-50 border rounded-2xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Event Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={e => setForm({ ...form, date: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border rounded-2xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                      style={{ borderColor: '#e2e8f0' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Time
                    </label>
                    <input
                      type="text"
                      value={form.time}
                      onChange={e => setForm({ ...form, time: e.target.value })}
                      placeholder="e.g. 03:00 PM / 11:00 AM"
                      className="w-full px-4 py-2.5 bg-slate-50 border rounded-2xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                      style={{ borderColor: '#e2e8f0' }}
                    />
                  </div>
                </div>

                {/* Location / Venue with + Add Link Action Button */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Location / Physical Venue
                    </label>
                    {!showLinkInput && (
                      <button
                        type="button"
                        onClick={() => setShowLinkInput(true)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>+ Add Virtual / Meeting Link</span>
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={form.venue}
                    onChange={e => setForm({ ...form, venue: e.target.value })}
                    placeholder="e.g. CSE Seminar Hall / Institutional Board Room"
                    className="w-full px-4 py-2.5 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: '#e2e8f0' }}
                  />

                  {/* Virtual Link Input */}
                  {(showLinkInput || form.link) && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1 pt-1"
                    >
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-blue-800 flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-blue-600" />
                          <span>Virtual Meeting / Web URL (Auto-redirectable)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => { setShowLinkInput(false); setForm({ ...form, link: '' }); }}
                          className="text-[10px] text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          Remove Link
                        </button>
                      </div>
                      <input
                        type="text"
                        value={form.link}
                        onChange={e => setForm({ ...form, link: e.target.value })}
                        placeholder="e.g. https://meet.google.com/xyz-abc or https://zoom.us/j/123456"
                        className="w-full px-4 py-2.5 bg-blue-50/40 border border-blue-200 rounded-2xl text-xs font-medium text-blue-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Description / Agenda Notes
                  </label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Provide overview, required preparations, or topics to be covered…"
                    className="w-full p-3.5 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={acting}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-50"
                  >
                    {acting ? 'Saving…' : editTarget ? 'Save Changes' : 'Schedule Activity'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: DELETE ACTIVITY CONFIRMATION ── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
                <Trash2 className="w-5 h-5" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900">Delete Activity?</h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to remove <strong className="text-slate-800 font-bold">"{deleteTarget.title}"</strong> from the calendar schedule?
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-rose-600/25 cursor-pointer disabled:opacity-50"
                >
                  {acting ? 'Deleting…' : 'Delete Activity'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
