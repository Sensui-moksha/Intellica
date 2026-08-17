import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, User, CheckCircle, MessageSquare, Loader2,
  XCircle, Clock, CheckCircle2, AlertTriangle, Search,
  Calendar, Maximize2, Minimize2, ExternalLink
} from 'lucide-react';
import { hodApi } from '../../api/services';
import { emitRealtimeEvent, subscribeToRealtimeEvent, SYNC_EVENTS } from '../../utils/syncEvents';

export default function HodApprovals() {
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED'
  const [pendingQueue, setPendingQueue]   = useState([]);
  const [approvedQueue, setApprovedQueue] = useState([]);
  const [rejectedQueue, setRejectedQueue] = useState([]);

  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState(false);
  const [search, setSearch]     = useState('');
  const [isDocFullscreen, setIsDocFullscreen] = useState(false);

  // Modals & Action Box
  const [actionType, setActionType] = useState(null); // null | 'DISCUSSION' | 'REJECT'
  const [actionComment, setActionComment] = useState('');

  const getDocumentUrl = (filePath) => {
    if (!filePath) return '';
    const cleanPath = filePath.replace(/^(\/?uploads\/)+/, '').replace(/^\/+/, '');
    return encodeURI(`/uploads/${cleanPath}`);
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
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        hodApi.getPendingUploads(),
        hodApi.getApprovedUploads(),
        hodApi.getRejectedUploads(),
      ]);

      const pList = Array.isArray(pendingRes.data) ? pendingRes.data : pendingRes.data?.uploads || [];
      const aList = Array.isArray(approvedRes.data) ? approvedRes.data : approvedRes.data?.uploads || [];
      const rList = Array.isArray(rejectedRes.data) ? rejectedRes.data : rejectedRes.data?.uploads || [];

      setPendingQueue(pList);
      setApprovedQueue(aList);
      setRejectedQueue(rList);

      setSelected(prev => {
        const curList = activeTab === 'PENDING' ? pList : activeTab === 'APPROVED' ? aList : rList;
        if (prev && curList.some(item => item._id === prev._id)) {
          return curList.find(item => item._id === prev._id);
        }
        return curList[0] || null;
      });
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData(true);

    // Fallback background soft-refresh every 25s (Socket.IO handles real-time push)
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
  }, [activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActionType(null);
    setActionComment('');
    if (tab === 'PENDING') setSelected(pendingQueue[0] || null);
    else if (tab === 'APPROVED') setSelected(approvedQueue[0] || null);
    else if (tab === 'REJECTED') setSelected(rejectedQueue[0] || null);
  };

  const handleDecision = async (id, decision) => {
    setActing(true);
    try {
      if (decision === 'APPROVED') {
        await hodApi.approveUpload(id);
      } else if (decision === 'REJECTED') {
        await hodApi.rejectUpload(id, { reason: actionComment || 'Rejected by HOD' });
      } else if (decision === 'REOPEN') {
        await hodApi.reopenUpload(id);
      } else if (decision === 'DISCUSSION') {
        await hodApi.discussUpload(id, { comment: actionComment, needsRevision: true });
      }

      setActionType(null);
      setActionComment('');

      // Dispatch global events across tabs & components
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

  const currentList = activeTab === 'PENDING'
    ? pendingQueue
    : activeTab === 'APPROVED'
      ? approvedQueue
      : rejectedQueue;

  const filteredList = currentList.filter(item => {
    const titleText = getItemTitle(item).toLowerCase();
    const query = search.toLowerCase();
    return (
      titleText.includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.faculty?.name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Department Approvals</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Review faculty research submissions for your department before submitting to Administration.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80 shrink-0">
          <button
            onClick={() => handleTabChange('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-white text-blue-600 shadow-sm'
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
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Forwarded / Approved</span>
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
                ? 'bg-white text-rose-600 shadow-sm'
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

      {loading ? (
        <div className="flex items-center justify-center h-80 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="flex gap-5 h-[calc(100vh-12rem)]">
          {/* Left Queue List */}
          <div className="w-84 shrink-0 flex flex-col gap-3 h-full">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, faculty…"
                className="w-full pl-10 pr-3 py-2.5 bg-white border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
                style={{ borderColor: '#e2e8f0' }}
              />
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
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSel
                          ? activeTab === 'REJECTED'
                            ? 'border-rose-300 bg-rose-50/70 shadow-sm'
                            : activeTab === 'APPROVED'
                              ? 'border-emerald-300 bg-emerald-50/70 shadow-sm'
                              : 'border-blue-300 bg-blue-50/70 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
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
                        <span className="truncate font-medium">{item.faculty?.name || 'Faculty Member'}</span>
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
                          <span className="text-[11px] font-bold text-blue-600">
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
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {activeTab === 'PENDING' ? 'All departmental submissions reviewed!' : `No ${activeTab.toLowerCase()} records.`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Document Review Pane */}
          {selected ? (
            <motion.div
              key={selected._id}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 flex flex-col gap-3 min-h-0 bg-white rounded-3xl border p-5 shadow-xs"
              style={{ borderColor: '#e2e8f0' }}
            >
              {/* Document Details Top Banner */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                      {selected.category}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Year: {selected.year || '2026'}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">{getItemTitle(selected)}</h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>Submitted By: <strong className="text-slate-800">{selected.faculty?.name || 'Faculty Member'}</strong></span>
                    <span>·</span>
                    <span>Department: <strong className="text-slate-800">{selected.department || 'Department'}</strong></span>
                    {selected.credits !== undefined && (
                      <>
                        <span>·</span>
                        <span>Credits: <strong className="text-blue-600">{selected.credits} Credits</strong></span>
                      </>
                    )}
                  </div>
                </div>

                {/* Header Right Badges & Fullscreen Controls */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {selected.filePath && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsDocFullscreen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                        title="View Fullscreen (or press Esc to exit)"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Full Screen</span>
                      </button>

                      <a
                        href={getDocumentUrl(selected.filePath)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        title="Open in new browser tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">New Tab</span>
                      </a>
                    </>
                  )}

                  {/* Status Pill */}
                  {['HOD_APPROVED', 'HOD_SUBMITTED', 'ADMIN_APPROVED'].includes(selected.status) && (
                    <div className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-1.5 shrink-0">
                      <CheckCircle2 className="w-4 h-4" /> Approved
                    </div>
                  )}
                  {['HOD_REJECTED', 'ADMIN_REJECTED', 'REJECTED'].includes(selected.status) && (
                    <div className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-1.5 shrink-0">
                      <XCircle className="w-4 h-4" /> Rejected
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection Banner if Rejected */}
              {selected.rejectionReason && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Rejection Reason ({selected.rejectedBy || 'Department'}):</p>
                    <p className="text-[11px] mt-0.5">{selected.rejectionReason}</p>
                  </div>
                </div>
              )}

              {/* Document Preview Frame */}
              <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden relative min-h-[500px]">
                {selected.filePath ? (
                  <iframe
                    src={getDocumentUrl(selected.filePath)}
                    className="w-full h-full rounded-2xl border-0"
                    title="Research Document Preview"
                  />
                ) : (
                  <div className="text-center p-8">
                    <FileText className="w-14 h-14 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-700 font-bold text-sm">{selected.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">Metadata recorded · No direct PDF attachment</p>
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
                      placeholder={actionType === 'REJECT' ? 'e.g. Incomplete documentation or incorrect indexing proof…' : 'e.g. Please clarify publication tier or upload certificate page…'}
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

              {/* Bottom Action Footer */}
              {!actionType && (() => {
                const isRejected = ['HOD_REJECTED', 'ADMIN_REJECTED', 'REJECTED'].includes(selected.status);
                const isApproved = ['HOD_APPROVED', 'HOD_SUBMITTED', 'ADMIN_APPROVED'].includes(selected.status);
                const isPending = !isRejected && !isApproved;

                return (
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-slate-400">
                      {isPending
                        ? 'Awaiting Departmental Review'
                        : isRejected
                          ? 'Status: Rejected by Authority'
                          : 'Status: Approved / Forwarded to Admin'}
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
                            <span>{acting ? 'Approving…' : 'Approve & Forward'}</span>
                          </button>
                        </>
                      )}

                      {/* REJECTED ACTIONS - NEVER SHOW REJECT AGAIN */}
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
                            <span>{acting ? 'Validating…' : 'Re-validate & Approve'}</span>
                          </button>
                        </>
                      )}

                      {/* APPROVED ACTIONS - NEVER SHOW APPROVE AGAIN */}
                      {isApproved && (
                        <>
                          <button
                            disabled={acting}
                            onClick={() => handleDecision(selected._id, 'REOPEN')}
                            className="flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Clock className="w-3.5 h-3.5 text-slate-600" />
                            <span>Re-open Review</span>
                          </button>

                          <button
                            onClick={() => { setActionType('REJECT'); setActionComment(''); }}
                            className="flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Revoke & Reject</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          ) : (
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 flex items-center justify-center p-8 text-center text-slate-400">
              <div>
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-400" />
                <p className="font-bold text-sm text-slate-700">No document selected</p>
                <p className="text-xs text-slate-400 mt-0.5">Select a submission from the list to preview and review.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Fullscreen Document Modal Overlay ── */}
      <AnimatePresence>
        {isDocFullscreen && selected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col p-3 md:p-5"
          >
            {/* Fullscreen Top Navigation Bar */}
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 mb-3 text-white shadow-2xl shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider bg-blue-600 text-white shadow-xs shrink-0">
                  {selected.category}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm md:text-base font-bold text-white truncate">{getItemTitle(selected)}</h3>
                  <p className="text-xs text-slate-400 truncate">
                    {selected.faculty?.name || 'Faculty Member'} · {selected.department || 'Department'} · Year: {selected.year || '2026'}
                    {selected.credits !== undefined && ` · ${selected.credits} Credits`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {selected.filePath && (
                  <a
                    href={getDocumentUrl(selected.filePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
                    title="Open in new browser tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Open in Tab</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsDocFullscreen(false)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 cursor-pointer active:scale-95"
                  title="Exit Fullscreen (Esc)"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Fullscreen</span>
                </button>
              </div>
            </div>

            {/* Fullscreen Iframe Document Body */}
            <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative shadow-2xl">
              {selected.filePath ? (
                <iframe
                  src={getDocumentUrl(selected.filePath)}
                  className="w-full h-full border-0 rounded-2xl"
                  title="Research Document Fullscreen Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <FileText className="w-16 h-16 text-slate-600 mb-3" />
                  <p className="font-bold text-slate-300">No Document Attachment</p>
                  <p className="text-xs text-slate-500 mt-1">Metadata only submission</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
