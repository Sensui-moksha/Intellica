import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Target, Sparkles, AlertCircle, CheckCircle2,
  BookOpen, FileText, Send, Clock, ArrowRight,
  Calendar, Trophy, Award, Bookmark, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { facultyApi, rankingApi, authApi, activityApi } from '../../api/services';
import { resolveProfileImageUrl } from '../../components/Header';
import { subscribeToRealtimeEvent, SYNC_EVENTS } from '../../utils/syncEvents';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return { salutation: 'Good morning', icon: '☀️', message: 'Ready to submit research and achieve your academic milestones today?' };
  if (hour >= 12 && hour < 17) return { salutation: 'Good afternoon', icon: '☀️', message: 'Here is your real-time academic standing & credit target.' };
  return { salutation: 'Good evening', icon: '🌙', message: 'Review today\'s approved credits and upcoming department milestones.' };
};

export default function FacultyDashboard() {
  const [profile, setProfile]       = useState(null);
  const [uploads, setUploads]       = useState([]);
  const [rank, setRank]             = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);

  const fetchAll = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [profileRes, uploadsRes, rankRes, meRes, actRes] = await Promise.all([
        facultyApi.getProfile().catch(() => null),
        facultyApi.getMyUploads().catch(() => ({ data: [] })),
        rankingApi.getMyRank().catch(() => ({ data: null })),
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
      const uList = Array.isArray(uploadsRes?.data) ? uploadsRes.data : uploadsRes?.data?.uploads || [];
      setUploads(uList);
      setRank(rankRes?.data);
      const actList = actRes?.data?.activities || actRes?.data || [];
      setActivities(actList);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(false);

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
  const myEarnedCredits = approvedUploads.reduce((sum, u) => sum + (Number(u.credits) || 0), 0) || (profile?.totalCredits || 0);

  const pendingCount = uploads.filter(
    u => u.status === 'FACULTY_SUBMITTED' || u.status === 'HOD_SUBMITTED' || u.status === 'PENDING'
  ).length;

  const revisionCount = uploads.filter(
    u => u.status === 'NEEDS_REVISION' || u.status === 'ADMIN_COMMENT' || u.status === 'HOD_COMMENT'
  ).length;

  const creditTarget = 200;
  const progressPercent = Math.min(Math.round((myEarnedCredits / creditTarget) * 100), 100);

  const displayName = profile?.name || localStorage.getItem('userName') || 'Faculty';
  const userInitial = (displayName || 'F').charAt(0).toUpperCase();
  const profileImg = profile?.profileImage || localStorage.getItem('profileImage');
  const profileImgUrl = resolveProfileImageUrl(profileImg);
  const greeting = getGreeting();

  const displayActivities = activities.slice(0, 3);

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
                Department of {profile?.department || 'CSE'} • Academic Year {new Date().getFullYear()}
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

      {/* Revision Alert if needed */}
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

      {/* 4 Stat Cards */}
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
            label: 'Department Rank',
            value: rank?.departmentRank ? `#${rank.departmentRank}` : '#1',
            unit: `of ${rank?.departmentTotal || 1}`,
            subtext: 'Institutional Standing',
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
            subtext: 'Requires HOD Review',
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

      {/* Credit Progress Target */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-3xl p-6 border shadow-xs space-y-4"
        style={{ borderColor: '#e8edf5' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Annual Research Milestone Target</h3>
            <p className="text-[11px] text-slate-400">Institutional baseline target: {creditTarget} Credits</p>
          </div>
          <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200/60">
            {progressPercent}% Completed
          </span>
        </div>

        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'spring', stiffness: 50, damping: 14, delay: 0.2 }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #2563eb, #7c3aed)' }}
          />
        </div>

        <div className="flex justify-between text-xs text-slate-500 font-semibold pt-1">
          <span>{myEarnedCredits} points secured</span>
          <span>{Math.max(0, creditTarget - myEarnedCredits)} points remaining to reach annual goal</span>
        </div>
      </motion.div>

      {/* ── 🌟 UPCOMING DEPARTMENT ACTIVITIES (PLANNED BY HOD) ── */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-3xl p-6 border shadow-xs space-y-4"
        style={{ borderColor: '#e8edf5' }}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-black text-slate-900">Upcoming Department Activities</h3>
          </div>
          <Link
            to="/faculty/calendar"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View Calendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {displayActivities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {displayActivities.map((act, i) => {
              const hasLink = act.link || (act.venue && (act.venue.startsWith('http') || act.venue.includes('meet.google.com') || act.venue.includes('zoom.us')));
              const targetUrl = act.link || (hasLink ? (act.venue.startsWith('http') ? act.venue : `https://${act.venue}`) : null);

              return (
                <div
                  key={act._id || i}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:shadow-sm transition-all bg-white flex flex-col justify-between group"
                >
                  <Link to="/faculty/calendar" className="block">
                    <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      {act.title}
                    </h4>
                    {act.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {act.description}
                      </p>
                    )}
                  </Link>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{act.time || '10:00 AM'}</span>
                    </div>

                    {hasLink && (
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-bold px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
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
            <p className="font-bold text-xs text-slate-600">No upcoming department activities</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Your Head of Department has not scheduled new events yet.</p>
          </div>
        )}
      </motion.div>

    </motion.div>
  );
}
