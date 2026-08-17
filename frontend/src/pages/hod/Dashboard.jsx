import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, TrendingUp, Award, BarChart2, Loader2, Sparkles,
  ShieldCheck, Crown, Send, BookOpen, Clock, Trophy,
  Calendar, ArrowRight, Hourglass, Bookmark, ExternalLink,
  Building2, Shield, MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { hodApi, rankingApi, authApi, activityApi } from '../../api/services';
import { resolveProfileImageUrl } from '../../components/Header';
import { subscribeToRealtimeEvent, SYNC_EVENTS } from '../../utils/syncEvents';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return { salutation: 'Good morning', icon: '☀️', message: 'Ready to coordinate research and academic excellence today?' };
  if (hour >= 12 && hour < 17) return { salutation: 'Good afternoon', icon: '☀️', message: 'Here is your real-time department standing & credit progress.' };
  if (hour >= 17 && hour < 22) return { salutation: 'Good evening', icon: '🌆', message: 'Review today\'s research submissions and departmental activities.' };
  return { salutation: 'Good night', icon: '🌙', message: 'Academic credit and departmental management portal.' };
};

export default function HodDashboard() {
  const [profile, setProfile]       = useState(null);
  const [faculty, setFaculty]       = useState([]);
  const [pending, setPending]       = useState([]);
  const [rankings, setRankings]     = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [profileRes, facultyRes, pendingRes, rankRes, meRes, actRes] = await Promise.all([
        hodApi.getProfile().catch(() => null),
        hodApi.getFacultyList().catch(() => ({ data: [] })),
        hodApi.getPendingUploads().catch(() => ({ data: [] })),
        rankingApi.getRankings().catch(() => ({ data: [] })),
        authApi.getMe().catch(() => null),
        activityApi.getActivities().catch(() => ({ data: { activities: [] } }))
      ]);

      const mergedProfile = {
        ...(profileRes?.data || {}),
        profileImage: meRes?.data?.profileImage || profileRes?.data?.profileImage || localStorage.getItem('profileImage') || ''
      };
      if (mergedProfile.profileImage) {
        localStorage.setItem('profileImage', mergedProfile.profileImage);
      }
      setProfile(mergedProfile);
      setFaculty(facultyRes?.data?.faculty || facultyRes?.data || []);
      setPending(pendingRes?.data?.uploads || pendingRes?.data || []);
      const rankList = Array.isArray(rankRes?.data) ? rankRes.data : rankRes?.data?.rankings || [];
      setRankings(rankList);
      const actList = actRes?.data?.activities || actRes?.data || [];
      setActivities(actList);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);

    // Subscribe to realtime updates for activities and approvals
    const unsubActivities = subscribeToRealtimeEvent(SYNC_EVENTS.ACTIVITIES_UPDATED, () => fetchData(true));
    const unsubApprovals = subscribeToRealtimeEvent(SYNC_EVENTS.APPROVALS_UPDATED, () => fetchData(true));
    const unsubProfile = subscribeToRealtimeEvent(SYNC_EVENTS.PROFILE_UPDATED, () => fetchData(true));

    // Update on window focus
    const handleFocus = () => fetchData(true);
    window.addEventListener('focus', handleFocus);

    // Heartbeat silent poll every 10s
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
      <p className="text-xs font-semibold text-slate-500">Loading department dashboard…</p>
    </div>
  );

  const hodDept = (profile?.department || 'CSE').toUpperCase();
  const displayName = profile?.name || localStorage.getItem('userName') || 'moksha';
  const userInitial = (displayName || 'M').charAt(0).toUpperCase();
  const profileImg = profile?.profileImage || localStorage.getItem('profileImage');
  const profileImgUrl = resolveProfileImageUrl(profileImg);
  const greeting = getGreeting();

  // 1. My Personal Earned Credits as HOD
  const myMemberData = rankings.find(
    r => r.facultyId === profile?._id ||
         (r.name?.toLowerCase() === profile?.name?.toLowerCase() && (r.department || '').toUpperCase() === hodDept)
  );
  const myEarnedCredits = myMemberData?.totalCredits || profile?.totalCredits || 25;

  // 2. Department Members & Department Total Credits
  const deptMembers = rankings.filter(
    r => (r.department || '').toUpperCase() === hodDept
  );

  // Merge faculty
  faculty.forEach(f => {
    if (!deptMembers.some(m => m.facultyId === f._id || m.name === f.name)) {
      deptMembers.push({
        facultyId: f._id,
        name: f.name,
        department: f.department,
        designation: f.designation || 'Assistant Professor',
        createdByRole: 'FACULTY',
        totalCredits: f.totalCredits || 0
      });
    }
  });

  // Ensure HOD is included in deptMembers
  if (profile && !deptMembers.some(m => m.facultyId === profile._id || (m.name?.toLowerCase() === profile.name?.toLowerCase() && (m.department || '').toUpperCase() === hodDept))) {
    deptMembers.push({
      facultyId: profile._id,
      name: profile.name,
      department: profile.department,
      designation: profile.designation || 'Professor & HOD',
      createdByRole: 'HOD',
      totalCredits: myEarnedCredits
    });
  }

  const deptTotalCredits = Math.max(
    deptMembers.reduce((sum, m) => sum + (Number(m.totalCredits) || 0), 0),
    myEarnedCredits
  );

  // 3. College Department Rankings Map
  const deptAggMap = {};
  rankings.forEach(r => {
    const d = (r.department || 'Unknown').toUpperCase();
    if (!deptAggMap[d]) deptAggMap[d] = { department: d, totalCredits: 0, count: 0 };
    deptAggMap[d].totalCredits += (Number(r.totalCredits) || 0);
    deptAggMap[d].count += 1;
  });

  if (hodDept && !deptAggMap[hodDept]) {
    deptAggMap[hodDept] = { department: hodDept, totalCredits: deptTotalCredits, count: deptMembers.length };
  } else if (hodDept) {
    deptAggMap[hodDept].totalCredits = Math.max(deptAggMap[hodDept].totalCredits, deptTotalCredits);
  }

  const collegeDeptRankings = Object.values(deptAggMap).sort((a, b) => b.totalCredits - a.totalCredits);
  const maxRankCredits = collegeDeptRankings[0]?.totalCredits || 1;
  const myDeptRankIndex = collegeDeptRankings.findIndex(d => d.department === hodDept);
  const deptRankDisplay = myDeptRankIndex >= 0 ? `#${myDeptRankIndex + 1}` : '#1';

  // 4. Top Department Researchers
  const sortedDeptMembers = [...deptMembers]
    .sort((a, b) => (b.totalCredits || 0) - (a.totalCredits || 0));

  // 5. Upcoming Activities from API
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

        {/* Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Profile Avatar with Active Checkmark */}
            <div className="relative shrink-0">
              {profileImgUrl ? (
                <img
                  src={profileImgUrl}
                  alt={displayName}
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

            {/* Typography & Subtitles */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>{greeting.icon}</span>
                  <span>{greeting.salutation},</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Welcome back, {displayName}!</span>
                <span className="inline-block hover:rotate-12 transition-transform cursor-default">👋</span>
              </h1>

              <div className="pt-0.5">
                <span className="inline-block px-3 py-0.5 rounded-full bg-white/10 text-white border border-white/20 text-[10px] font-black tracking-wider uppercase">
                  {profile?.designation || 'PROFESSOR & HOD'}
                </span>
              </div>

              <p className="text-xs text-slate-300 font-medium pt-0.5">
                Department of {hodDept} • Academic Year {new Date().getFullYear()}
              </p>
              <p className="text-xs text-slate-400 font-normal">
                {greeting.message}
              </p>
            </div>
          </div>

          {/* Action Buttons in Hero */}
          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end flex-wrap shrink-0">
            <Link
              to="/hod/upload"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Proposal</span>
            </Link>
            <Link
              to="/hod/approvals"
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>View Approvals ({pending.length})</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── 5 STAT CARDS (MATCHING REFERENCE IMAGE) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[
          {
            label: 'Dept. Credits',
            value: deptTotalCredits.toString(),
            unit: 'pts',
            subtext: 'Total Earned',
            icon: Bookmark,
            color: '#2563eb',
            bg: '#dbeafe'
          },
          {
            label: 'My Earned Credits',
            value: myEarnedCredits.toString(),
            unit: 'pts',
            subtext: 'This Year',
            icon: Award,
            color: '#7c3aed',
            bg: '#ede9fe'
          },
          {
            label: 'Faculty Members',
            value: faculty.length.toString(),
            unit: 'members',
            subtext: 'Total',
            icon: Users,
            color: '#059669',
            bg: '#d1fae5'
          },
          {
            label: 'Pending Approvals',
            value: pending.length.toString(),
            unit: 'to review',
            subtext: 'Requires Action',
            icon: Hourglass,
            color: '#d97706',
            bg: '#fef3c7'
          },
          {
            label: 'Dept. Rank',
            value: deptRankDisplay,
            unit: 'Institutional',
            subtext: 'Top Ranking',
            icon: Trophy,
            color: '#0284c7',
            bg: '#e0f2fe'
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

      {/* ── LEADERBOARDS ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: College Department Rankings */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-3xl p-6 border shadow-xs flex flex-col justify-between"
          style={{ borderColor: '#e8edf5' }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">College Department Rankings</h3>
                <p className="text-[11px] text-slate-400">Institutional credit standings across departments</p>
              </div>
              <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100">
                {collegeDeptRankings.length} Departments
              </span>
            </div>

            <div className="space-y-3">
              {collegeDeptRankings.map((d, i) => {
                const isMyDept = d.department === hodDept || d.isMyDept;
                const currentScore = d.totalCredits || 0;
                const topDeptScore = collegeDeptRankings[0]?.totalCredits || 0;
                const percentage = topDeptScore > 0 ? (currentScore / topDeptScore) * 100 : 0;

                return (
                  <div key={d.department || i} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                          i === 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          #{i + 1}
                        </span>
                        <span className={`font-bold ${isMyDept ? 'text-blue-600 font-extrabold' : 'text-slate-800'}`}>
                          {d.department}
                        </span>
                        {isMyDept && (
                          <span className="text-[10px] bg-blue-600 text-white font-black px-2 py-0.5 rounded-md shadow-2xs">
                            Your Department
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-900 font-black">
                          {i === 0
                            ? currentScore.toLocaleString()
                            : (topDeptScore > 0 ? `${currentScore.toLocaleString()} / ${topDeptScore.toLocaleString()}` : `${currentScore.toLocaleString()} / 0`)}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">pts</span>
                      </div>
                    </div>

                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(percentage, currentScore > 0 ? 4 : 0)}%` }}
                        transition={{ type: 'spring', stiffness: 50, damping: 14, delay: 0.1 + i * 0.05 }}
                        className={`h-full rounded-full ${
                          isMyDept
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xs'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-center">
            <Link
              to="/hod/reports"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>View All Rankings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* Right: Department Faculty & HOD Standing */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-3xl p-6 border shadow-xs flex flex-col justify-between"
          style={{ borderColor: '#e8edf5' }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">Department Faculty & HOD Standing</h3>
                <p className="text-[11px] text-slate-400">Research points earned within {hodDept}</p>
              </div>
              <Crown className="w-4 h-4 text-amber-500" />
            </div>

            <div className="space-y-2">
              {sortedDeptMembers.map((f, i) => {
                const isHOD = f.createdByRole === 'HOD' || f.designation?.includes('HOD') || f.facultyId === profile?._id || f.name === displayName;
                return (
                  <div
                    key={f.facultyId || i}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition-colors ${
                      isHOD
                        ? 'bg-blue-50/50 border-blue-200/80'
                        : 'hover:bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-black text-slate-400 w-4 text-center">
                        #{i + 1}
                      </span>
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isHOD ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {f.name?.charAt(0) || 'F'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900">{f.name}</p>
                          {isHOD && (
                            <span className="text-[9px] bg-blue-600 text-white font-black px-1.5 py-0.2 rounded-md">
                              You • HOD
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

              {sortedDeptMembers.length === 0 && (
                <p className="text-xs text-slate-400 py-6 text-center">No member research data yet.</p>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-center">
            <Link
              to="/hod/faculty"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>View Full Leaderboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ── 🌟 UPCOMING ACTIVITIES SECTION (BOTTOM CARDS) ── */}
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
            to="/hod/calendar"
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
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80">
                            👑 By Principal / Admin (For All HODs)
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-blue-600 text-white flex items-center gap-1 shadow-2xs">
                            <Building2 className="w-2.5 h-2.5" /> Dept Internal
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                            👔 By HOD ({act.department || profile?.department || 'CSE'} Faculty)
                          </span>
                        </>
                      )}
                    </div>

                    <Link to="/hod/calendar" className="block">
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
