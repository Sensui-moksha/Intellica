import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Target, Sparkles, AlertCircle, CheckCircle2,
  BookOpen, FileText, Send, Clock, ArrowRight,
  Calendar, Trophy, Award, Bookmark, ExternalLink,
  Building2, Shield, MapPin, Users, TrendingUp, BarChart2, Calculator
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { facultyApi, rankingApi, authApi, activityApi, pbasApi } from '../../api/services';
import { resolveProfileImageUrl } from '../../components/Header';
import { subscribeToRealtimeEvent, SYNC_EVENTS } from '../../utils/syncEvents';
import PBASAppraisalModal from '../../components/pbas/PBASAppraisalModal';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return { salutation: 'Good morning', icon: '☀️', message: 'Ready to submit research and achieve your academic milestones today?' };
  if (hour >= 12 && hour < 17) return { salutation: 'Good afternoon', icon: '☀️', message: 'Here is your real-time academic standing & credit target.' };
  if (hour >= 17 && hour < 22) return { salutation: 'Good evening', icon: '🌙', message: 'Review today\'s approved credits and upcoming department milestones.' };
  return { salutation: 'Good night', icon: '🌙', message: 'Academic credit and faculty research portal.' };
};

export default function FacultyDashboard() {
  const [profile, setProfile]       = useState(null);
  const [uploads, setUploads]       = useState([]);
  const [rank, setRank]             = useState(null);
  const [rankings, setRankings]     = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showPBAS, setShowPBAS]     = useState(false);
  const [pbasScore, setPbasScore]   = useState(null);

  const fetchAll = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [profileRes, uploadsRes, rankRes, meRes, actRes, rankingsRes] = await Promise.all([
        facultyApi.getProfile().catch(() => null),
        facultyApi.getMyUploads().catch(() => ({ data: [] })),
        rankingApi.getMyRank().catch(() => ({ data: null })),
        authApi.getMe().catch(() => null),
        activityApi.getActivities().catch(() => ({ data: { activities: [] } })),
        rankingApi.getRankings().catch(() => ({ data: [] }))
      ]);
      const mergedProfile = {
        ...(profileRes?.data || {}),
        profileImage: meRes?.data?.profileImage || profileRes?.data?.profileImage || localStorage.getItem('profileImage') || ''
      };
      if (mergedProfile.profileImage) {
        localStorage.setItem('profileImage', mergedProfile.profileImage);
      }
      setProfile(mergedProfile);
      const uList = Array.isArray(uploadsRes?.data) ? uploadsRes.data : uploadsRes?.data?.uploads || [];
      setUploads(uList);
      setRank(rankRes?.data);
      const rankList = Array.isArray(rankingsRes?.data) ? rankingsRes.data : rankingsRes?.data?.rankings || [];
      setRankings(rankList);
      const actList = actRes?.data?.activities || actRes?.data || [];
      setActivities(actList);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Fetch PBAS score (separate from main fetch to avoid coupling)
  const fetchPBASScore = async () => {
    try {
      const meRes = await authApi.getMe().catch(() => null);
      const myId = meRes?.data?._id || meRes?.data?.id;
      if (myId) {
        const scoreRes = await pbasApi.getFacultyScore(myId).catch(() => null);
        if (scoreRes?.data?.score) setPbasScore(scoreRes.data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchAll(false);
    fetchPBASScore();

    // Realtime subscriptions
    const unsubActivities = subscribeToRealtimeEvent(SYNC_EVENTS.ACTIVITIES_UPDATED, () => fetchAll(true));
    const unsubApprovals = subscribeToRealtimeEvent(SYNC_EVENTS.APPROVALS_UPDATED, () => fetchAll(true));
    const unsubProfile = subscribeToRealtimeEvent(SYNC_EVENTS.PROFILE_UPDATED, () => fetchAll(true));

    // Update on focus
    const handleFocus = () => fetchAll(true);
    window.addEventListener('focus', handleFocus);

    // Heartbeat silent sync every 10s
    const interval = setInterval(() => fetchAll(true), 10000);

    return () => {
      unsubActivities();
      unsubApprovals();
      unsubProfile();
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const approvedUploads = uploads.filter(
    u => u.status === 'ADMIN_APPROVED' || u.status === 'HOD_APPROVED' || u.status === 'APPROVED'
  );
  const myApprovedCredits = approvedUploads.reduce((sum, u) => sum + (Number(u.credits) || 0), 0);

  const pendingCount = uploads.filter(
    u => u.status === 'FACULTY_SUBMITTED' || u.status === 'HOD_SUBMITTED' || u.status === 'PENDING'
  ).length;

  const revisionCount = uploads.filter(
    u => u.status === 'NEEDS_REVISION' || u.status === 'ADMIN_COMMENT' || u.status === 'HOD_COMMENT'
  ).length;

  const [imgError, setImgError] = useState(false);
  const facultyDept = (profile?.department || localStorage.getItem('department') || 'CSE').toUpperCase();
  const displayName = profile?.name || localStorage.getItem('userName') || 'Faculty';
  const userInitial = (displayName || 'F').charAt(0).toUpperCase();
  const profileImg = profile?.profileImage || localStorage.getItem('profileImage');
  const profileImgUrl = resolveProfileImageUrl(profileImg);
  const greeting = getGreeting();

  // 1. My Personal Earned Credits
  const myMemberData = rankings.find(
    r => r.facultyId === profile?._id ||
         (r.name?.toLowerCase() === displayName.toLowerCase() && (r.department || '').toUpperCase() === facultyDept)
  );
  const myEarnedCredits = myMemberData?.totalCredits || myApprovedCredits || profile?.totalCredits || 0;

  // 2. Department Members & Standings within Faculty Department
  const deptMembers = rankings.filter(
    r => (r.department || '').toUpperCase() === facultyDept
  );

  // Ensure logged-in faculty is included in deptMembers
  if (profile && !deptMembers.some(m => m.facultyId === profile._id || (m.name?.toLowerCase() === displayName.toLowerCase() && (m.department || '').toUpperCase() === facultyDept))) {
    deptMembers.push({
      facultyId: profile._id,
      name: displayName,
      department: facultyDept,
      designation: profile.designation || 'Faculty Member',
      createdByRole: 'FACULTY',
      totalCredits: myEarnedCredits
    });
  }

  // 3. Sorted Department Members (Highlight Neil / Current Faculty)
  const sortedDeptMembers = [...deptMembers]
    .sort((a, b) => (b.totalCredits || 0) - (a.totalCredits || 0));
  const myFacultyRankIndex = sortedDeptMembers.findIndex(
    m => m.facultyId === profile?._id || m.name?.toLowerCase() === displayName.toLowerCase()
  );
  const myFacultyRank = myFacultyRankIndex >= 0 ? myFacultyRankIndex + 1 : 1;
  const totalDeptMembers = sortedDeptMembers.length || 1;
  const rankDisplay = `${myFacultyRank}/${totalDeptMembers}`;

  const top6DeptMembers = sortedDeptMembers.slice(0, 6);
  const isMyRankOutsideTop6 = myFacultyRankIndex >= 6;

  const displayActivities = activities.slice(0, 4);

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading your faculty dashboard…</p>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6 pb-12">
      
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#070f23] via-[#0e1d45] to-[#142e6b] text-white p-6 sm:p-8 shadow-2xl border border-indigo-900/30"
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <img
            src="/college-campus.png"
            alt="DVR & Dr. HS MIC College of Technology"
            className="w-full h-full object-cover object-[center_30%] opacity-45 mix-blend-luminosity"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.05) 15%, rgba(0, 0, 0, 0.5) 45%, rgba(0, 0, 0, 0.95) 85%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.05) 15%, rgba(0, 0, 0, 0.5) 45%, rgba(0, 0, 0, 0.95) 85%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070f23] via-[#0e1d45]/60 to-[#142e6b]/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070f23]/60 via-transparent to-[#070f23]/25" />
          <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute -right-36 -bottom-36 w-120 h-120 rounded-full border border-white/5 pointer-events-none" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {profileImgUrl && !imgError ? (
                <img
                  src={profileImgUrl}
                  alt={displayName}
                  onError={() => setImgError(true)}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-white/15 shadow-xl border border-white/20"
                />
              ) : (
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 text-white font-black text-3xl sm:text-4xl flex items-center justify-center ring-4 ring-white/15 shadow-xl border border-white/20">
                  {userInitial}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-[#0f172a] rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-xs" title="Active">
                ✓
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>{greeting.icon}</span>
                <span>{greeting.salutation},</span>
              </span>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Welcome back, {displayName}!</span>
                <span className="inline-block hover:rotate-12 transition-transform cursor-default">👋</span>
              </h1>

              <div className="pt-0.5">
                <span className="inline-block px-3 py-0.5 rounded-full bg-white/10 text-white border border-white/20 text-[10px] font-black tracking-wider uppercase">
                  {profile?.designation || 'FACULTY MEMBER'}
                </span>
              </div>

              <p className="text-xs text-slate-300 font-medium pt-0.5">
                Department of {facultyDept} • Academic Year {new Date().getFullYear()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end flex-wrap shrink-0">
            <Link
              to="/faculty/upload"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Proposal</span>
            </Link>
            <Link
              to="/faculty/my-activities"
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>My Activities ({uploads.length})</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {revisionCount > 0 && (
        <motion.div variants={itemVariants}>
          <Link
            to="/faculty/my-activities"
            className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between hover:bg-amber-100/70 transition-colors shadow-2xs group"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-900">
                You have {revisionCount} submission{revisionCount > 1 ? 's' : ''} requesting revision. Click to review feedback & re-submit.
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-700 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'My Earned Credits',
            value: myEarnedCredits.toString(),
            unit: 'pts',
            subtext: 'This Year',
            icon: Sparkles,
            color: '#2563eb',
            bg: '#dbeafe'
          },
          {
            label: 'Your Rank in Dept',
            value: rankDisplay,
            unit: 'Rank',
            subtext: `Standing in ${facultyDept}`,
            icon: Trophy,
            color: '#059669',
            bg: '#d1fae5'
          },
          {
            label: 'Approved Activities',
            value: approvedUploads.length.toString(),
            unit: 'verified',
            subtext: 'Validated Proofs',
            icon: CheckCircle2,
            color: '#7c3aed',
            bg: '#ede9fe'
          },
          {
            label: 'Pending Reviews',
            value: pendingCount.toString(),
            unit: 'in pipeline',
            subtext: 'Requires Review',
            icon: Clock,
            color: '#d97706',
            bg: '#fef3c7'
          },
        ].map((s, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            whileHover={{ y: -2 }}
            className="bg-white rounded-3xl p-5 border flex flex-col justify-between hover:shadow-md transition-all shadow-xs"
            style={{ borderColor: '#e8edf5' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-500">{s.label}</span>
              <div className="p-2.5 rounded-2xl" style={{ background: s.bg }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <h3 className="text-2xl font-black text-slate-900">{s.value}</h3>
                <span className="text-[11px] font-bold text-slate-400">{s.unit}</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400">{s.subtext}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── PBAS Appraisal Card ── */}
      <motion.div
        variants={itemVariants}
        whileHover={{ y: -2 }}
        onClick={() => setShowPBAS(true)}
        className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 rounded-3xl p-5 border border-indigo-200/60 flex items-center justify-between hover:shadow-md transition-all shadow-xs cursor-pointer group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors">PBAS Appraisal</h3>
            <p className="text-[10px] font-semibold text-slate-400">Performance Based Appraisal System • Score out of 1000</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pbasScore?.score ? (
            <div className="text-right">
              <p className="text-lg font-black text-indigo-700 tabular-nums">{pbasScore.score.total?.toFixed(1) || '—'}<span className="text-xs font-bold text-slate-400"> / 1000</span></p>
              <p className="text-[10px] font-bold text-slate-400">{pbasScore.academicYear} • {pbasScore.status}</p>
            </div>
          ) : (
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200/60">Start Appraisal →</span>
          )}
        </div>
      </motion.div>

      {/* PBAS Modal */}
      <PBASAppraisalModal
        isOpen={showPBAS}
        onClose={() => { setShowPBAS(false); fetchPBASScore(); }}
        facultyName={displayName}
        designation={profile?.designation}
        facultyId={profile?._id}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-3xl p-6 border shadow-xs flex flex-col justify-between"
          style={{ borderColor: '#e8edf5' }}
        >
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <div>
                  <h3 className="text-sm font-black text-slate-900">Department Faculty & HOD Standing</h3>
                  <p className="text-[11px] text-slate-400">Research points earned within {facultyDept} (Top 6)</p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200/60">
                {totalDeptMembers} Members
              </span>
            </div>

            <div className="space-y-2">
              {top6DeptMembers.map((f, i) => {
                const isMe = f.facultyId === profile?._id || f.name?.toLowerCase() === displayName.toLowerCase();
                const isHOD = f.createdByRole === 'HOD' || f.designation?.includes('HOD');
                return (
                  <div
                    key={f.facultyId || i}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition-colors ${
                      isMe
                        ? 'bg-blue-50/70 border-blue-300/80 shadow-2xs'
                        : 'hover:bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-xs font-black w-5 text-center ${
                        i === 0 ? 'text-amber-500 font-black' : i === 1 ? 'text-slate-500 font-black' : i === 2 ? 'text-amber-700 font-black' : 'text-slate-400'
                      }`}>
                        #{i + 1}
                      </span>
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isMe ? 'bg-blue-600 text-white' : isHOD ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {f.name?.charAt(0) || 'F'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs font-bold ${isMe ? 'text-blue-950 font-black' : 'text-slate-900'}`}>{f.name}</p>
                          {isMe && (
                            <span className="text-[9px] bg-blue-600 text-white font-black px-1.5 py-0.2 rounded-md">
                              You
                            </span>
                          )}
                          {isHOD && !isMe && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.2 rounded-md border border-indigo-200">
                              HOD
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">{f.designation || 'Faculty Member'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-900">
                      {(f.totalCredits || 0).toLocaleString()} pts
                    </span>
                  </div>
                );
              })}

              {isMyRankOutsideTop6 && (
                <>
                  <div className="py-1 text-center text-[10px] text-slate-400 font-bold tracking-widest">• • •</div>
                  <div className="flex items-center justify-between p-2.5 rounded-2xl border bg-blue-50/70 border-blue-300/80 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-black text-blue-600 w-5 text-center">
                        #{myFacultyRank}
                      </span>
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs bg-blue-600 text-white">
                        {displayName?.charAt(0) || 'F'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-blue-950">{displayName}</p>
                          <span className="text-[9px] bg-blue-600 text-white font-black px-1.5 py-0.2 rounded-md">
                            You
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">{profile?.designation || 'Faculty Member'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-900">
                      {myEarnedCredits.toLocaleString()} pts
                    </span>
                  </div>
                </>
              )}

              {sortedDeptMembers.length === 0 && (
                <p className="text-xs text-slate-400 py-6 text-center">No member research data yet.</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Right: Upcoming Department Activities (Planned by HOD) */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-3xl p-6 border shadow-xs space-y-4 flex flex-col justify-between"
          style={{ borderColor: '#e8edf5' }}
        >
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-900">Upcoming Department Activities</h3>
                  <p className="text-[11px] text-slate-400">Scheduled events & meetings</p>
                </div>
              </div>
              <Link
                to="/faculty/calendar"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Calendar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3 pt-2">
              {displayActivities.length > 0 ? (
                displayActivities.map((act, i) => {
                  const isAdminActivity = act.createdByRole === 'ADMIN' || act.targetAudience === 'ALL_HODS';
                  const hasLink = act.link || (act.venue && (act.venue.startsWith('http') || act.venue.includes('meet.google.com') || act.venue.includes('zoom.us')));
                  const targetUrl = act.link || (hasLink ? (act.venue.startsWith('http') ? act.venue : `https://${act.venue}`) : null);
                  const formattedDate = act.date ? new Date(act.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

                  return (
                    <div
                      key={act._id || i}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between group shadow-2xs ${
                        isAdminActivity
                          ? 'border-l-4 border-l-purple-600 border-slate-200/90 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/20 hover:border-purple-300'
                          : 'border-l-4 border-l-blue-600 border-slate-200/90 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/30 hover:border-blue-300'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isAdminActivity ? (
                            <>
                              <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-purple-600 text-white flex items-center gap-1 shadow-2xs">
                                <Shield className="w-2.5 h-2.5" /> Institutional
                              </span>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60">
                                Target: All Department HODs
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-blue-600 text-white flex items-center gap-1 shadow-2xs">
                                <Building2 className="w-2.5 h-2.5" /> Dept Internal
                              </span>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                                By HOD ({facultyDept} Faculty)
                              </span>
                            </>
                          )}
                        </div>

                        <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                          {act.title}
                        </h4>

                        {act.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {act.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold pt-2 mt-2 border-t border-slate-100/80">
                        <div className="flex items-center gap-2">
                          {formattedDate && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Calendar className="w-3 h-3 text-blue-500" />
                              {formattedDate} {act.time ? `• ${act.time}` : ''}
                            </span>
                          )}
                          {act.venue && (
                            <span className="flex items-center gap-1 text-slate-500 truncate max-w-[130px]">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {act.venue}
                            </span>
                          )}
                        </div>

                        {targetUrl && (
                          <a
                            href={targetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[10px] font-black ml-auto"
                          >
                            <span>Join</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No upcoming activities scheduled.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

    </motion.div>
  );
}
