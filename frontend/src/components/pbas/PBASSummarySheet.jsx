import React from 'react';
import { ClipboardCheck, TrendingUp } from 'lucide-react';

/**
 * PBASSummarySheet — Displays the score summary table matching the paper form.
 * Shows Self-Score, HoD/DFAC Score, and IFAC Score columns.
 */
export default function PBASSummarySheet({ calcResult, rules, facultyName, department, hodScores, ifacScores }) {
  if (!calcResult || !rules) return null;

  const sections = [
    { key: 'teaching', numeral: 'I', label: 'Teaching, Learning & Evaluation Related Activities' },
    { key: 'professional', numeral: 'II', label: 'Professional Development & Co-Curricular Activities' },
    { key: 'research', numeral: 'III', label: 'Research & Academic Contributions' },
    { key: 'administrative', numeral: 'IV', label: 'Administrative and Extension Activities' },
  ];

  const reviewerLabel = rules.reviewerLabel || 'HoD';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardCheck className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">Summary Sheet</h3>
        </div>
        {(facultyName || department) && (
          <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-500">
            {facultyName && <span>Name: <span className="text-slate-700">{facultyName}</span></span>}
            {department && <span>Department: <span className="text-slate-700">{department}</span></span>}
          </div>
        )}
      </div>

      {/* Score Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 font-bold text-[10px] text-slate-500 uppercase tracking-wider w-12">S.No</th>
              <th className="text-left px-4 py-2.5 font-bold text-[10px] text-slate-500 uppercase tracking-wider">Evaluation Parameter</th>
              <th className="text-center px-4 py-2.5 font-bold text-[10px] text-slate-500 uppercase tracking-wider w-20">Max Score</th>
              <th className="text-center px-4 py-2.5 font-bold text-[10px] text-indigo-600 uppercase tracking-wider w-24">Self-Score</th>
              <th className="text-center px-4 py-2.5 font-bold text-[10px] text-blue-600 uppercase tracking-wider w-24">{reviewerLabel} Score</th>
              <th className="text-center px-4 py-2.5 font-bold text-[10px] text-violet-600 uppercase tracking-wider w-24">IFAC Score</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((sec) => {
              const sectionResult = calcResult.sections?.find(s => s.key === sec.key);
              const sectionConfig = rules.sections?.find(s => s.key === sec.key);
              const selfScore = sectionResult?.finalScore ?? 0;
              const maxScore = sectionConfig?.maxScore ?? 0;
              const hodScore = hodScores?.[sec.key];
              const ifacScore = ifacScores?.[sec.key];

              const scorePercent = maxScore > 0 ? (selfScore / maxScore) * 100 : 0;
              const barColor = scorePercent >= 75 ? 'bg-emerald-500' : scorePercent >= 50 ? 'bg-blue-500' : scorePercent >= 25 ? 'bg-amber-500' : 'bg-red-500';

              return (
                <tr key={sec.key} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-black text-slate-400">{sec.numeral}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-700 text-[11px]">{sec.label}</p>
                    {/* Mini progress bar */}
                    <div className="mt-1.5 w-full max-w-[180px] h-1 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${Math.min(scorePercent, 100)}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-500">{maxScore}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 font-black text-indigo-700 text-[11px] tabular-nums">
                      {selfScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {hodScore != null ? (
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-50 font-black text-blue-700 text-[11px] tabular-nums">
                        {Number(hodScore).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-[10px]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {ifacScore != null ? (
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-violet-50 font-black text-violet-700 text-[11px] tabular-nums">
                        {Number(ifacScore).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-[10px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gradient-to-r from-slate-50 to-indigo-50 border-t-2 border-slate-200">
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 font-black text-slate-800 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> Total
              </td>
              <td className="px-4 py-3 text-center font-black text-slate-600">{calcResult.totalMax}</td>
              <td className="px-4 py-3 text-center">
                <span className="inline-block px-3 py-1.5 rounded-xl bg-indigo-600 font-black text-white text-xs tabular-nums shadow-sm">
                  {calcResult.totalScore?.toFixed(1)}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                {hodScores?.total != null ? (
                  <span className="inline-block px-3 py-1.5 rounded-xl bg-blue-600 font-black text-white text-xs tabular-nums shadow-sm">
                    {Number(hodScores.total).toFixed(1)}
                  </span>
                ) : (
                  <span className="text-slate-300 text-[10px]">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                {ifacScores?.total != null ? (
                  <span className="inline-block px-3 py-1.5 rounded-xl bg-violet-600 font-black text-white text-xs tabular-nums shadow-sm">
                    {Number(ifacScores.total).toFixed(1)}
                  </span>
                ) : (
                  <span className="text-slate-300 text-[10px]">—</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
