import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, BookOpen, Briefcase, FlaskConical, Building2 } from 'lucide-react';

const SECTION_META = [
  { key: 'teaching',       label: 'Teaching',      icon: BookOpen,     color: 'blue' },
  { key: 'professional',   label: 'Professional',  icon: Briefcase,    color: 'violet' },
  { key: 'research',       label: 'Research',       icon: FlaskConical, color: 'emerald' },
  { key: 'administrative', label: 'Administrative', icon: Building2,    color: 'amber' },
];

const COLOR_MAP = {
  blue:    { bg: 'bg-blue-50',    ring: 'ring-blue-200',    text: 'text-blue-700',    bar: 'bg-blue-600' },
  violet:  { bg: 'bg-violet-50',  ring: 'ring-violet-200',  text: 'text-violet-700',  bar: 'bg-violet-600' },
  emerald: { bg: 'bg-emerald-50', ring: 'ring-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-600' },
  amber:   { bg: 'bg-amber-50',   ring: 'ring-amber-200',   text: 'text-amber-700',   bar: 'bg-amber-600' },
};

/**
 * PBASScoreSummary — Bottom summary bar showing section scores + total / 1000.
 */
export default function PBASScoreSummary({ calcResult }) {
  if (!calcResult?.success) return null;

  const { totalScore, totalMax, percentage, sections } = calcResult;

  // Determine total score color
  const totalColor = percentage >= 75 ? 'text-emerald-600' : percentage >= 50 ? 'text-blue-600' : percentage >= 25 ? 'text-amber-600' : 'text-rose-600';
  const totalBarColor = percentage >= 75 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-blue-500' : percentage >= 25 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white overflow-hidden shadow-sm">
      {/* Section scores grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100">
        {SECTION_META.map(meta => {
          const section = sections?.find(s => s.key === meta.key);
          const score = section?.finalScore || 0;
          const max = section?.maxScore || 0;
          const pct = max > 0 ? (score / max) * 100 : 0;
          const c = COLOR_MAP[meta.color];
          const Icon = meta.icon;

          return (
            <div key={meta.key} className="bg-white p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-lg ${c.bar} text-white flex items-center justify-center`}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">{meta.label}</span>
              </div>
              <p className={`text-base font-black tabular-nums ${c.text}`}>
                {score.toFixed(1)}
                <span className="text-xs font-bold text-slate-400 ml-0.5">/ {max}</span>
              </p>
              {/* Mini progress */}
              <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pct, 100)}%` }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className={`h-full rounded-full ${c.bar}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Grand total */}
      <div className="px-5 py-4 bg-gradient-to-r from-[#070f23] via-[#0e1d45] to-[#142e6b] text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-wide">Total PBAS Score</p>
              <p className="text-2xl font-black tabular-nums leading-tight">
                {totalScore.toFixed(1)}
                <span className="text-sm font-bold text-white/40 ml-1">/ {totalMax}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-3xl font-black tabular-nums text-white">
              {percentage.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Total progress bar */}
        <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className={`h-full rounded-full ${totalBarColor}`}
          />
        </div>
      </div>
    </div>
  );
}
