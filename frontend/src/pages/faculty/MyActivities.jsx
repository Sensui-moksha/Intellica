import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, CheckCircle2, XCircle, AlertTriangle,
  ChevronRight, Loader2, Eye, Edit3, UploadCloud,
  ExternalLink, Check, X, Send, BookOpen, Users,
  Award, ShieldCheck, Briefcase, Layers, Sparkles,
  Search, RotateCcw
} from 'lucide-react';
import { facultyApi } from '../../api/services';
import { emitRealtimeEvent, subscribeToRealtimeEvent, SYNC_EVENTS } from '../../utils/syncEvents';

const STATUS_STYLES = {
  ADMIN_APPROVED:   { color: '#065f46', bg: '#d1fae5', border: '#a7f3d0', label: 'Accepted (Credits Awarded)' },
  HOD_APPROVED:     { color: '#1e40af', bg: '#dbeafe', border: '#bfdbfe', label: 'Approved by HOD · In Admin Review' },
  APPROVED:         { color: '#065f46', bg: '#d1fae5', border: '#a7f3d0', label: 'Accepted' },
  FACULTY_SUBMITTED:{ color: '#92400e', bg: '#fef3c7', border: '#fde68a', label: 'Under Review by HOD' },
  HOD_SUBMITTED:    { color: '#1e40af', bg: '#dbeafe', border: '#bfdbfe', label: 'Pending Institutional Review' },
  PENDING:          { color: '#92400e', bg: '#fef3c7', border: '#fde68a', label: 'Pending Review' },
  NEEDS_REVISION:   { color: '#c2410c', bg: '#ffedd5', border: '#fed7aa', label: 'Needs Revision' },
  DISCUSSION:       { color: '#c2410c', bg: '#ffedd5', border: '#fed7aa', label: 'Discussion Requested' },
  ADMIN_REJECTED:   { color: '#991b1b', bg: '#fee2e2', border: '#fca5a5', label: 'Rejected by Admin' },
  HOD_REJECTED:     { color: '#991b1b', bg: '#fee2e2', border: '#fca5a5', label: 'Rejected by HOD' },
  REJECTED:         { color: '#991b1b', bg: '#fee2e2', border: '#fca5a5', label: 'Rejected' },
};

// Category Icon & Theme Mapping
const getCategoryMeta = (categoryName) => {
  const cat = (categoryName || '').toLowerCase();
  if (cat === 'book') {
    return { icon: BookOpen, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
  }
  if (cat === 'publication') {
    return { icon: FileText, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' };
  }
  if (cat === 'conference') {
    return { icon: Users, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
  }
  if (cat === 'ipr' || cat.includes('patent')) {
    return { icon: ShieldCheck, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
  }
  if (cat.includes('award') || cat.includes('honor') || cat === 'nptel') {
    return { icon: Award, color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  }
  if (cat === 'consultancy' || cat === 'incubation' || cat === 'researchproject') {
    return { icon: Briefcase, color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' };
  }
  return { icon: Layers, color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' };
};

export default function MyActivities() {
  const [activities, setActivities]       = useState([]);
  const [expandedId, setExpandedId]       = useState(null);
  const [loading, setLoading]             = useState(true);
  const userRole                          = localStorage.getItem('role') || 'FACULTY';

  // Category & Filter States
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus]     = useState('ALL');
  const [searchQuery, setSearchQuery]           = useState('');

  // Edit / Reapproval Modal State
  const [editingItem, setEditingItem]     = useState(null);
  const [editTitle, setEditTitle]         = useState('');
  const [editYear, setEditYear]           = useState(new Date().getFullYear());
  const [editFile, setEditFile]           = useState(null);
  const [editBookType, setEditBookType]   = useState('book_authored_intl');
  const [editPublisher, setEditPublisher] = useState('');
  const [editIsbn, setEditIsbn]           = useState('');
  const [resubmitting, setResubmitting]   = useState(false);
  const [successMsg, setSuccessMsg]       = useState('');
  const [errorMsg, setErrorMsg]           = useState('');

  // Fullscreen Preview State
  const [fullscreenDoc, setFullscreenDoc] = useState(null);

  const loadActivities = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await facultyApi.getMyUploads();
      const list = Array.isArray(res.data) ? res.data : res.data?.uploads || [];
      setActivities(list);
      if (list.length > 0 && !expandedId) {
        setExpandedId(list[0]._id);
      }
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities(true);

    // Live background polling every 5s + window focus + broadcast sync
    const interval = setInterval(() => loadActivities(false), 5000);
    const handleSync = () => loadActivities(false);

    const unsubBroadcast = subscribeToRealtimeEvent(SYNC_EVENTS.APPROVALS_UPDATED, handleSync);

    window.addEventListener('focus', handleSync);
    window.addEventListener('approvalsUpdated', handleSync);

    return () => {
      clearInterval(interval);
      unsubBroadcast();
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('approvalsUpdated', handleSync);
    };
  }, []);

  const getDocumentUrl = (filePath) => {
    if (!filePath) return '';
    const cleanPath = filePath.replace(/^(\/?uploads\/)+/, '').replace(/^\/+/, '');
    return encodeURI(`http://localhost:5001/uploads/${cleanPath}`);
  };

  const getReviewerComment = (act) => {
    if (!act) return '';
    const isApproved = act.status === 'ADMIN_APPROVED' || act.status === 'HOD_APPROVED' || act.status === 'APPROVED';
    if (isApproved) return '';
    return act.adminComment || act.hodComment || act.discussionComments || act.rejectionReason || '';
  };

  const getReviewerAuthority = (act) => {
    if (act.adminComment) return 'Institutional Admin';
    if (act.hodComment) return 'Department Head (HOD)';
    if (act.rejectedBy) return act.rejectedBy;
    return 'Reviewing Authority';
  };

  // Open Edit & Reapproval Modal
  const handleOpenEdit = (act) => {
    setEditingItem(act);
    setEditTitle(act.title || '');
    setEditYear(act.year || new Date().getFullYear());
    setEditBookType(act.metadata?.bookType || act.metadata?.ruleKey || 'book_authored_intl');
    setEditPublisher(act.metadata?.publisher || '');
    setEditIsbn(act.metadata?.isbn || '');
    setEditFile(null);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Handle Reapproval Request Submission
  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editTitle.trim()) {
      setErrorMsg('Please enter a valid document title.');
      return;
    }

    setResubmitting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('title', editTitle.trim());
      formData.append('year', editYear);
      if (editFile) {
        formData.append('file', editFile);
        formData.append('document', editFile);
      }

      if (editingItem.category?.toLowerCase() === 'book') {
        formData.append('bookType', editBookType);
        formData.append('ruleKey', editBookType);
        formData.append('publisher', editPublisher);
        formData.append('isbn', editIsbn);
      }

      await facultyApi.updateUpload(editingItem._id, editingItem.category, formData);
      const isFaculty = userRole === 'FACULTY';
      setSuccessMsg(
        isFaculty
          ? 'Reapproval request submitted! Forwarded to HOD for review, then Admin.'
          : 'Reapproval request submitted! Forwarded to Admin for review.'
      );

      // Dispatch global sync events for instant real-time sync across other tabs & components
      emitRealtimeEvent(SYNC_EVENTS.APPROVALS_UPDATED);
      emitRealtimeEvent(SYNC_EVENTS.NOTIFICATIONS_UPDATED);
      window.dispatchEvent(new CustomEvent('approvalsUpdated'));
      window.dispatchEvent(new CustomEvent('notificationUpdated'));

      setTimeout(() => {
        setEditingItem(null);
        setSuccessMsg('');
      }, 1800);
      await loadActivities(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit reapproval request. Please try again.');
    } finally {
      setResubmitting(false);
    }
  };

  // ── Calculate Category Statistics ──
  const categoryStatsMap = {};
  activities.forEach(act => {
    const cat = act.category || 'Others';
    if (!categoryStatsMap[cat]) {
      categoryStatsMap[cat] = {
        category: cat,
        totalCount: 0,
        approvedCount: 0,
        approvedCredits: 0,
        pendingCount: 0,
      };
    }
    categoryStatsMap[cat].totalCount += 1;
    const isAppr = act.status === 'ADMIN_APPROVED' || act.status === 'HOD_APPROVED' || act.status === 'APPROVED';
    if (isAppr) {
      categoryStatsMap[cat].approvedCount += 1;
      categoryStatsMap[cat].approvedCredits += (Number(act.credits) || 0);
    } else {
      categoryStatsMap[cat].pendingCount += 1;
    }
  });

  const categoryStatsList = Object.values(categoryStatsMap).sort((a, b) => b.totalCount - a.totalCount);
  const totalEarnedCredits = activities
    .filter(a => a.status === 'ADMIN_APPROVED' || a.status === 'APPROVED')
    .reduce((sum, a) => sum + (Number(a.credits) || 0), 0);

  // ── Filtered Activities List ──
  const filteredActivities = activities.filter(act => {
    // 1. Category Filter
    if (selectedCategory !== 'ALL' && (act.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    // 2. Status Filter
    if (selectedStatus === 'APPROVED') {
      if (act.status !== 'ADMIN_APPROVED' && act.status !== 'APPROVED') return false;
    } else if (selectedStatus === 'HOD_APPROVED') {
      if (act.status !== 'HOD_APPROVED') return false;
    } else if (selectedStatus === 'PENDING') {
      if (!['FACULTY_SUBMITTED', 'HOD_SUBMITTED', 'PENDING'].includes(act.status)) return false;
    } else if (selectedStatus === 'REVISION') {
      if (!['NEEDS_REVISION', 'DISCUSSION'].includes(act.status)) return false;
    } else if (selectedStatus === 'REJECTED') {
      if (!['ADMIN_REJECTED', 'HOD_REJECTED', 'REJECTED'].includes(act.status)) return false;
    }
    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (act.title || '').toLowerCase().includes(q);
      const catMatch = (act.category || '').toLowerCase().includes(q);
      const yearMatch = (act.year || '').toString().includes(q);
      if (!titleMatch && !catMatch && !yearMatch) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading your research activities…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Activities</h1>
          <p className="text-slate-500 text-xs mt-1">
            Click any category card to filter submissions, track approval statuses, and manage reapproval requests.
          </p>
        </div>

        <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-center gap-2 shadow-2xs">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-xs text-slate-600 font-semibold">Total Verified Credits:</span>
          <span className="text-xs font-black text-blue-700">{totalEarnedCredits} Credits</span>
        </div>
      </div>

      {/* ── 📚 INTERACTIVE CATEGORY CARDS (CLICK TO FILTER) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* All Activities Card */}
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedCategory('ALL')}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            selectedCategory === 'ALL'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-blue-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-2xl ${selectedCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
              <Layers className="w-4 h-4" />
            </div>
            {selectedCategory === 'ALL' && (
              <span className="text-[10px] font-black bg-white/25 text-white px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          <div>
            <h4 className={`text-xs font-bold ${selectedCategory === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
              All Activities
            </h4>
            <p className={`text-[11px] font-medium mt-0.5 ${selectedCategory === 'ALL' ? 'text-blue-100' : 'text-slate-400'}`}>
              {activities.length} Submissions · {totalEarnedCredits} pts
            </p>
          </div>
        </motion.button>

        {/* Dynamic Category Specific Cards (e.g. Book, Publication, Conference) */}
        {categoryStatsList.map((stat) => {
          const meta = getCategoryMeta(stat.category);
          const IconComponent = meta.icon;
          const isSelected = selectedCategory.toLowerCase() === stat.category.toLowerCase();

          return (
            <motion.button
              key={stat.category}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCategory(isSelected ? 'ALL' : stat.category)}
              className={`p-4 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20 ring-2 ring-slate-700/40'
                  : 'bg-white text-slate-800 border-slate-200/80 hover:border-blue-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="p-2 rounded-2xl"
                  style={{
                    background: isSelected ? 'rgba(255,255,255,0.15)' : meta.bg,
                    color: isSelected ? '#ffffff' : meta.color
                  }}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
                {isSelected && (
                  <span className="text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <div>
                <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {stat.category}
                </h4>
                <p className={`text-[11px] font-medium mt-0.5 truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                  {stat.totalCount} {stat.totalCount === 1 ? 'file' : 'files'} · <span className={isSelected ? 'text-emerald-300 font-bold' : 'text-emerald-600 font-bold'}>{stat.approvedCredits} pts</span>
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between flex-wrap gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Search in ${selectedCategory === 'ALL' ? 'all submissions' : selectedCategory}...`}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 transition-all"
            style={{ borderColor: '#e2e8f0' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: 'ALL', label: 'All' },
            { key: 'APPROVED', label: 'Accepted' },
            { key: 'HOD_APPROVED', label: 'HOD Approved' },
            { key: 'PENDING', label: 'In Review' },
            { key: 'REVISION', label: 'Needs Revision' },
            { key: 'REJECTED', label: 'Rejected' },
          ].map(st => (
            <button
              key={st.key}
              onClick={() => setSelectedStatus(st.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === st.key
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800'
              }`}
            >
              {st.label}
            </button>
          ))}

          {(selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
              title="Reset all filters"
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ml-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Feedback Indicator */}
      {selectedCategory !== 'ALL' && (
        <div className="flex items-center justify-between text-xs px-2 text-slate-500 font-medium">
          <span>
            Showing <strong>{filteredActivities.length}</strong> {selectedCategory} submission{filteredActivities.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className="text-blue-600 hover:underline font-bold cursor-pointer"
          >
            Show All Activities
          </button>
        </div>
      )}

      {/* ── ACTIVITY CARDS LIST ── */}
      <div className="space-y-4">
        {filteredActivities.map((act) => {
          const s = STATUS_STYLES[act.status] || STATUS_STYLES.PENDING;
          const isExpanded = expandedId === act._id;
          const comment = getReviewerComment(act);
          const authority = getReviewerAuthority(act);
          const needsRevision = act.status === 'NEEDS_REVISION' || act.status === 'DISCUSSION';
          const isRejected = ['ADMIN_REJECTED', 'HOD_REJECTED', 'REJECTED'].includes(act.status);
          const isApproved = ['ADMIN_APPROVED', 'HOD_APPROVED', 'APPROVED'].includes(act.status);
          const catMeta = getCategoryMeta(act.category);
          const IconComponent = catMeta.icon;

          return (
            <motion.div
              key={act._id}
              layout
              className="bg-white rounded-3xl border overflow-hidden shadow-xs transition-all"
              style={{
                borderColor: needsRevision ? '#fed7aa' : isRejected ? '#fecdd3' : isApproved ? '#a7f3d0' : isExpanded ? '#bfdbfe' : '#e8edf5',
                boxShadow: isExpanded ? '0 10px 25px -5px rgba(37, 99, 235, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              {/* Card Header Accordion Trigger */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : act._id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`p-3 rounded-2xl shrink-0 ${
                    needsRevision
                      ? 'bg-amber-100 text-amber-700'
                      : isApproved
                        ? 'bg-emerald-100 text-emerald-700'
                        : isRejected
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-50 text-blue-600'
                  }`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{act.title}</h3>
                    <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-400 flex-wrap">
                      <span className="font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                        {act.category}
                      </span>
                      {act.subcategory && (
                        <span className="font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] border border-blue-200/60">
                          {act.subcategory}
                        </span>
                      )}
                      <span>•</span>
                      <span>{new Date(act.createdAt).toLocaleDateString('en-GB')}</span>
                      {act.year && <span>• Year: {act.year}</span>}
                      {act.credits !== undefined && act.credits > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-bold text-blue-600">{act.credits} Credits</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5"
                    style={{ background: s.bg, color: s.color, borderColor: s.border }}
                  >
                    {needsRevision && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                    {isApproved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {isRejected && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                    <span>{s.label}</span>
                  </span>
                  <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </motion.div>
                </div>
              </button>

              {/* Expanded Card Body */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="expanded-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-6 pt-2 border-t space-y-4" style={{ borderColor: '#f1f5f9' }}>
                      
                      {/* ── 1. REVISION REQUIRED PROMINENT ALERT BANNER ── */}
                      {needsRevision && (
                        <div className="p-4.5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl text-xs space-y-3 shadow-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Revision Requested by {authority}</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase tracking-wider">
                              Action Required
                            </span>
                          </div>

                          {comment && (
                            <div className="p-3 bg-white/95 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                              <span className="text-[11px] font-semibold text-slate-500 block">Reviewer's Feedback:</span>
                              <p className="text-xs font-bold text-slate-900 italic">"{comment}"</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                            <p className="text-[11px] text-amber-800 font-medium">
                              Please upload a replacement/corrected PDF document and submit a reapproval request.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(act)}
                              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-amber-500/25 flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Reapproval Request (Upload New PDF / Edit)</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── 2. REJECTION NOTICE BANNER ── */}
                      {isRejected && (
                        <div className="p-4.5 bg-gradient-to-r from-rose-50 to-red-50 border-2 border-rose-300 rounded-2xl text-xs space-y-2.5 shadow-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-rose-950 text-sm">
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>Submission Rejected</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 uppercase tracking-wider">
                              Rejected
                            </span>
                          </div>

                          {comment && (
                            <div className="p-3 bg-white/95 rounded-xl border border-rose-200 space-y-1">
                              <span className="text-[11px] font-semibold text-slate-500 block">Reason for Rejection:</span>
                              <p className="text-xs font-bold text-rose-900">"{comment}"</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                            <p className="text-[11px] text-rose-700">
                              This submission was not approved for credit evaluation. You may submit a corrected proposal if eligible.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(act)}
                              className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Resubmit as Revision</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── 3A. HOD APPROVED (AWAITING ADMIN APPROVAL) BANNER ── */}
                      {act.status === 'HOD_APPROVED' && (
                        <div className="p-4.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl text-xs space-y-2 shadow-xs text-blue-950">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-sm">
                              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>Department HOD Review Approved!</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-200 text-blue-900 uppercase tracking-wider">
                              In Admin Review
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-white/95 border border-blue-200/80 rounded-xl text-xs flex-wrap gap-2">
                            <div>
                              <p className="font-semibold text-slate-800">
                                Accepted at department level by HOD. Forwarded to Institutional Administration for final verification.
                              </p>
                            </div>
                            {act.credits !== undefined && act.credits > 0 && (
                              <span className="font-black text-blue-800 bg-blue-100 px-3 py-1.5 rounded-xl text-xs shrink-0">
                                +{act.credits} Credits (Pending Final Admin Approval)
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── 3B. FINAL ADMIN APPROVED & CREDITS AWARDED BANNER ── */}
                      {(act.status === 'ADMIN_APPROVED' || act.status === 'APPROVED') && (
                        <div className="p-4.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl text-xs space-y-2 shadow-xs text-emerald-950">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-sm">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Submission Accepted & Institutional Credits Approved!</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 uppercase tracking-wider">
                              Accepted & Approved
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-white/95 border border-emerald-200 rounded-xl text-xs flex-wrap gap-2">
                            <div>
                              <p className="font-semibold text-slate-800">
                                Verified by Institutional Authority. Credits have been recorded to your profile and department totals.
                              </p>
                            </div>
                            {act.credits !== undefined && act.credits > 0 && (
                              <span className="font-black text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl text-xs shrink-0">
                                +{act.credits} Credits Awarded
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Submission Details & Attached Document Links */}
                      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200/70 text-xs text-slate-600 flex-wrap gap-3">
                        <div className="space-y-1">
                          <p><strong>Department:</strong> {act.department || 'General'}</p>
                          <p>
                            <strong>Workflow Status:</strong>{' '}
                            <span className="font-bold text-slate-800">
                              {isApproved ? 'ACCEPTED' : isRejected ? 'REJECTED' : needsRevision ? 'NEEDS REVISION' : act.status}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {act.filePath ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setFullscreenDoc(act)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                <span>Preview Attached PDF</span>
                              </button>
                              <a
                                href={getDocumentUrl(act.filePath)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                <span>Open in Tab</span>
                              </a>
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs">No file attachment</span>
                          )}

                          {!isApproved && !needsRevision && !isRejected && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(act)}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Edit Details</span>
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {filteredActivities.length === 0 && (
          <div className="bg-white rounded-3xl border p-12 text-center text-slate-400" style={{ borderColor: '#e8edf5' }}>
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-700 text-sm">
              {selectedCategory !== 'ALL'
                ? `No ${selectedCategory} submissions found`
                : 'No research submissions found'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {selectedCategory !== 'ALL'
                ? `You haven't submitted any ${selectedCategory} proposals yet.`
                : 'Submit your proposals using the sidebar button to begin tracking credits.'}
            </p>
            {selectedCategory !== 'ALL' && (
              <button
                onClick={() => setSelectedCategory('ALL')}
                className="mt-3 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                Clear Category Filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── EDIT & REAPPROVAL REQUEST MODAL (UPLOAD NEW PDF) ── */}
      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border p-6 space-y-5 max-h-[90vh] overflow-y-auto"
              style={{ borderColor: '#e2e8f0' }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/25">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Reapproval Request</h3>
                    <p className="text-xs text-slate-500">Edit submission details & upload revised PDF</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Reviewer's note / rejection reason reminder */}
              {getReviewerComment(editingItem) && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1.5">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Feedback from {getReviewerAuthority(editingItem)}:
                  </span>
                  <p className="text-slate-900 font-semibold p-2 bg-white rounded-xl border border-amber-200/70">
                    "{getReviewerComment(editingItem)}"
                  </p>
                </div>
              )}

              {/* Success / Error Alerts */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Edit Form */}
              <form onSubmit={handleResubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Category</label>
                  <input
                    type="text"
                    disabled
                    value={editingItem.category}
                    className="w-full px-3.5 py-2.5 bg-slate-100 border rounded-2xl text-xs font-bold text-slate-600 outline-none"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Document / Activity Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="e.g. Corrected research paper or book title"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 transition-all"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Year</label>
                  <input
                    type="number"
                    min="2000"
                    max="2030"
                    value={editYear}
                    onChange={e => setEditYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800 transition-all"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>

                {/* Book Specific Fields if Category is Book */}
                {editingItem.category?.toLowerCase() === 'book' && (
                  <div className="p-3.5 bg-blue-50/50 border border-blue-200/80 rounded-2xl space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Book / Publication Type <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={editBookType}
                        onChange={e => setEditBookType(e.target.value)}
                        className="w-full px-3.5 py-2.5 border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 transition-all cursor-pointer shadow-2xs"
                        style={{ borderColor: '#cbd5e1' }}
                      >
                        <option value="book_authored_intl">
                          Authored Book — International Publisher (IEEE, Springer, Elsevier, Wiley) [30 Credits]
                        </option>
                        <option value="book_authored_natl">
                          Authored Book — National / Reputed Publisher (ISBN) [20 Credits]
                        </option>
                        <option value="edited_volume">
                          Edited Volume / Proceedings [25 Credits]
                        </option>
                        <option value="book_chapter">
                          Book Chapter Contribution [10 Credits]
                        </option>
                        <option value="default_book">
                          Standard Academic Book [25 Credits]
                        </option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Publisher (e.g. IEEE, Springer)</label>
                        <input
                          type="text"
                          value={editPublisher}
                          onChange={e => setEditPublisher(e.target.value)}
                          placeholder="e.g. IEEE / Springer Nature"
                          className="w-full px-3 py-2 border rounded-xl text-xs bg-white text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ borderColor: '#cbd5e1' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">ISBN Number</label>
                        <input
                          type="text"
                          value={editIsbn}
                          onChange={e => setEditIsbn(e.target.value)}
                          placeholder="e.g. 978-0-123456-47-2"
                          className="w-full px-3 py-2 border rounded-xl text-xs bg-white text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ borderColor: '#cbd5e1' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload New / Replacement PDF File */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Upload New / Revised PDF File
                  </label>
                  <div className="p-4 border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-2xl text-center bg-blue-50/40 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg"
                      onChange={e => setEditFile(e.target.files[0] || null)}
                      className="hidden"
                      id="resubmit-file"
                    />
                    <label htmlFor="resubmit-file" className="cursor-pointer block space-y-1.5">
                      <UploadCloud className="w-7 h-7 text-blue-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-800">
                        {editFile ? editFile.name : 'Click or Drag to Upload Revised PDF'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {editFile
                          ? `${(editFile.size / 1024 / 1024).toFixed(2)} MB · Selected`
                          : 'Leave blank to keep your current document'}
                      </p>
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-[11px] text-slate-500 space-y-1">
                  <span className="font-bold text-slate-700 block">Approval Workflow:</span>
                  <p>
                    {userRole === 'FACULTY'
                      ? '1. Your updated proposal and PDF will be forwarded to your Department HOD for review, followed by Institutional Admin.'
                      : '1. Your updated proposal will be forwarded directly to Institutional Admin for final approval.'}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resubmitting}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{resubmitting ? 'Submitting…' : 'Submit Reapproval Request'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FULLSCREEN DOCUMENT PREVIEW MODAL ── */}
      <AnimatePresence>
        {fullscreenDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col p-4 md:p-6"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-3 text-white border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-600 text-white">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm truncate max-w-md">{fullscreenDoc.title}</h3>
                  <p className="text-[11px] text-slate-300">
                    {fullscreenDoc.category} · {fullscreenDoc.department || 'Department'} · {fullscreenDoc.year || '2026'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={getDocumentUrl(fullscreenDoc.filePath)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={() => setFullscreenDoc(null)}
                  className="p-2 bg-white/10 hover:bg-rose-600 text-white rounded-xl transition-colors cursor-pointer"
                  title="Close Fullscreen (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Iframe / Viewer */}
            <div className="flex-1 w-full h-full mt-3 rounded-2xl overflow-hidden bg-slate-800 border border-white/10">
              <iframe
                src={getDocumentUrl(fullscreenDoc.filePath)}
                title={fullscreenDoc.title}
                className="w-full h-full border-0"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
