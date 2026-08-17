import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Award, Users, BarChart2, AlertCircle, Loader2,
  ShieldCheck, ArrowRight, Crown, Building2, Calendar,
  Trophy, Clock, Bookmark, ExternalLink, Shield, MapPin, Calculator
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi, rankingApi, authApi, activityApi, pbasApi } from '../../api/services';
import { resolveProfileImageUrl } from '../../components/Header';
import { subscribeToRealtimeEvent, SYNC_EVENTS } from '../../utils/syncEvents';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return { salutation: 'Good morning', icon: '☀️', message: 'Ready to oversee college-wide academic operations today?' };
  if (hour >= 12 && hour < 17) return { salutation: 'Good afternoon', icon: '☀️', message: 'Institutional academic metrics & faculty progress summary.' };
  return { salutation: 'Good evening', icon: '🌙', message: 'Review today\'s institutional milestones and achievements.' };
};

export default function AdminDashboard() {
  const [profile, setProfile]       = useState(null);
  const [depts, setDepts]           = useState([]);
  const [rankings, setRankings]     = useState([]);
  const [stats, setStats]           = useState(null);
  const [allUsers, setAllUsers]     = useState([]);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [activities, setActivities] = useState([]);
  const [pbasCount, setPbasCount]   = useState(0);
  const [loading, setLoading]       = useState(true);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [deptsRes, rankRes, statsRes, usersRes, pendingRes, meRes, actRes] = await Promise.all([
        adminApi.getDepartments().catch(() => ({ data: [] })),
        rankingApi.getRankings().catch(() => ({ data: [] })),
        adminApi.getActivityStats().catch(() => ({ data: null })),
        adminApi.getAllUsers().catch(() => ({ data: [] })),
        adminApi.getPendingUploads().catch(() => ({ data: [] })),
        authApi.getMe().catch(() => null),
        activityApi.getActivities().catch(() => ({ data: { activities: [] } })),
        pbasApi.getAllAppraisals('2025-26').catch(() => ({ data: [] }))
      ]);
      const pbasAppraisals = Array.isArray(pbasRes?.data) ? pbasRes.data : [];
      setPbasCount(pbasAppraisals.length);
      setDepts(deptsRes.data?.departments || deptsRes.data || []);
      setRankings(rankRes.data?.rankings || rankRes.data || []);
      setStats(statsRes.data);
      setAllUsers(usersRes.data?.users || usersRes.data || []);
      setPendingUploads(pendingRes.data || []);
      const mergedProfile = meRes?.data || { name: 'Administrator', role: 'ADMIN' };
      if (mergedProfile.profileImage) {
        localStorage.setItem('profileImage', mergedProfile.profileImage);
      }
      setProfile(mergedProfile);
      setActivities(actRes.data?.activities || actRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);

    // Realtime subscriptions
    const unsubActivities = subscribeToRealtimeEvent(SYNC_EVENTS.ACTIVITIES_UPDATED, () => fetchData(true));
    const unsubApprovals = subscribeToRealtimeEvent(SYNC_EVENTS.APPROVALS_UPDATED, () => fetchData(true));
    const unsubProfile = subscribeToRealtimeEvent(SYNC_EVENTS.PROFILE_UPDATED, () => fetchData(true));

    // Update on focus
    const handleFocus = () => fetchData(true);
    window.addEventListener('focus', handleFocus);

    // Heartbeat silent sync every 10s
    const interval = setInterval(() => fetchData(true), 10000);

    return () => {
      unsubActivities();
      unsubApprovals();
      unsubProfile();
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-72 gap-3">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-xs font-semibold text-slate-500">Loading institutional dashboard…</p>
    </div>
  );

  // Aggregate credits per department for College Department Rankings
  const deptAggMap = {};
  depts.forEach(d => {
    const code = (d.code || d.name || '').toUpperCase();
    if (code) deptAggMap[code] = { department: code, totalCredits: 0 };
  });

  rankings.forEach(r => {
    const d = (r.department || '').toUpperCase();
    if (d && d !== 'UNKNOWN') {
      if (!deptAggMap[d]) deptAggMap[d] = { department: d, totalCredits: 0 };
      deptAggMap[d].totalCredits += (Number(r.totalCredits) || 0);
    }
  });

  allUsers.forEach(u => {
    const d = (u.department || '').toUpperCase();
    if (d && d !== 'UNKNOWN' && (u.role === 'FACULTY' || u.role === 'HOD')) {
      const inRankings = rankings.some(r => r.facultyId === u._id || r._id === u._id);
      if (!inRankings && u.totalCredits) {
        if (!deptAggMap[d]) deptAggMap[d] = { department: d, totalCredits: 0 };
        deptAggMap[d].totalCredits += (Number(u.totalCredits) || 0);
      }
    }
  });

  const departmentRankings = Object.values(deptAggMap).sort((a, b) => (b.totalCredits || 0) - (a.totalCredits || 0));
  const topDeptCredits = departmentRankings[0]?.totalCredits || 0;

  const totalCredits  = Object.values(deptAggMap).reduce((s, d) => s + (d.totalCredits || 0), 0) || rankings.reduce((s, r) => s + (r.totalCredits || 0), 0);
  const facultyCount  = allUsers.filter(u => u.role === 'FACULTY').length;
  const hodCount      = allUsers.filter(u => u.role === 'HOD').length;
  const maxCredits    = topDeptCredits || 25;
  const pendingCount  = stats?.pendingCount ?? pendingUploads.length;

  const displayName = profile?.name || localStorage.getItem('userName') || 'Administrator';
  const userInitial = (displayName || 'A').charAt(0).toUpperCase();
  const profileImg = profile?.profileImage || localStorage.getItem('profileImage');
  const profileImgUrl = resolveProfileImageUrl(profileImg);
  const greeting = getGreeting();

  const displayActivities = activities.slice(0, 3);

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* ── 🌟 HERO BANNER (ULTRA-SEAMLESS INTEGRATION) ── */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#070f23] via-[#0e1d45] to-[#142e6b] text-white p-6 sm:p-8 shadow-2xl border border-indigo-900/30"
      >
        {/* Full Panoramic DVR & Dr. HS MIC College of Technology Building */}
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
          {/* Seamless Deep Indigo & Sapphire Gradient Wash */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#070f23] via-[#0e1d45]/60 to-[#142e6b]/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070f23]/60 via-transparent to-[#070f23]/25" />

          {/* Concentric Subtle Radar Rings */}
          <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute -right-36 -bottom-36 w-120 h-120 rounded-full border border-white/5 pointer-events-none" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {profileImgUrl ? (
                <img
                  src={profileImgUrl}
                  alt={displayName}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-white/15 shadow-xl border border-white/20"
                />
              ) : (
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white font-black text-3xl sm:text-4xl flex items-center justify-center ring-4 ring-white/15 shadow-xl border border-white/20">
                  {userInitial}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-[#0f172a] rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-xs" title="Super Admin">
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
                  INSTITUTIONAL ADMINISTRATOR
                </span>
              </div>

              <p className="text-xs text-slate-300 font-medium pt-0.5">
                College-Wide Governance & Credit Validation • Academic Year {new Date().getFullYear()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end flex-wrap shrink-0">
            <Link
              to="/admin/approvals"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Pending Approvals ({pendingCount})</span>
            </Link>
            <Link
              to="/admin/departments"
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Departments ({depts.length})</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* 4 KPIs Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Credits',      value: totalCredits.toLocaleString(), unit: 'pts', subtext: 'Total Earned Across College', icon: Bookmark, color: '#2563eb', bg: '#dbeafe' },
          { label: 'Departments',        value: depts.length.toString(),       unit: 'active units', subtext: 'Registered Departments', icon: Building2, color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Faculty & HODs',     value: `${facultyCount + hodCount}`,  unit: 'members', subtext: `${facultyCount} Faculty • ${hodCount} HOD`, icon: Users, color: '#059669', bg: '#d1fae5' },
          { label: 'Pending Approvals',  value: pendingCount.toString(),       unit: 'to review', subtext: 'Requires Admin Action', icon: Clock, color: '#d97706', bg: '#fef3c7' },
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

      {/* ── PBAS Appraisal Overview Card ── */}
      <motion.div
        variants={itemVariants}
        whileHover={{ y: -2 }}
        className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 rounded-3xl p-5 border border-indigo-200/60 flex items-center justify-between hover:shadow-md transition-all shadow-xs group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors">PBAS Appraisal System</h3>
            <p className="text-[10px] font-semibold text-slate-400">Performance Based Appraisal System • College-wide Faculty Scores</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-black text-indigo-700 tabular-nums">{pbasCount} <span className="text-xs font-bold text-slate-400">Submissions</span></p>
            <p className="text-[10px] font-bold text-slate-400">Academic Year 2025-26</p>
          </div>
          <Link
            to="/admin/faculty"
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl border border-indigo-200/60 transition-colors"
          >
            <span>View Faculty Scores</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Leaderboard */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-3xl p-6 border shadow-xs flex flex-col justify-between"
          style={{ borderColor: '#e8edf5' }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">College Department Rankings</h3>
                <p className="text-[11px] text-slate-400">Institutional credit rankings across departments</p>
              </div>
              <Crown className="w-4 h-4 text-amber-500" />
            </div>

            <div className="space-y-3">
              {departmentRankings.slice(0, 6).map((d, i) => {
                const currentScore = d.totalCredits || 0;
                const percentage = topDeptCredits > 0 ? (currentScore / topDeptCredits) * 100 : 0;

                return (
                  <div key={d.department || i} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                          i === 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          #{i + 1}
                        </span>
                        <span className="font-bold text-slate-800">{d.department}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-900 font-black">
                          {i === 0
                            ? currentScore.toLocaleString()
                            : (topDeptCredits > 0 ? `${currentScore.toLocaleString()} / ${topDeptCredits.toLocaleString()}` : `${currentScore.toLocaleString()} / 0`)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">pts</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(percentage, currentScore > 0 ? 4 : 0)}%` }}
                        transition={{ type: 'spring', stiffness: 50, damping: 14, delay: 0.1 + i * 0.05 }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-center">
            <Link
              to="/admin/reports"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>View All Rankings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* Top Research Faculty */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-3xl p-6 border shadow-xs flex flex-col justify-between"
          style={{ borderColor: '#e8edf5' }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">Top Research Faculty</h3>
                <p className="text-[11px] text-slate-400">Institutional high achievers across all departments</p>
              </div>
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>

            <div className="space-y-2">
              {allUsers
                .filter(u => u.role === 'FACULTY' || u.role === 'HOD')
                .map(u => {
                  const rankMatch = rankings.find(r => r.facultyId === u._id || r.name?.toLowerCase() === u.name?.toLowerCase());
                  return {
                    ...u,
                    totalCredits: Math.max(Number(u.totalCredits) || 0, Number(rankMatch?.totalCredits) || 0)
                  };
                })
                .sort((a, b) => (b.totalCredits || 0) - (a.totalCredits || 0))
                .slice(0, 5)
                .map((u, i) => (
                  <div key={u._id || i} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 border border-slate-100 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-black text-slate-400 w-4 text-center">#{i + 1}</span>
                      <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {u.name?.charAt(0) || 'F'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900">{u.name}</p>
                          {u.role === 'HOD' && (
                            <span className="text-[9px] bg-blue-100 text-blue-800 font-black px-1.5 py-0.2 rounded-md">
                              HOD
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">{u.department} • {u.designation || (u.role === 'HOD' ? 'Head of Department' : 'Faculty')}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-900">
                      {(u.totalCredits || 0).toLocaleString()} pts
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-center">
            <Link
              to="/admin/faculty"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>View Full Leaderboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ── UPCOMING ACTIVITIES ── */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-3xl p-6 border shadow-xs space-y-4"
        style={{ borderColor: '#e8edf5' }}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-black text-slate-900">Upcoming Activities</h3>
          </div>
          <Link
            to="/admin/calendar"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View Calendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {displayActivities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {displayActivities.map((act, i) => {
              const isAdminActivity = act.createdByRole === 'ADMIN' || act.targetAudience === 'ALL_HODS';
              const hasLink = act.link || (act.venue && (act.venue.startsWith('http') || act.venue.includes('meet.google.com') || act.venue.includes('zoom.us')));
              const targetUrl = act.link || (hasLink ? (act.venue.startsWith('http') ? act.venue : `https://${act.venue}`) : null);
              const formattedDate = act.date ? new Date(act.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

              return (
                <div
                  key={act._id || i}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between group shadow-2xs ${
                    isAdminActivity
                      ? 'border-l-4 border-l-purple-600 border-slate-200/90 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/20 hover:border-purple-300'
                      : 'border-l-4 border-l-blue-600 border-slate-200/90 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/30 hover:border-blue-300'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Top Organizer & Audience Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isAdminActivity ? (
                        <>
                          <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-purple-600 text-white flex items-center gap-1 shadow-2xs">
                            <Shield className="w-2.5 h-2.5" /> Institutional
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200/80 flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5 text-purple-600" /> Principal / Admin (All HODs)
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-blue-600 text-white flex items-center gap-1 shadow-2xs">
                            <Building2 className="w-2.5 h-2.5" /> Dept Internal
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/80 flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5 text-blue-600" /> By HOD ({act.department || 'Dept'} Faculty)
                          </span>
                        </>
                      )}
                    </div>

                    <Link to="/admin/calendar" className="block">
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                        {act.title}
                      </h4>
                      {act.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {act.description}
                        </p>
                      )}
                    </Link>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100/90 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500">
                    <div className="flex items-center gap-2 truncate">
                      <div className="flex items-center gap-1 shrink-0">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedDate ? `${formattedDate} · ` : ''}{act.time || '10:00 AM'}</span>
                      </div>
                      {act.venue && !hasLink && (
                        <div className="flex items-center gap-1 truncate text-slate-400">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{act.venue}</span>
                        </div>
                      )}
                    </div>

                    {hasLink && (
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Join</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
            <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-1" />
            <p className="font-bold text-xs text-slate-600">No scheduled activities</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click "View Calendar" above to plan a new meeting or event.</p>
          </div>
        )}
      </motion.div>

    </motion.div>
  );
}
