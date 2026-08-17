import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, BookOpen, Briefcase, FlaskConical, Building2 } from 'lucide-react';
import PBASParameterRow from './PBASParameterRow';

const SECTION_ICONS = {
  teaching:       BookOpen,
  professional:   Briefcase,
  research:       FlaskConical,
  administrative: Building2,
};

const SECTION_COLORS = {
  teaching:       { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', bar: 'bg-blue-600' },
  professional:   { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', bar: 'bg-violet-600' },
  research:       { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-600' },
  administrative: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-600' },
};

/**
 * PBASSection — Collapsible section showing section name, score, progress bar,
 * and child parameter rows.
 */
export default function PBASSection({ sectionConfig, sectionResult, inputs, onInputChange, readOnly }) {
  const [expanded, setExpanded] = useState(false);

  const { key, label, maxScore } = sectionConfig;
  const score = sectionResult?.finalScore || 0;
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;

  const Icon = SECTION_ICONS[key] || BookOpen;
  const colors = SECTION_COLORS[key] || SECTION_COLORS.teaching;

  const sectionIndex = { teaching: 'I', professional: 'II', research: 'III', administrative: 'IV' };

  return (
    <div className={`rounded-2xl border ${colors.border} overflow-hidden transition-all`}>
      {/* Section Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-5 py-4 ${colors.bg} hover:brightness-97 transition-all cursor-pointer`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl ${colors.bar} text-white flex items-center justify-center shadow-sm`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              Section {sectionIndex[key] || ''}
            </p>
            <p className={`text-sm font-extrabold ${colors.text} leading-tight`}>{label}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Score */}
          <div className="text-right">
            <p className={`text-lg font-black tabular-nums ${colors.text}`}>
              {score.toFixed(1)}
              <span className="text-xs font-bold text-slate-400 ml-1">/ {maxScore}</span>
            </p>
          </div>
          {/* Expand/Collapse */}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className={`w-5 h-5 ${colors.text}`} />
          </motion.div>
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full ${colors.bar} rounded-full`}
        />
      </div>

      {/* Parameters — collapsible */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 bg-white">
              {/* Semester averaged notice */}
              {sectionResult?.isAveraged && (
                <div className="px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-semibold text-indigo-600 mb-2">
                  ⚖️ This section is averaged across Semester I & Semester II
                  {sectionResult.semester1Score !== undefined && (
                    <span className="ml-2 text-indigo-500">
                      (Sem I: {sectionResult.semester1Score?.toFixed(1)} | Sem II: {sectionResult.semester2Score?.toFixed(1)})
                    </span>
                  )}
                </div>
              )}

              {sectionConfig.parameters.map((param, idx) => {
                const paramResult = sectionResult?.parameters?.[idx] || null;
                const paramInputs = inputs?.[param.key] || inputs || {};

                return (
                  <PBASParameterRow
                    key={param.key}
                    paramConfig={param}
                    paramResult={paramResult}
                    inputs={paramInputs}
                    onInputChange={(fieldKey, value) => onInputChange(key, param.key, fieldKey, value)}
                    readOnly={readOnly}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
