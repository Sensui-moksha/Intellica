import React from 'react';
import { User, GraduationCap, Plus, Trash2 } from 'lucide-react';

/**
 * PBASGeneralInfo — Renders the Personal Details + Educational Qualifications
 * form section. Fields shown depend on the faculty role.
 */
export default function PBASGeneralInfo({ generalInfo, onChange, role, readOnly = false }) {
  const isProf = role === 'PROFESSOR';
  const isAsst = role === 'ASSISTANT_PROFESSOR';

  const update = (key, value) => {
    onChange(prev => ({ ...prev, [key]: value }));
  };

  const updateNested = (parent, key, value) => {
    onChange(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [key]: value },
    }));
  };

  const updateQualification = (index, key, value) => {
    onChange(prev => {
      const quals = [...(prev.educationalQualifications || [])];
      quals[index] = { ...quals[index], [key]: value };
      return { ...prev, educationalQualifications: quals };
    });
  };

  const addQualification = () => {
    onChange(prev => ({
      ...prev,
      educationalQualifications: [
        ...(prev.educationalQualifications || []),
        { degree: '', periodOfStudy: '', university: '', classCgpa: '', yearOfPass: '' },
      ],
    }));
  };

  const removeQualification = (index) => {
    onChange(prev => ({
      ...prev,
      educationalQualifications: prev.educationalQualifications.filter((_, i) => i !== index),
    }));
  };

  const quals = generalInfo.educationalQualifications || [];
  const inputCls = "w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400";
  const labelCls = "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block";

  return (
    <div className="space-y-6">
      {/* Personal Details */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <User className="w-4 h-4 text-slate-600" />
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">Personal Details</h3>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Employee ID</label>
            <input
              type="text"
              value={generalInfo.employeeId || ''}
              onChange={e => update('employeeId', e.target.value)}
              disabled={readOnly}
              className={inputCls}
              placeholder="Enter Employee ID"
            />
          </div>

          {!isProf && (
            <>
              <div>
                <label className={labelCls}>Total Experience (Years)</label>
                <input
                  type="number"
                  min="0"
                  value={generalInfo.totalExperience ?? ''}
                  onChange={e => update('totalExperience', e.target.value)}
                  disabled={readOnly}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Date of Joining & Experience in MIC</label>
                <input
                  type="text"
                  value={generalInfo.experienceInMIC || ''}
                  onChange={e => update('experienceInMIC', e.target.value)}
                  disabled={readOnly}
                  className={inputCls}
                  placeholder="e.g. 01-06-2015, 10 years"
                />
              </div>
              <div>
                <label className={labelCls}>University Ratification</label>
                <select
                  value={generalInfo.universityRatification || ''}
                  onChange={e => update('universityRatification', e.target.value)}
                  disabled={readOnly}
                  className={inputCls}
                >
                  <option value="">— Select —</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Total Emoluments — Basic (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={generalInfo.totalEmoluments?.basic ?? ''}
                  onChange={e => updateNested('totalEmoluments', 'basic', e.target.value)}
                  disabled={readOnly}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Total Emoluments — Gross (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={generalInfo.totalEmoluments?.gross ?? ''}
                  onChange={e => updateNested('totalEmoluments', 'gross', e.target.value)}
                  disabled={readOnly}
                  className={inputCls}
                />
              </div>
            </>
          )}

          {isProf && (
            <>
              <div>
                <label className={labelCls}>Date of Joining</label>
                <input
                  type="date"
                  value={generalInfo.dateOfJoining || ''}
                  onChange={e => update('dateOfJoining', e.target.value)}
                  disabled={readOnly}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Date of Birth</label>
                <input
                  type="date"
                  value={generalInfo.dateOfBirth || ''}
                  onChange={e => update('dateOfBirth', e.target.value)}
                  disabled={readOnly}
                  className={inputCls}
                />
              </div>
              <div className="lg:col-span-2">
                <label className={labelCls}>Address</label>
                <input
                  type="text"
                  value={generalInfo.address || ''}
                  onChange={e => update('address', e.target.value)}
                  disabled={readOnly}
                  className={inputCls}
                  placeholder="Full address"
                />
              </div>
            </>
          )}

          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={generalInfo.email || ''}
              onChange={e => update('email', e.target.value)}
              disabled={readOnly}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Mobile</label>
            <input
              type="tel"
              value={generalInfo.mobile || ''}
              onChange={e => update('mobile', e.target.value)}
              disabled={readOnly}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Educational Qualifications */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">Educational Qualifications</h3>
          </div>
          {!readOnly && (
            <button
              onClick={addQualification}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-all cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2 font-bold text-slate-600 text-[10px] uppercase tracking-wider">Degree</th>
                <th className="text-left px-4 py-2 font-bold text-slate-600 text-[10px] uppercase tracking-wider">Period of Study</th>
                <th className="text-left px-4 py-2 font-bold text-slate-600 text-[10px] uppercase tracking-wider">University/College</th>
                <th className="text-left px-4 py-2 font-bold text-slate-600 text-[10px] uppercase tracking-wider">Class/CGPA</th>
                <th className="text-left px-4 py-2 font-bold text-slate-600 text-[10px] uppercase tracking-wider">Year of Pass</th>
                {!readOnly && <th className="w-8"></th>}
              </tr>
            </thead>
            <tbody>
              {quals.map((q, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-3 py-1.5">
                    <input type="text" value={q.degree || ''} onChange={e => updateQualification(i, 'degree', e.target.value)} disabled={readOnly} className={inputCls} placeholder="B.Tech, M.Tech..." />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="text" value={q.periodOfStudy || ''} onChange={e => updateQualification(i, 'periodOfStudy', e.target.value)} disabled={readOnly} className={inputCls} placeholder="2010–2014" />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="text" value={q.university || ''} onChange={e => updateQualification(i, 'university', e.target.value)} disabled={readOnly} className={inputCls} placeholder="University name" />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="text" value={q.classCgpa || ''} onChange={e => updateQualification(i, 'classCgpa', e.target.value)} disabled={readOnly} className={inputCls} placeholder="8.5 CGPA" />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="text" value={q.yearOfPass || ''} onChange={e => updateQualification(i, 'yearOfPass', e.target.value)} disabled={readOnly} className={inputCls} placeholder="2014" />
                  </td>
                  {!readOnly && (
                    <td className="px-2 py-1.5">
                      {quals.length > 1 && (
                        <button onClick={() => removeQualification(i)} className="p-1 text-red-400 hover:text-red-600 transition-colors cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
