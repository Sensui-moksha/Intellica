import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, User, CheckCircle, MessageSquare, Loader2,
  XCircle, Clock, CheckCircle2, AlertTriangle, Search,
  Calendar, Maximize2, Minimize2, ExternalLink, Building2
} from 'lucide-react';
import { adminApi } from '../../api/services';
import { emitRealtimeEvent, subscribeToRealtimeEvent, SYNC_EVENTS } from '../../utils/syncEvents';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

export default function AdminApprovals() {
  const [activeTab, setActiveTab]         = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED'
  const [pendingQueue, setPendingQueue]   = useState([]);
  const [approvedQueue, setApprovedQueue] = useState([]);
  const [rejectedQueue, setRejectedQueue] = useState([]);
  const [departments, setDepartments]     = useState([]);
  const [selectedDept, setSelectedDept]   = useState('ALL');

  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState(false);
  const [search, setSearch]     = useState('');
  const [isDocFullscreen, setIsDocFullscreen] = useState(false);
  const [docLoadError, setDocLoadError] = useState(false);

  // Modals & Action Box
  const [actionType, setActionType] = useState(null); // null | 'DISCUSSION' | 'REJECT'
  const [actionComment, setActionComment] = useState('');

  const getDocumentUrl = (filePath) => {
    if (!filePath) return '';
    const cleanPath = filePath.replace(/^(\/?uploads\/)+/, '').replace(/^\/+/, '');
    return encodeURI(`${API_BASE}/uploads/${cleanPath}`);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDocFullscreen) {
        setIsDocFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDocFullscreen]);

  const loadAllData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [pendingRes, approvedRes, rejectedRes, deptsRes] = await Promise.all([
        adminApi.getPendingUploads(),
        adminApi.getApprovedUploads(),
        adminApi.getRejectedUploads(),
        adminApi.getDepartments().catch(() => ({ data: [] }))
      ]);

      const pList = Array.isArray(pendingRes.data) ? pendingRes.data : pendingRes.data?.uploads || [];
      const aList = Array.isArray(approvedRes.data) ? approvedRes.data : approvedRes.data?.uploads || [];
      const rList = Array.isArray(rejectedRes.data) ? rejectedRes.data : rejectedRes.data?.uploads || [];
      const dList = Array.isArray(deptsRes.data) ? deptsRes.data : deptsRes.data?.departments || [];

      setPendingQueue(pList);
      setApprovedQueue(aList);
      setRejectedQueue(rList);
      setDepartments(dList.map(d => typeof d === 'string' ? d : d.name));

      // Auto-select or preserve current selection of current tab
      const currentList = activeTab === 'PENDING' ? pList : activeTab === 'APPROVED' ? aList : rList;
      const initialFiltered = selectedDept === 'ALL'
        ? currentList
        : currentList.filter(item => (item.department || item.faculty?.department || '').toUpperCase() === selectedDept.toUpperCase());

      setSelected(prev => {
        if (prev && initialFiltered.some(item => item._id === prev._id)) {
          return initialFiltered.find(item => item._id === prev._id);
        }
        return initialFiltered[0] || null;
      });
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData(true);

    // Fallback background polling every 25s (Socket.IO handles real-time push)
    const interval = setInterval(() => loadAllData(false), 25000);
    const handleSync = () => loadAllData(false);

    const unsubBroadcast = subscribeToRealtimeEvent(SYNC_EVENTS.APPROVALS_UPDATED, handleSync);

    window.addEventListener('focus', handleSync);
    window.addEventListener('approvalsUpdated', handleSync);

    return () => {
      clearInterval(interval);
      unsubBroadcast();
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('approvalsUpdated', handleSync);
    };
  }, [activeTab, selectedDept]);

  // When switching tabs, update selection
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActionType(null);
    setActionComment('');
    setDocLoadError(false);

    const list = tab === 'PENDING' ? pendingQueue : tab === 'APPROVED' ? approvedQueue : rejectedQueue;
    const filtered = selectedDept === 'ALL'
      ? list
      : list.filter(item => (item.department || item.faculty?.department || '').toUpperCase() === selectedDept.toUpperCase());
    setSelected(filtered[0] || null);
  };

  // When switching Department filter card
  const handleDeptSelect = (deptName) => {
    setSelectedDept(deptName);
    setActionType(null);
    setActionComment('');
    setDocLoadError(false);

    const list = activeTab === 'PENDING' ? pendingQueue : activeTab === 'APPROVED' ? approvedQueue : rejectedQueue;
    const filtered = deptName === 'ALL'
      ? list
      : list.filter(item => (item.department || item.faculty?.department || '').toUpperCase() === deptName.toUpperCase());
    setSelected(filtered[0] || null);
  };

  // Perform Decision
  const handleDecision = async (id, decision) => {
    setActing(true);
    try {
      if (decision === 'APPROVED') {
        await adminApi.approveUpload(id);
      } else if (decision === 'REJECTED') {
        await adminApi.rejectUpload(id, { reason: actionComment || 'Rejected by Admin' });
      } else if (decision === 'REOPEN') {
        await adminApi.reopenUpload(id);
      } else if (decision === 'DISCUSSION') {
        await adminApi.discussUpload(id, { comment: actionComment, needsRevision: true });
      }

      setActionType(null);
      setActionComment('');

      // Dispatch global events for instant real-time sync across other tabs & components
      emitRealtimeEvent(SYNC_EVENTS.APPROVALS_UPDATED);
      emitRealtimeEvent(SYNC_EVENTS.NOTIFICATIONS_UPDATED);
      window.dispatchEvent(new CustomEvent('approvalsUpdated'));
      window.dispatchEvent(new CustomEvent('notificationUpdated'));

      await loadAllData(false);
    } catch (err) {
      console.error(err);
    } finally {
      setActing(false);
    }
  };

  const getItemTitle = (item) => {
    if (!item) return '';
    const t = (item.title || '').trim();
    if (t && t.toLowerCase() !== 'untitled' && t.toLowerCase() !== 'untitled submission') {
      return t;
    }
    const m = item.metadata || {};
    if (m.paperTitle) return m.paperTitle;
    if (m.thesisTopic) return m.thesisTopic;
    if (m.projectTitle) return m.projectTitle;
    if (m.patentTitle) return m.patentTitle;
    if (m.bookTitle) return m.bookTitle;
    if (m.courseName) return m.courseName;
    if (m.fdpTitle) return m.fdpTitle;
    if (m.workshopTitle) return m.workshopTitle;
    if (m.seminarTitle) return m.seminarTitle;
    if (m.webinarTitle) return m.webinarTitle;
    if (m.organization) return `MoU Agreement - ${m.organization}`;
    if (m.name) return m.name;
    if (m.topic) return m.topic;
    return `${item.category || 'Research'} Record`;
  };

  // Current active list
  const currentList = activeTab === 'PENDING'
    ? pendingQueue
    : activeTab === 'APPROVED'
      ? approvedQueue
      : rejectedQueue;

  // Build department summary map from current queue + registered departments
  const deptSummaryMap = {};
  currentList.forEach(item => {
    const dept = (item.department || item.faculty?.department || 'General').toUpperCase();
    if (!deptSummaryMap[dept]) {
      deptSummaryMap[dept] = { count: 0, credits: 0 };
    }
    deptSummaryMap[dept].count += 1;
    deptSummaryMap[dept].credits += (Number(item.credits) || 0);
  });

  // Ensure registered departments exist in map
  departments.forEach(d => {
    const dUpper = d.toUpperCase();
    if (!deptSummaryMap[dUpper]) {
      deptSummaryMap[dUpper] = { count: 0, credits: 0 };
    }
  });

  const availableDepts = Object.keys(deptSummaryMap).sort((a, b) => {
    // Put departments with items first
    if (deptSummaryMap[b].count !== deptSummaryMap[a].count) {
      return deptSummaryMap[b].count - deptSummaryMap[a].count;
    }
    return a.localeCompare(b);
  });

  const filteredList = currentList.filter(item => {
    const titleText = getItemTitle(item).toLowerCase();
    const query = search.toLowerCase();
    const itemDept = (item.department || item.faculty?.department || '').toUpperCase();

    const matchesSearch =
      titleText.includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.faculty?.name?.toLowerCase().includes(query) ||
      itemDept.toLowerCase().includes(query);

    const matchesDept = selectedDept === 'ALL' || itemDept === selectedDept.toUpperCase();

    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-4 pb-10">
      {/* ── Header & Tabs ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin Approvals</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Select a department card below to filter submissions and validate research proofs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80 shrink-0">
          <button
            onClick={() => handleTabChange('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
              activeTab === 'PENDING' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {pendingQueue.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('APPROVED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'APPROVED'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
              activeTab === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {approvedQueue.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('REJECTED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'REJECTED'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
              activeTab === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {rejectedQueue.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── 🌟 DEPARTMENT FILTER CARDS ROW ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {/* All Departments Card */}
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleDeptSelect('ALL')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            selectedDept === 'ALL'
              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
              selectedDept === 'ALL' ? 'text-blue-100' : 'text-slate-400'
            }`}>
              College-Wide
            </span>
            <Building2 className={`w-4 h-4 ${selectedDept === 'ALL' ? 'text-white' : 'text-blue-600'}`} />
          </div>
          <div>
            <span className="text-xs font-black block truncate">All Departments</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`text-[11px] font-extrabold px-1.5 py-0.2 rounded-md ${
                selectedDept === 'ALL'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-50 text-blue-700'
              }`}>
                {currentList.length} {activeTab.toLowerCase()}
              </span>
            </div>
          </div>
        </motion.button>

        {/* Individual Department Cards */}
        {availableDepts.map(dept => {
          const stats = deptSummaryMap[dept] || { count: 0, credits: 0 };
          const isSelected = selectedDept.toUpperCase() === dept.toUpperCase();

          return (
            <motion.button
              key={dept}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleDeptSelect(dept)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40'
                  : stats.count > 0
                    ? 'bg-white text-slate-800 border-slate-200/80 hover:border-blue-300 hover:shadow-2xs'
                    : 'bg-slate-50/70 text-slate-500 border-slate-200/50 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                  isSelected ? 'text-blue-100' : 'text-slate-400'
                }`}>
                  Dept
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  stats.count > 0 ? (isSelected ? 'bg-emerald-300' : 'bg-emerald-500') : 'bg-slate-300'
                }`} />
              </div>
              <div>
                <span className="text-xs font-black block truncate">{dept}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[11px] font-extrabold px-1.5 py-0.2 rounded-md ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : stats.count > 0
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {stats.count} {activeTab.toLowerCase()}
                  </span>
                  {stats.credits > 0 && (
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      {stats.credits} pts
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 bg-white rounded-3xl border border-slate-200 gap-2">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading submissions…</p>
        </div>
      ) : (
        <div className="flex gap-5 h-[calc(100vh-14rem)]">
          {/* Left Queue List */}
          <div className="w-84 shrink-0 flex flex-col gap-3 h-full">
            {/* Search Input & Active Filter indicator */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={`Search in ${selectedDept === 'ALL' ? 'all depts' : selectedDept}…`}
                  className="w-full pl-10 pr-3 py-2 bg-white border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>

              {selectedDept !== 'ALL' && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 border border-blue-200/70 rounded-xl text-xs text-blue-800 font-bold">
                  <span>Filtered: {selectedDept} ({filteredList.length})</span>
                  <button
                    onClick={() => handleDeptSelect('ALL')}
                    className="text-blue-600 hover:text-blue-900 text-[11px] underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>
              )}
            </div>

            {/* List Items */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              <AnimatePresence>
                {filteredList.map(item => {
                  const isSel = selected?._id === item._id;
                  return (
                    <motion.button
                      key={item._id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => {
                        setSelected(item);
                        setActionType(null);
                        setActionComment('');
                        setDocLoadError(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSel
                          ? activeTab === 'REJECTED'
                            ? 'border-rose-300 bg-rose-50/70 shadow-xs'
                            : activeTab === 'APPROVED'
                              ? 'border-emerald-300 bg-emerald-50/70 shadow-xs'
                              : 'border-blue-300 bg-blue-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-slate-900 text-xs line-clamp-2">{getItemTitle(item)}</p>
                        {activeTab === 'REJECTED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 shrink-0">
                            Rejected
                          </span>
                        )}
                        {activeTab === 'APPROVED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 shrink-0">
                            Approved
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium">
                          {item.faculty?.name || 'Faculty Member'} · {item.department || item.faculty?.department || 'General'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/80 flex-wrap gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-100 text-slate-700">
                            {item.category}
                          </span>
                          {item.subcategory && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 truncate max-w-[140px]">
                              {item.subcategory}
                            </span>
                          )}
                        </div>
                        {item.credits !== undefined && (
                          <span className="text-[11px] font-extrabold text-blue-600">
                            {item.credits} pts
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>

              {filteredList.length === 0 && (
                <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200/80 text-slate-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-xs text-slate-600">No submissions found</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {selectedDept !== 'ALL' ? `No ${activeTab.toLowerCase()} records for ${selectedDept}` : 'All reviews completed!'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Detail & Document View */}
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-xs">
            {selected ? (
              <div className="flex flex-col h-full p-5 space-y-4 overflow-y-auto">
                {/* Header Information Bar */}
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60">
                        {selected.category}
                      </span>
                      {selected.year && (
                        <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Year: {selected.year}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-black text-slate-900 leading-snug">{getItemTitle(selected)}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Submitted By: <strong>{selected.faculty?.name || 'Faculty Member'}</strong> · Department: <strong>{selected.department || selected.faculty?.department || 'General'}</strong> · Credits: <strong className="text-blue-600">{selected.credits || 0} Credits</strong>
                    </p>
                  </div>

                  {/* Actions & Preview Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsDocFullscreen(true)}
                      title="Fullscreen Preview"
                      className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    {selected.filePath && (
                      <a
                        href={getDocumentUrl(selected.filePath)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>New Tab</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Rejection / Discussion Banner */}
                {selected.rejectionReason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Rejection Note ({selected.rejectedBy || 'Institution'}):</p>
                      <p className="text-[11px] mt-0.5">{selected.rejectionReason}</p>
                    </div>
                  </div>
                )}

                {/* ── Document Preview Frame & Metadata ── */}
                <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col overflow-hidden relative min-h-[420px]">
                  {selected.filePath && !docLoadError ? (
                    <iframe
                      src={getDocumentUrl(selected.filePath)}
                      onError={() => setDocLoadError(true)}
                      className="w-full h-full flex-1 rounded-2xl border-0"
                      title="Research Document Preview"
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{getItemTitle(selected)}</h4>
                        <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                          Direct PDF preview is not available or attachment was recorded as structured metadata.
                        </p>
                      </div>
                      {/* Structured Metadata Box */}
                      <div className="w-full max-w-md bg-white border rounded-2xl p-3.5 text-left text-xs space-y-1.5" style={{ borderColor: '#e2e8f0' }}>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-400">Category:</span>
                          <span className="font-bold text-slate-800">{selected.category}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-400">Department:</span>
                          <span className="font-bold text-slate-800">{selected.department || 'General'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-400">Academic Year:</span>
                          <span className="font-bold text-slate-800">{selected.year || '2026'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">Awarded Points:</span>
                          <span className="font-extrabold text-blue-600">{selected.credits || 0} pts</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Box: Discussion or Rejection Reason Form */}
                <AnimatePresence>
                  {actionType && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="p-3.5 bg-slate-50 border rounded-2xl space-y-2.5"
                      style={{ borderColor: actionType === 'REJECT' ? '#fecdd3' : '#bfdbfe' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          {actionType === 'REJECT' ? 'Specify Reason for Rejection:' : 'Revision Feedback / Discussion Notes:'}
                        </span>
                        <button
                          onClick={() => { setActionType(null); setActionComment(''); }}
                          className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={actionComment}
                        onChange={e => setActionComment(e.target.value)}
                        placeholder={actionType === 'REJECT' ? 'e.g. Document incomplete or does not meet criteria…' : 'e.g. Please clarify publication tier or upload proof page…'}
                        className="w-full p-2.5 bg-white border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                        style={{ borderColor: '#e2e8f0' }}
                      />
                      <div className="flex justify-end">
                        {actionType === 'REJECT' ? (
                          <button
                            disabled={acting}
                            onClick={() => handleDecision(selected._id, 'REJECTED')}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{acting ? 'Rejecting…' : 'Confirm Rejection'}</span>
                          </button>
                        ) : (
                          <button
                            disabled={!actionComment.trim() || acting}
                            onClick={() => handleDecision(selected._id, 'DISCUSSION')}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{acting ? 'Sending…' : 'Send Revision Request'}</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bottom Decision Footer */}
                {!actionType && (() => {
                  const isRejected = ['ADMIN_REJECTED', 'HOD_REJECTED', 'REJECTED'].includes(selected.status);
                  const isApproved = selected.status === 'ADMIN_APPROVED';
                  const isPending = !isRejected && !isApproved;

                  return (
                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs text-slate-400">
                        {isPending
                          ? 'Awaiting Institutional Review'
                          : isRejected
                            ? 'Status: Rejected by Authority'
                            : 'Status: Approved & Credits Awarded'}
                      </div>

                      <div className="flex items-center gap-2.5">
                        {/* PENDING ACTIONS */}
                        {isPending && (
                          <>
                            <button
                              onClick={() => { setActionType('DISCUSSION'); setActionComment(''); }}
                              className="flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 transition-colors cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Needs Revision</span>
                            </button>

                            <button
                              onClick={() => { setActionType('REJECT'); setActionComment(''); }}
                              className="flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>

                            <button
                              disabled={acting}
                              onClick={() => handleDecision(selected._id, 'APPROVED')}
                              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{acting ? 'Approving…' : 'Final Approve'}</span>
                            </button>
                          </>
                        )}

                        {/* REJECTED ACTIONS */}
                        {isRejected && (
                          <>
                            <button
                              disabled={acting}
                              onClick={() => handleDecision(selected._id, 'REOPEN')}
                              className="flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Clock className="w-3.5 h-3.5 text-slate-600" />
                              <span>Move Back to Pending</span>
                            </button>

                            <button
                              disabled={acting}
                              onClick={() => handleDecision(selected._id, 'APPROVED')}
                              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{acting ? 'Validating…' : 'Re-validate & Final Approve'}</span>
                            </button>
                          </>
                        )}

                        {/* APPROVED ACTIONS */}
                        {isApproved && (
                          <button
                            disabled={acting}
                            onClick={() => handleDecision(selected._id, 'REOPEN')}
                            className="flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Clock className="w-3.5 h-3.5 text-slate-600" />
                            <span>Re-open Review</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <FileText className="w-12 h-12 text-slate-300 mb-2" />
                <p className="font-bold text-sm text-slate-700">No Submission Selected</p>
                <p className="text-xs text-slate-400 mt-1">Select a research record from the list to preview proof & take action.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Fullscreen Document Modal ── */}
      <AnimatePresence>
        {isDocFullscreen && selected?.filePath && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col p-4"
          >
            <div className="flex items-center justify-between pb-3 text-white">
              <div>
                <h3 className="font-bold text-sm">{getItemTitle(selected)}</h3>
                <p className="text-xs text-slate-400">{selected.faculty?.name} · {selected.department} · {selected.category}</p>
              </div>
              <button
                onClick={() => setIsDocFullscreen(false)}
                className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-white rounded-2xl overflow-hidden shadow-2xl">
              <iframe
                src={getDocumentUrl(selected.filePath)}
                className="w-full h-full border-0"
                title="Fullscreen Research Preview"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
