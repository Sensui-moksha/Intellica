import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, ChevronLeft, ChevronRight, Save, Send, Check,
  User, GraduationCap, BookOpen, Briefcase, FlaskConical, Building2, ClipboardCheck,
  AlertTriangle, Loader2
} from 'lucide-react';
import PBASSection from '../../components/pbas/PBASSection';
import PBASSummarySheet from '../../components/pbas/PBASSummarySheet';
import PBASGeneralInfo from '../../components/pbas/PBASGeneralInfo';
import { calculatePBAS } from '../../components/pbas/pbasClientCalculator';
import { pbasApi } from '../../api/services';

const STEPS = [
  { key: 'general', label: 'General Information', icon: User, color: 'from-slate-600 to-slate-800' },
  { key: 'summary', label: 'Summary Sheet', icon: ClipboardCheck, color: 'from-indigo-600 to-indigo-800' },
  { key: 'teaching', label: 'Section I — Teaching', icon: BookOpen, color: 'from-blue-600 to-blue-800' },
  { key: 'professional', label: 'Section II — Professional', icon: Briefcase, color: 'from-violet-600 to-violet-800' },
  { key: 'research', label: 'Section III — Research', icon: FlaskConical, color: 'from-emerald-600 to-emerald-800' },
  { key: 'administrative', label: 'Section IV — Administrative', icon: Building2, color: 'from-amber-600 to-amber-800' },
  { key: 'review', label: 'Review & Submit', icon: Send, color: 'from-rose-600 to-rose-800' },
];

const academicYear = '2024-25';

export default function PBASAppraisal() {
  const [step, setStep] = useState(0);
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [generalInfo, setGeneralInfo] = useState({
    employeeId: '', dateOfJoining: '', email: '', mobile: '',
    educationalQualifications: [{ degree: '', periodOfStudy: '', university: '', classCgpa: '', yearOfPass: '' }],
    totalExperience: '', experienceInMIC: '', universityRatification: '',
    totalEmoluments: { basic: '', gross: '' }, dateOfBirth: '', address: '',
  });
  const [semester1, setSemester1] = useState({});
  const [semester2, setSemester2] = useState({});
  const [appraisalId, setAppraisalId] = useState(null);
  const [appraisalStatus, setAppraisalStatus] = useState('DRAFT');

  // Faculty info from profile
  const [facultyProfile, setFacultyProfile] = useState(null);
  const [role, setRole] = useState('ASSISTANT_PROFESSOR');

  // Load rules and existing appraisal
  useEffect(() => {
    async function load() {
      try {
        // Get faculty profile to determine role
        const profileRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const profileData = await profileRes.json();
        setFacultyProfile(profileData);

        // Map designation to PBAS role
        const designation = (profileData.designation || '').toLowerCase();
        let pbasRole = 'ASSISTANT_PROFESSOR';
        if (designation.includes('associate') || designation.includes('assoc')) pbasRole = 'ASSOCIATE_PROFESSOR';
        else if (designation.includes('professor') && !designation.includes('assistant') && !designation.includes('asst')) pbasRole = 'PROFESSOR';
        setRole(pbasRole);

        // Fetch rules for this role
        const rulesRes = await pbasApi.getRules(pbasRole);
        setRules(rulesRes.data.rules);

        // Try to load existing appraisal
        try {
          const appraisalRes = await pbasApi.getMyAppraisal(academicYear);
          const data = appraisalRes.data;
          if (data) {
            if (data._id) setAppraisalId(data._id);
            if (data.semester1) setSemester1(data.semester1);
            if (data.semester2) setSemester2(data.semester2);
            if (data.status) setAppraisalStatus(data.status);
            if (data.generalInfo) {
              setGeneralInfo(prev => ({ ...prev, ...data.generalInfo }));
            }
          }
          // Auto-populate generalInfo from profile
          if (profileData && !data?.generalInfo?.employeeId) {
            setGeneralInfo(prev => ({
              ...prev,
              employeeId: profileData.employeeId || prev.employeeId,
              email: profileData.email || prev.email,
              mobile: profileData.mobile || prev.mobile,
            }));
          }
        } catch {
          // No existing appraisal — auto-populate from profile
          if (profileData) {
            setGeneralInfo(prev => ({
              ...prev,
              employeeId: profileData.employeeId || '',
              email: profileData.email || '',
              mobile: profileData.mobile || '',
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load PBAS data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Calculate scores in real-time
  const calcResult = useMemo(() => {
    if (!rules) return null;
    return calculatePBAS(rules, semester1, Object.keys(semester2).length > 0 ? semester2 : null);
  }, [rules, semester1, semester2]);

  // Input change handler for section data
  const handleInputChange = useCallback((sectionKey, paramKey, fieldKey, value) => {
    setSemester1(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [paramKey]: {
          ...prev[sectionKey]?.[paramKey],
          [fieldKey]: value,
        },
      },
    }));
  }, []);

  // Save draft
  const handleSave = async () => {
    if (!rules) return;
    setSaving(true);
    try {
      const res = await pbasApi.saveAppraisal({
        academicYear, role, semester1, semester2, generalInfo,
      });
      if (res.data?.appraisal?._id) {
        setAppraisalId(res.data.appraisal._id);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Submit for review
  const handleSubmit = async () => {
    if (!appraisalId) {
      await handleSave();
    }
    setSubmitting(true);
    try {
      if (appraisalId) {
        await pbasApi.submitAppraisal(appraisalId);
        setAppraisalStatus('SUBMITTED');
      }
    } catch (err) {
      console.error('Submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const isReadOnly = appraisalStatus !== 'DRAFT' && appraisalStatus !== 'REVISION_REQUIRED';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const currentStep = STEPS[step];
  const StepIcon = currentStep.icon;
  const sectionConfig = rules?.sections?.find(s => s.key === currentStep.key);
  const sectionResult = calcResult?.sections?.find(s => s.key === currentStep.key);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-800 p-6 text-white shadow-xl"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.3)_0%,transparent_70%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">PBAS Self-Appraisal Form</h1>
              <p className="text-xs text-blue-200 font-semibold">
                {rules?.label || role.replace(/_/g, ' ')} • AY {academicYear}
              </p>
            </div>
          </div>

          {/* Faculty info pills */}
          {facultyProfile && (
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 backdrop-blur-sm">
                {facultyProfile.name}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 backdrop-blur-sm">
                {facultyProfile.department}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${
                appraisalStatus === 'DRAFT' ? 'bg-amber-500/20 text-amber-200' :
                appraisalStatus === 'SUBMITTED' ? 'bg-blue-500/20 text-blue-200' :
                appraisalStatus === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-200' :
                'bg-white/10'
              }`}>
                {appraisalStatus}
              </span>
            </div>
          )}

          {/* Total score */}
          {calcResult && (
            <div className="absolute top-6 right-6 text-right">
              <p className="text-3xl font-black tabular-nums">{calcResult.totalScore?.toFixed(1)}</p>
              <p className="text-xs font-bold text-blue-300">/ {calcResult.totalMax}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                isActive ? 'bg-gradient-to-r ' + s.color + ' text-white shadow-lg scale-105'
                : isDone ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isDone ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 0: General Information */}
          {step === 0 && (
            <PBASGeneralInfo
              generalInfo={generalInfo}
              onChange={setGeneralInfo}
              role={role}
              readOnly={isReadOnly}
            />
          )}

          {/* Step 1: Summary Sheet */}
          {step === 1 && calcResult && rules && (
            <PBASSummarySheet
              calcResult={calcResult}
              rules={rules}
              facultyName={facultyProfile?.name}
              department={facultyProfile?.department}
            />
          )}

          {/* Steps 2-5: Sections I-IV */}
          {step >= 2 && step <= 5 && sectionConfig && (
            <PBASSection
              sectionConfig={sectionConfig}
              sectionResult={sectionResult}
              inputs={semester1[sectionConfig.key] || {}}
              onInputChange={handleInputChange}
              readOnly={isReadOnly}
            />
          )}

          {/* Step 6: Review & Submit */}
          {step === 6 && calcResult && (
            <div className="space-y-4">
              <PBASSummarySheet
                calcResult={calcResult}
                rules={rules}
                facultyName={facultyProfile?.name}
                department={facultyProfile?.department}
              />

              {/* Warnings */}
              {calcResult.warnings?.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Warnings
                  </p>
                  {calcResult.warnings.map((w, i) => (
                    <p key={i} className="text-[10px] text-amber-600">{JSON.stringify(w)}</p>
                  ))}
                </div>
              )}

              {/* Submit button */}
              {!isReadOnly && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit for {rules?.reviewerLabel || 'HoD'} Review
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation + Save */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-30 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Draft
            </button>
          )}
          <button
            onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
            disabled={step === STEPS.length - 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-30 cursor-pointer"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
