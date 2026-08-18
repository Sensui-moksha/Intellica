import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Download, TrendingUp, Award, Users,
  Building2, Calendar, FileText, Sparkles, Filter, RefreshCw,
  ChevronRight, ArrowLeft, ExternalLink, BookOpen, Clock,
  Wrench, Mic, Coins, Building, Bookmark, CheckCircle2,
  AlertCircle, ShieldCheck, Mail, Briefcase, GraduationCap,
  Eye, FileCheck, Search, X, Layers, Calculator
} from 'lucide-react';
import { reportApi, authApi, pbasApi, academicYearApi } from '../../api/services';
import { resolveProfileImageUrl, getDocumentUrl } from '../../components/Header';
import { subscribeToRealtimeEvent, SYNC_EVENTS } from '../../utils/syncEvents';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

export default function ReportsAndAnalytics() {
  const [data, setData]                       = useState({ departments: [], role: 'ADMIN' });
  const [loading, setLoading]                 = useState(true);
  const [selectedDept, setSelectedDept]       = useState(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);
  const [portfolioData, setPortfolioData]     = useState(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [currentFacultyPBAS, setCurrentFacultyPBAS] = useState(null);
  const [pbasMap, setPbasMap]                 = useState({});
  const [searchQuery, setSearchQuery]         = useState('');
  const [activeWorkTab, setActiveWorkTab]     = useState('ALL');
  const [academicYears, setAcademicYears]     = useState([]);
  const [selectedYear, setSelectedYear]       = useState('2025-26');

  const role = localStorage.getItem('role') || 'ADMIN';
  const isHOD = role === 'HOD';

  const loadAnalytics = async (isSilent = false, yearToLoad = selectedYear) => {
    if (!isSilent) setLoading(true);
    try {
      const [res, pbasRes] = await Promise.all([
        reportApi.getAnalytics({ year: yearToLoad }),
        isHOD 
          ? pbasApi.getDeptAppraisals(yearToLoad).catch(() => ({ data: [] }))
          : pbasApi.getAllAppraisals(yearToLoad).catch(() => ({ data: [] }))
      ]);
      const fetchedData = res.data || { departments: [], role };
      setData(fetchedData);

      // If HOD, automatically select their department; Admin ALWAYS sees All Departments overview first
      if (isHOD && fetchedData.departments?.length > 0 && !selectedDept) {
        setSelectedDept(fetchedData.departments[0]);
      } else if (selectedDept) {
        const refreshed = (fetchedData.departments || []).find(d => d.department === selectedDept.department);
        if (refreshed) setSelectedDept(refreshed);
      }

      const pbasData = Array.isArray(pbasRes?.data) ? pbasRes.data : [];
      const pMap = {};
      pbasData.forEach(p => {
        const fId = p.faculty?._id || p.faculty;
        if (fId) pMap[fId] = p;
      });
      setPbasMap(pMap);
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    let currentYear = '2025-26';
    academicYearApi.getAll().then(res => {
      const list = Array.isArray(res.data) ? res.data : [];
      setAcademicYears(list);
      const current = list.find(y => y.isCurrent) || list[0];
      if (current) {
        currentYear = current.year;
        setSelectedYear(currentYear);
      }
      loadAnalytics(false, currentYear);
    }).catch(() => {
      loadAnalytics(false, '2025-26');
    });

    const unsub1 = subscribeToRealtimeEvent(SYNC_EVENTS.ACTIVITIES_UPDATED, () => loadAnalytics(true));
    const unsub2 = subscribeToRealtimeEvent(SYNC_EVENTS.APPROVALS_UPDATED, () => loadAnalytics(true));

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  // Fetch full portfolio when a user is clicked
  const handleOpenFacultyPortfolio = async (facultyId) => {
    setSelectedFacultyId(facultyId);
    setLoadingPortfolio(true);
    setPortfolioData(null);
    setCurrentFacultyPBAS(null);
    try {
      const [res, scoreRes] = await Promise.all([
        reportApi.getFacultyPortfolio(facultyId),
        pbasApi.getFacultyScore(facultyId, selectedYear).catch(() => null)
      ]);
      setPortfolioData(res.data);
      if (scoreRes?.data?.score) {
        setCurrentFacultyPBAS(scoreRes.data);
      } else if (pbasMap[facultyId]) {
        setCurrentFacultyPBAS({
          score: pbasMap[facultyId].calculatedScores,
          academicYear: pbasMap[facultyId].academicYear,
          role: pbasMap[facultyId].role,
          status: pbasMap[facultyId].status
        });
      }
    } catch (err) {
      console.error('Portfolio load error:', err);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  const handleClosePortfolio = () => {
    setSelectedFacultyId(null);
    setPortfolioData(null);
    setCurrentFacultyPBAS(null);
    setActiveWorkTab('ALL');
  };

  const departments = data.departments || [];

  // College-wide KPI totals
  const totalCredits = departments.reduce((s, d) => s + (d.totalCredits || 0), 0);
  const totalFaculty = departments.reduce((s, d) => s + (d.facultyCount || 0), 0);
  const totalBooks = departments.reduce((s, d) => s + (d.stats?.books || 0), 0);
  const totalPubs = departments.reduce((s, d) => s + (d.stats?.publications || 0), 0);
  const totalConfs = departments.reduce((s, d) => s + (d.stats?.conferences || 0), 0);

  // CSV Export
  const handleExportCSV = () => {
    if (!departments.length) return;
    const headers = ['Department', 'Faculty Name', 'Designation', 'Role', 'Employee ID', 'Email', 'Total Credits', 'Books', 'Publications', 'Conferences', 'Google Scholar', 'Vidwan ID', 'Scopus ID'];
    const rows = [];

    departments.forEach(dept => {
      (dept.faculty || []).forEach(f => {
        rows.push([
          `"${dept.department}"`,
          `"${f.name || ''}"`,
          `"${f.designation || ''}"`,
          `"${f.role || ''}"`,
          `"${f.employeeId || ''}"`,
          `"${f.email || ''}"`,
          f.totalCredits || 0,
          f.stats?.books || 0,
          f.stats?.publications || 0,
          f.stats?.conferences || 0,
          `"${f.googleScholar || ''}"`,
          `"${f.vidwanId || ''}"`,
          `"${f.scopusId || ''}"`
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `intellica_department_research_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  // Filter department members by search query
  const filteredMembers = selectedDept
    ? (selectedDept.faculty || []).filter(m =>
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* ── HEADER ── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {selectedDept && !isHOD && (
              <button
                onClick={() => { setSelectedDept(null); setSearchQuery(''); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer mr-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Departments</span>
              </button>
            )}
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {selectedDept ? `${selectedDept.department} Department Analytics` : 'Reports & Analytics'}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
              academicYears.find(y => y.year === selectedYear)?.isArchived
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-blue-50 text-blue-700 border-blue-200/60'
            }`}>
              AY {selectedYear} {academicYears.find(y => y.year === selectedYear)?.isArchived ? '(Archived)' : '(Active)'}
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            {selectedDept
              ? `Detailed research portfolio, faculty credit standing, and work records for ${selectedDept.department}.`
              : 'Institutional department performance, faculty research outputs, and individual work records.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Academic Year Filter Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              value={selectedYear}
              onChange={(e) => {
                const newY = e.target.value;
                setSelectedYear(newY);
                loadAnalytics(false, newY);
              }}
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer pr-1"
            >
              {academicYears.length > 0 ? (
                academicYears.map(y => (
                  <option key={y._id || y.year} value={y.year}>
                    {y.label || `AY ${y.year}`} {y.isCurrent ? '★ (Active)' : y.isArchived ? '(Archived)' : ''}
                  </option>
                ))
              ) : (
                <>
                  <option value="2026-27">AY 2026-27 (Upcoming)</option>
                  <option value="2025-26">AY 2025-26 ★ (Active)</option>
                  <option value="2024-25">AY 2024-25 (Archived)</option>
                </>
              )}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Analytics CSV</span>
          </button>
        </div>
      </motion.div>

      {/* Archival Notice Banner */}
      {academicYears.find(y => y.year === selectedYear)?.isArchived && (
        <div className="flex items-center gap-2.5 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200/80 rounded-2xl text-amber-900 text-xs shadow-2xs">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Historical / Archived Academic Year View (AY {selectedYear}):</strong> You are viewing preserved historical records and finalized PBAS appraisals for this past academic year.
          </span>
        </div>
      )}

      {/* ── TOP KPI SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: selectedDept ? `${selectedDept.department} Total Credits` : 'Total Research Credits',
            value: (selectedDept ? selectedDept.totalCredits : totalCredits).toLocaleString(),
            unit: 'pts',
            icon: Award,
            color: '#2563eb',
            bg: '#dbeafe'
          },
          {
            label: selectedDept ? 'Faculty Members' : 'Total Faculty Members',
            value: selectedDept ? selectedDept.facultyCount : totalFaculty,
            unit: 'members',
            icon: Users,
            color: '#7c3aed',
            bg: '#ede9fe'
          },
          {
            label: 'Books & Chapters',
            value: selectedDept ? (selectedDept.stats?.books || 0) : totalBooks,
            unit: 'authored',
            icon: Sparkles,
            color: '#059669',
            bg: '#d1fae5'
          },
          {
            label: 'Journal Publications',
            value: selectedDept ? (selectedDept.stats?.publications || 0) : totalPubs,
            unit: 'papers',
            icon: FileText,
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
            <div>
              <div className="flex items-baseline gap-1">
                <h3 className="text-2xl font-black text-slate-900">{s.value}</h3>
                <span className="text-[11px] font-semibold text-slate-400">{s.unit}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── VIEW 1: ALL DEPARTMENTS GRID (WHEN NO DEPARTMENT SELECTED) ── */}
      {!selectedDept && (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Academic Departments Overview</span>
            </h2>
            <span className="text-xs font-semibold text-slate-500">{departments.length} Departments Registered</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {departments.map((dept, index) => (
              <motion.div
                key={dept.department || index}
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setSelectedDept(dept)}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Department Top Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                        {dept.department.slice(0, 3)}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                          {dept.department}
                        </h3>
                        <p className="text-[11px] font-semibold text-slate-500">
                          HOD: {dept.hodName}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-black shrink-0 border border-blue-200/50">
                      {dept.totalCredits} pts
                    </span>
                  </div>

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-4 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Faculty</span>
                      <span className="text-xs font-black text-slate-800">{dept.facultyCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Books</span>
                      <span className="text-xs font-black text-slate-800">{dept.stats?.books || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Papers</span>
                      <span className="text-xs font-black text-slate-800">{dept.stats?.publications || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold text-blue-600 group-hover:text-blue-700">
                  <span>View Faculty & Works</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── VIEW 2: DEPARTMENT FACULTY ROSTER (WHEN DEPARTMENT SELECTED) ── */}
      {selectedDept && (
        <motion.div variants={itemVariants} className="space-y-5">
          {/* Search & Filter Header */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl w-full sm:w-72 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search faculty by name or ID…"
                  className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder-slate-400 font-medium"
                />
              </div>
              <span className="text-xs font-bold text-slate-500 shrink-0">
                {filteredMembers.length} Members
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Click on any faculty member's name to view their full portfolio</span>
            </div>
          </div>

          {/* Faculty Members List / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => {
              const avatarUrl = resolveProfileImageUrl(member.profileImage);
              const initial = (member.name || 'F').charAt(0).toUpperCase();

              return (
                <motion.div
                  key={member._id}
                  whileHover={{ y: -3 }}
                  onClick={() => handleOpenFacultyPortfolio(member._id)}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* User Chip Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={member.name}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-500/20 shadow-xs"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                            {initial}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                              {member.name}
                            </h3>
                            {member.isHod && (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-md text-[9px] font-black">
                                HOD
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-semibold text-slate-500">{member.designation}</p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black border border-emerald-200/60 shrink-0">
                        {member.totalCredits} pts
                      </span>
                    </div>

                    {/* Identifiers & Details */}
                    <div className="space-y-1.5 text-[11px] text-slate-600 mb-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Employee ID:</span>
                        <span className="font-bold text-slate-700">{member.employeeId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Email:</span>
                        <span className="font-medium text-slate-700 truncate max-w-[170px]">{member.email}</span>
                      </div>
                    </div>

                    {/* Quick Works Stats Pill */}
                    <div className="flex items-center gap-2 text-[10px] font-bold p-2.5 bg-slate-50 rounded-2xl text-slate-600 justify-around flex-wrap">
                      <span>📖 {member.stats?.books || 0} Books</span>
                      <span>📄 {member.stats?.publications || 0} Papers</span>
                      <span>🏛️ {member.stats?.conferences || 0} Confs</span>
                      {pbasMap[member._id]?.calculatedScores?.total !== undefined && (
                        <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 font-black">
                          📊 PBAS: {pbasMap[member._id].calculatedScores.total.toFixed(0)}/1000
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs font-bold text-blue-600 group-hover:text-blue-700">
                    <span>View Work & Details</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredMembers.length === 0 && (
            <div className="py-12 text-center bg-white rounded-3xl border border-slate-200">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No faculty members found</p>
              <p className="text-xs text-slate-400 mt-0.5">Try searching with a different name or employee ID.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── MODAL: FULL USER PORTFOLIO & WORK DETAILS ── */}
      <AnimatePresence>
        {selectedFacultyId && (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
            >
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  <h3 className="text-sm font-black text-slate-900">Faculty Academic & Research Portfolio</h3>
                </div>
                <button
                  onClick={handleClosePortfolio}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content Scroll Area */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {loadingPortfolio ? (
                  <div className="py-16 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-slate-500">Loading comprehensive user records…</p>
                  </div>
                ) : portfolioData ? (
                  <>
                    {/* User Profile Header Card */}
                    <div className="bg-gradient-to-r from-[#070f23] via-[#0e1d45] to-[#142e6b] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            {portfolioData.user?.profileImage && resolveProfileImageUrl(portfolioData.user.profileImage) ? (
                              <img
                                src={resolveProfileImageUrl(portfolioData.user.profileImage)}
                                alt={portfolioData.user?.name}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                className="w-16 h-16 rounded-full object-cover ring-3 ring-blue-400 shadow-md"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center ring-3 ring-blue-400 shadow-md">
                                {(portfolioData.user?.name || 'F').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-xl font-black">{portfolioData.user?.name}</h2>
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-black">
                                {portfolioData.user?.role}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-300 mt-0.5">
                              {portfolioData.user?.designation} • Dept. of {portfolioData.user?.department}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              ID: {portfolioData.user?.employeeId} | {portfolioData.user?.email}
                            </p>
                          </div>
                        </div>

                        {/* Credits Badge */}
                        <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center shrink-0">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200 block">Total Earned Credits</span>
                          <span className="text-2xl font-black text-white">{portfolioData.stats?.totalCredits || 0} pts</span>
                        </div>
                      </div>
                    </div>

                    {/* ── ACADEMIC & RESEARCH IDENTIFIERS BAR ── */}
                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        <span>Academic & Research Identifiers</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        {/* Google Scholar ID */}
                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 block">Google Scholar ID</span>
                          <p className="font-bold text-slate-800 truncate">
                            {portfolioData.user?.googleScholar || <span className="text-slate-400 font-normal italic">Not provided</span>}
                          </p>
                        </div>

                        {/* Vidwan ID */}
                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 block">Vidwan ID</span>
                          <p className="font-bold text-slate-800 truncate">
                            {portfolioData.user?.vidwanId || <span className="text-slate-400 font-normal italic">Not provided</span>}
                          </p>
                        </div>

                        {/* Scopus Author ID */}
                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 block">Scopus Author ID</span>
                          <p className="font-bold text-slate-800 truncate">
                            {portfolioData.user?.scopusId || <span className="text-slate-400 font-normal italic">Not provided</span>}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ── PBAS APPRAISAL SCORE CARD ── */}
                    <div className="bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/60 rounded-3xl p-5 border border-indigo-200/90 shadow-xs space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-indigo-100">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 shrink-0">
                            <Calculator className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-black text-slate-900">Performance Based Appraisal System (PBAS)</h4>
                              {currentFacultyPBAS?.status && (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  currentFacultyPBAS.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                  currentFacultyPBAS.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {currentFacultyPBAS.status}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                              AY {currentFacultyPBAS?.academicYear || '2025-26'} • PBAS Role: <span className="font-bold text-slate-700">{currentFacultyPBAS?.role ? currentFacultyPBAS.role.replace(/_/g, ' ') : (portfolioData.user?.designation || 'Faculty Member')}</span>
                            </p>
                          </div>
                        </div>

                        {currentFacultyPBAS?.score?.total !== undefined ? (
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Total PBAS Score</span>
                              <span className="text-xl font-black text-indigo-950 tabular-nums">
                                {currentFacultyPBAS.score.total.toFixed(1)} <span className="text-xs font-bold text-slate-400">/ 1000 pts</span>
                              </span>
                            </div>
                            <div className="px-3 py-1.5 bg-indigo-600 text-white font-black text-xs rounded-xl shadow-xs">
                              {((currentFacultyPBAS.score.total / 1000) * 100).toFixed(1)}%
                            </div>
                          </div>
                        ) : (
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-xl border border-slate-200">
                            Appraisal Pending / Not Started
                          </span>
                        )}
                      </div>

                      {/* 4 Section Breakdown Grid & Actions */}
                      {currentFacultyPBAS?.score ? (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="p-3 bg-white border border-blue-100 rounded-2xl space-y-1 shadow-2xs">
                              <span className="text-[10px] font-bold text-blue-600 block">I. Teaching</span>
                              <p className="text-base font-black text-slate-900 tabular-nums">{currentFacultyPBAS.score.teaching?.toFixed(1) || '0.0'} <span className="text-[10px] text-slate-400 font-normal">pts</span></p>
                            </div>
                            <div className="p-3 bg-white border border-violet-100 rounded-2xl space-y-1 shadow-2xs">
                              <span className="text-[10px] font-bold text-violet-600 block">II. Professional</span>
                              <p className="text-base font-black text-slate-900 tabular-nums">{currentFacultyPBAS.score.professional?.toFixed(1) || '0.0'} <span className="text-[10px] text-slate-400 font-normal">pts</span></p>
                            </div>
                            <div className="p-3 bg-white border border-emerald-100 rounded-2xl space-y-1 shadow-2xs">
                              <span className="text-[10px] font-bold text-emerald-600 block">III. Research</span>
                              <p className="text-base font-black text-slate-900 tabular-nums">{currentFacultyPBAS.score.research?.toFixed(1) || '0.0'} <span className="text-[10px] text-slate-400 font-normal">pts</span></p>
                            </div>
                            <div className="p-3 bg-white border border-amber-100 rounded-2xl space-y-1 shadow-2xs">
                              <span className="text-[10px] font-bold text-amber-600 block">IV. Administrative</span>
                              <p className="text-base font-black text-slate-900 tabular-nums">{currentFacultyPBAS.score.administrative?.toFixed(1) || '0.0'} <span className="text-[10px] text-slate-400 font-normal">pts</span></p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
                              <span>Overall PBAS Performance</span>
                              <span className="text-indigo-700 font-black">{currentFacultyPBAS.score.total?.toFixed(1)} / 1000 pts ({((currentFacultyPBAS.score.total / 1000) * 100).toFixed(1)}%)</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-200/80 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((currentFacultyPBAS.score.total / 1000) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 bg-white border border-dashed border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                          <div>
                            <p className="text-xs font-bold text-slate-700">
                              No PBAS appraisal has been recorded for AY 2025-26 yet.
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Faculty member has not submitted their appraisal for this year.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── CATEGORIZED WORK CARDS (BOOKS, JOURNALS, CONFERENCES, ETC.) ── */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-indigo-600" />
                          <span>Submitted & Approved Work Breakdown</span>
                        </h4>
                        <span className="text-xs font-bold text-slate-500">
                          {portfolioData.stats?.totalUploads || 0} Total Records ({portfolioData.stats?.approvedCount || 0} Approved)
                        </span>
                      </div>

                      {/* 1. Books & Book Chapters Card */}
                      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-slate-900">Books & Chapters</h5>
                              <p className="text-[10px] text-slate-400">Authored books, edited volumes, and chapter contributions</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black">
                            {portfolioData.portfolio?.books?.length || 0} Authored
                          </span>
                        </div>

                        {portfolioData.portfolio?.books?.length > 0 ? (
                          <div className="space-y-2">
                            {portfolioData.portfolio.books.map((work) => (
                              <div key={work._id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-bold text-slate-900">{work.title}</p>
                                  <p className="text-[10px] text-slate-500">
                                    Year: {work.year || work.metadata?.year || '2026'} • Status: <span className="font-bold text-emerald-600">{work.status}</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-md text-[11px]">
                                    +{work.credits} pts
                                  </span>
                                  {work.filePath && (
                                    <a
                                      href={getDocumentUrl(work.filePath)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                      title="View Proof"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic py-2">No book records submitted yet.</p>
                        )}
                      </div>

                      {/* 2. Journal Publications Card */}
                      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 font-bold">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-slate-900">Journal Publications</h5>
                              <p className="text-[10px] text-slate-400">Peer-reviewed international & national journals (SCI, Scopus, UGC)</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-black">
                            {portfolioData.portfolio?.publications?.length || 0} Papers
                          </span>
                        </div>

                        {portfolioData.portfolio?.publications?.length > 0 ? (
                          <div className="space-y-2">
                            {portfolioData.portfolio.publications.map((work) => (
                              <div key={work._id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-bold text-slate-900">{work.title}</p>
                                  <p className="text-[10px] text-slate-500">
                                    Journal: {work.metadata?.journalTitle || work.metadata?.journalName || 'Peer Reviewed'} • Indexing: {work.metadata?.indexing || 'SCI/Scopus'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-md text-[11px]">
                                    +{work.credits} pts
                                  </span>
                                  {work.filePath && (
                                    <a
                                      href={getDocumentUrl(work.filePath)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                      title="View Proof"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic py-2">No journal publications submitted yet.</p>
                        )}
                      </div>

                      {/* 3. Conference Proceedings Card */}
                      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 font-bold">
                              <TrendingUp className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-slate-900">Conference Proceedings</h5>
                              <p className="text-[10px] text-slate-400">Papers presented and published at IEEE, Springer & ACM conferences</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-black">
                            {portfolioData.portfolio?.conferences?.length || 0} Proceedings
                          </span>
                        </div>

                        {portfolioData.portfolio?.conferences?.length > 0 ? (
                          <div className="space-y-2">
                            {portfolioData.portfolio.conferences.map((work) => (
                              <div key={work._id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-bold text-slate-900">{work.title}</p>
                                  <p className="text-[10px] text-slate-500">
                                    Conference: {work.metadata?.conferenceName || 'International Conference'} • Year: {work.year}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-md text-[11px]">
                                    +{work.credits} pts
                                  </span>
                                  {work.filePath && (
                                    <a
                                      href={getDocumentUrl(work.filePath)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                      title="View Proof"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic py-2">No conference records submitted yet.</p>
                        )}
                      </div>

                      {/* 4. NPTEL, Certifications & Other Works Card */}
                      {((portfolioData.portfolio?.nptel?.length || 0) > 0 || (portfolioData.portfolio?.workshops?.length || 0) > 0 || (portfolioData.portfolio?.others?.length || 0) > 0) && (
                        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-xl bg-blue-50 text-blue-700 font-bold">
                                <Award className="w-4 h-4" />
                              </div>
                              <div>
                                <h5 className="text-xs font-black text-slate-900">NPTEL, FDPs & Additional Contributions</h5>
                                <p className="text-[10px] text-slate-400">Faculty development, certifications, and technical workshops</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {[...(portfolioData.portfolio.nptel || []), ...(portfolioData.portfolio.workshops || []), ...(portfolioData.portfolio.others || [])].map((work) => (
                              <div key={work._id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-bold text-slate-900">{work.title}</p>
                                  <p className="text-[10px] text-slate-500">
                                    Category: {work.category} • Year: {work.year}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-md text-[11px]">
                                    +{work.credits} pts
                                  </span>
                                  {work.filePath && (
                                    <a
                                      href={getDocumentUrl(work.filePath)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                      title="View Proof"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-rose-500 text-center py-10">Unable to load faculty records.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
