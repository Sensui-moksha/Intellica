import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calculator, Save, Send, RefreshCw, AlertTriangle,
  ChevronDown, GraduationCap, CalendarDays, User, Sparkles
} from 'lucide-react';
import PBASSection from './PBASSection';
import PBASScoreSummary from './PBASScoreSummary';
import { calculatePBAS } from './pbasClientCalculator';
import { pbasApi } from '../../api/services';

// ── PBAS Rule definitions (imported inline to avoid backend dependency) ────
// These are fetched from the API on mount
const ROLE_OPTIONS = [
  { value: 'ASSISTANT_PROFESSOR', label: 'Assistant Professor' },
  { value: 'ASSOCIATE_PROFESSOR', label: 'Associate Professor' },
  { value: 'PROFESSOR',           label: 'Professor' },
];

function getDefaultAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // Academic year starts in June
  if (month >= 5) return `${year}-${String(year + 1).slice(2)}`;
  return `${year - 1}-${String(year).slice(2)}`;
}

const YEAR_OPTIONS = (() => {
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear + 1; y >= currentYear - 5; y--) {
    years.push(`${y}-${String(y + 1).slice(2)}`);
  }
  return years;
})();

/**
 * PBASAppraisalModal — Full PBAS Appraisal interface.
 *
 * Props:
 *   isOpen       — boolean
 *   onClose      — callback
 *   facultyName  — string (display name)
 *   designation  — string (from Faculty model)
 *   facultyId    — string (optional, for save)
 */
export default function PBASAppraisalModal({ isOpen, onClose, facultyName, designation, facultyId }) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [role, setRole] = useState('');
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());
  const [activeSemester, setActiveSemester] = useState(1);
  const [rules, setRules] = useState(null);
  const [loadingRules, setLoadingRules] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Input state per semester: { teaching: { weeklyTeachingLoad: { theoryLoad: 12, labLoad: 4 }, ... }, ... }
  const [semester1, setSemester1] = useState({});
  const [semester2, setSemester2] = useState({});

  // Calculation result
  const [calcResult, setCalcResult] = useState(null);

  // ── Auto-detect role directly from user designation/role ─────────────────
  useEffect(() => {
    if (designation) {
      const d = designation.trim().toLowerCase();
      if (d.includes('associate') || d.includes('assoc')) {
        setRole('ASSOCIATE_PROFESSOR');
      } else if (d.includes('assistant') || d.includes('asst') || d.includes('lecturer')) {
        setRole('ASSISTANT_PROFESSOR');
      } else if (d.includes('professor') || d.includes('prof') || d.includes('hod') || d.includes('head') || d.includes('dean') || d.includes('principal')) {
        setRole('PROFESSOR');
      } else {
        setRole('ASSISTANT_PROFESSOR');
      }
    } else if (!role) {
      setRole('ASSISTANT_PROFESSOR');
    }
  }, [designation]);

  // ── Fetch rules when role changes ─────────────────────────────────────────
  useEffect(() => {
    if (!role || !isOpen) return;
    setLoadingRules(true);
    pbasApi.getRules(role)
      .then(res => {
        setRules(res.data?.rules || null);
      })
      .catch(err => {
        console.error('[PBAS] Failed to load rules:', err);
        setRules(null);
      })
      .finally(() => setLoadingRules(false));
  }, [role, isOpen]);

  // ── Try to load existing appraisal ────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !academicYear) return;
    const fetchPromise = facultyId
      ? pbasApi.getForReview(facultyId, academicYear).catch(() => pbasApi.getMyAppraisal(academicYear))
      : pbasApi.getMyAppraisal(academicYear);

    fetchPromise
      .then(res => {
        const appraisal = res.data;
        if (appraisal) {
          if (appraisal.role) setRole(appraisal.role);
          if (appraisal.semester1) setSemester1(appraisal.semester1);
          if (appraisal.semester2) setSemester2(appraisal.semester2);
        }
      })
      .catch(() => { /* No existing appraisal — that's fine */ });
  }, [isOpen, academicYear, facultyId]);

  // ── Recalculate whenever inputs or role changes ───────────────────────────
  useEffect(() => {
    if (!rules) {
      setCalcResult(null);
      return;
    }
    const result = calculatePBAS(rules, semester1, semester2);
    setCalcResult(result);
  }, [rules, semester1, semester2]);

  // ── Input change handler ──────────────────────────────────────────────────
  const handleInputChange = useCallback((sectionKey, paramKey, fieldKey, value) => {
    const setter = activeSemester === 1 ? setSemester1 : setSemester2;
    setter(prev => {
      const section = { ...(prev[sectionKey] || {}) };
      const param = { ...(section[paramKey] || {}) };
      param[fieldKey] = value === '' ? '' : value;
      section[paramKey] = param;
      return { ...prev, [sectionKey]: section };
    });
  }, [activeSemester]);

  // ── Save to backend ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!role || !academicYear) return;
    setSaving(true);
    setSaveMessage('');
    try {
      await pbasApi.saveAppraisal({
        academicYear,
        role,
        semester1,
        semester2,
        facultyId: facultyId || undefined,
      });
      setSaveMessage('✅ Saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveMessage('❌ Failed to save: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // ── Auto-sync from verified uploads ──────────────────────────────────────
  const handleAutoSync = async () => {
    setSyncing(true);
    setSaveMessage('');
    try {
      const res = await pbasApi.syncActivities({
        facultyId: facultyId || undefined,
        academicYear,
        semester1,
      });
      if (res.data?.semester1) {
        setSemester1(res.data.semester1);
        const count = res.data.totalApprovedActivities || 0;
        setSaveMessage(`✨ Synced from ${count} approved activities!`);
      }
      setTimeout(() => setSaveMessage(''), 4000);
    } catch (err) {
      setSaveMessage('❌ Auto-sync failed: ' + (err.response?.data?.message || err.message));
      setTimeout(() => setSaveMessage(''), 4000);
    } finally {
      setSyncing(false);
    }
  };

  // ── Current semester data ─────────────────────────────────────────────────
  const currentSemester = activeSemester === 1 ? semester1 : semester2;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* ─── Header ─── */}
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-[#070f23] via-[#0e1d45] to-[#142e6b] text-white shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                    <Calculator className="w-5 h-5 text-blue-300" />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight">PBAS Appraisal</h2>
                    <p className="text-[11px] font-semibold text-white/60">Performance Based Appraisal System</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>

              {/* Faculty info bar */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">
                  <User className="w-3.5 h-3.5 text-blue-300" />
                  <span className="text-xs font-bold">{facultyName || 'Faculty'}</span>
                </div>

                {/* Role Selector */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">
                  <GraduationCap className="w-3.5 h-3.5 text-violet-300" />
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer appearance-none pr-4"
                    style={{ backgroundImage: "none" }}
                  >
                    <option value="" disabled className="text-slate-900">Select Role</option>
                    {ROLE_OPTIONS.map(r => (
                      <option key={r.value} value={r.value} className="text-slate-900">{r.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-white/50 -ml-3" />
                </div>

                {/* Academic Year Selector */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">
                  <CalendarDays className="w-3.5 h-3.5 text-emerald-300" />
                  <select
                    value={academicYear}
                    onChange={e => setAcademicYear(e.target.value)}
                    className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer appearance-none pr-4"
                  >
                    {YEAR_OPTIONS.map(y => (
                      <option key={y} value={y} className="text-slate-900">{y}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-white/50 -ml-3" />
                </div>
              </div>
            </div>

            {/* ─── Semester Tabs ─── */}
            <div className="px-6 pt-4 pb-2 flex items-center justify-between gap-3 shrink-0 bg-white border-b border-slate-100 flex-wrap">
              <div className="flex items-center gap-2">
                {[1, 2].map(sem => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setActiveSemester(sem)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeSemester === sem
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semester {sem === 1 ? 'I' : 'II'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5">
                {saveMessage && (
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 animate-pulse">
                    {saveMessage}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleAutoSync}
                  disabled={syncing}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  title="Auto-calculate research, books, journals, NPTEL, patents, and awards from approved upload records"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-indigo-600 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Auto-Calculating…' : '⚡ Auto-Fill from Approved Activities'}</span>
                </button>
              </div>
            </div>

            {/* ─── Body ─── */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Loading state */}
              {loadingRules && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold text-slate-500">Loading PBAS rules…</p>
                </div>
              )}

              {/* No role selected */}
              {!role && !loadingRules && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <GraduationCap className="w-12 h-12 text-slate-300" />
                  <p className="text-sm font-bold text-slate-500">Select a faculty designation to begin</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Choose Assistant Professor, Associate Professor, or Professor to load the corresponding PBAS rule set.
                  </p>
                </div>
              )}

              {/* Rules loaded — render sections */}
              {rules && !loadingRules && (
                <>
                  {/* Unresolved rules warning */}
                  {calcResult?.unresolvedRules?.length > 0 && (
                    <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-800">Unresolved Rules</p>
                        <p className="text-[10px] text-amber-600 mt-0.5">
                          {calcResult.unresolvedRules.length} parameter(s) require institutional clarification.
                          Scores for these parameters may use fallback formulas.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Sections */}
                  {rules.sections.map(section => {
                    const sectionResult = calcResult?.sections?.find(s => s.key === section.key);

                    return (
                      <PBASSection
                        key={section.key}
                        sectionConfig={section}
                        sectionResult={sectionResult}
                        inputs={currentSemester[section.key] || {}}
                        onInputChange={handleInputChange}
                        readOnly={false}
                      />
                    );
                  })}

                  {/* Score Summary */}
                  {calcResult && (
                    <PBASScoreSummary calcResult={calcResult} />
                  )}
                </>
              )}
            </div>

            {/* ─── Footer ─── */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Force recalculate
                    if (rules) {
                      const result = calculatePBAS(rules, semester1, semester2);
                      setCalcResult(result);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Recalculate
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !role}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
