import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, AlertTriangle, Info, CheckCircle2, HelpCircle } from 'lucide-react';

/**
 * PBASParameterRow — Renders a single PBAS parameter with input fields,
 * score display, and expandable calculation explanation.
 */
export default function PBASParameterRow({ paramConfig, paramResult, inputs, onInputChange, readOnly }) {
  const [showExplain, setShowExplain] = useState(false);

  const statusColors = {
    OK:                       'text-emerald-600',
    MISSING_DATA:             'text-slate-400',
    REQUIRES_CLARIFICATION:   'text-amber-600',
    UNKNOWN_FORMULA:          'text-rose-500',
  };

  const statusIcons = {
    OK:                       <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
    MISSING_DATA:             <HelpCircle className="w-3.5 h-3.5 text-slate-400" />,
    REQUIRES_CLARIFICATION:   <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
    UNKNOWN_FORMULA:          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />,
  };

  const { key, label, maxScore, formula, inputFields, components, description, status: ruleStatus, clarificationNote } = paramConfig;
  const result = paramResult || {};
  const paramStatus = result.status || 'MISSING_DATA';

  // Determine what input fields to render
  const renderInputFields = () => {
    // Checklist type — render named activity checkboxes with optional role selection
    if (formula === 'CHECKLIST' && paramConfig.activities?.length) {
      const activities = paramConfig.activities;
      const roles = paramConfig.roles || [];
      const hasRoles = roles.length > 0;

      return (
        <div className="mt-2 space-y-1">
          {activities.map(act => {
            const entry = inputs?.[act.key] || {};
            const isChecked = entry.enabled === true || entry === true;
            const currentRole = entry.role || (roles[0]?.value || '');

            return (
              <div key={act.key} className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={e => {
                    if (hasRoles) {
                      onInputChange(act.key, e.target.checked ? { enabled: true, role: currentRole } : { enabled: false });
                    } else {
                      onInputChange(act.key, e.target.checked);
                    }
                  }}
                  disabled={readOnly}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 shrink-0"
                />
                <span className={`text-[10px] font-medium flex-1 min-w-0 ${isChecked ? 'text-slate-800' : 'text-slate-400'}`}>
                  {act.label}
                </span>
                {hasRoles && isChecked && (
                  <select
                    value={currentRole}
                    onChange={e => onInputChange(act.key, { enabled: true, role: e.target.value })}
                    disabled={readOnly}
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-slate-200 bg-white focus:border-blue-500 outline-none"
                  >
                    {roles.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // Component type — render sub-component inputs
    if (formula === 'COMPONENT' && components?.length) {
      return (
        <div className="space-y-2 mt-2">
          {components.map(comp => (
            <div key={comp.key} className="flex items-center gap-2">
              <label className="text-[10px] font-semibold text-slate-500 flex-1 min-w-0 truncate" title={comp.label}>
                {comp.label}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={inputs?.[comp.key] ?? ''}
                onChange={e => onInputChange(comp.key, e.target.value)}
                disabled={readOnly}
                className="w-20 px-2 py-1 text-xs font-semibold text-right rounded-lg border border-slate-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          ))}
        </div>
      );
    }

    // Regular input fields
    if (inputFields?.length) {
      return (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {inputFields.map(field => (
            <div key={field.key} className="flex items-center gap-1.5">
              <label className="text-[10px] font-semibold text-slate-500 whitespace-nowrap" title={field.label}>
                {field.label}
              </label>
              <input
                type="number"
                min={field.min ?? 0}
                max={field.max}
                step="any"
                value={inputs?.[field.key] ?? ''}
                onChange={e => onInputChange(field.key, e.target.value)}
                disabled={readOnly}
                className="w-20 px-2 py-1 text-xs font-semibold text-right rounded-lg border border-slate-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="border border-slate-100 rounded-xl px-4 py-3 bg-white hover:border-slate-200 transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {statusIcons[paramStatus]}
            <span className="text-xs font-bold text-slate-800 leading-tight">{label}</span>
            {ruleStatus === 'REQUIRES_CLARIFICATION' && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-700 uppercase tracking-wide shrink-0">
                Needs Clarification
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-black tabular-nums ${statusColors[paramStatus]}`}>
            {result.finalScore?.toFixed(2) ?? '0.00'}
          </span>
          <span className="text-[10px] font-semibold text-slate-400">/ {maxScore}</span>
          <button
            type="button"
            onClick={() => setShowExplain(!showExplain)}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
            title="How was this calculated?"
          >
            <Info className={`w-3.5 h-3.5 ${showExplain ? 'text-blue-600' : 'text-slate-400'}`} />
          </button>
        </div>
      </div>

      {/* Input fields */}
      {renderInputFields()}

      {/* Calculation Explanation */}
      <AnimatePresence>
        {showExplain && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Calculation Details</p>
              {description && (
                <p className="text-[10px] text-slate-500">{description}</p>
              )}
              {result.formulaExplain && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-500">Formula:</span>
                  <code className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{result.formulaExplain}</code>
                </div>
              )}
              {result.rawScore !== result.finalScore && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-500">Raw Score:</span>
                  <span className="text-[10px] font-mono text-slate-600">{result.rawScore}</span>
                  <span className="text-[10px] text-slate-400">→ capped at {maxScore}</span>
                </div>
              )}
              {/* Component breakdown */}
              {result.componentResults?.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {result.componentResults.map(cr => (
                    <div key={cr.key} className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 truncate">{cr.label}</span>
                      <span className="font-mono text-slate-700 font-semibold">{cr.score.toFixed(2)} / {cr.maxScore}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Warnings */}
              {result.warnings?.length > 0 && (
                <div className="mt-1">
                  {result.warnings.map((w, i) => (
                    <p key={i} className="text-[10px] text-amber-600 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      {w}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
