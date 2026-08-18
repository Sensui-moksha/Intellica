import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, User, CheckCircle, MessageSquare, Loader2,
  Clock, CheckCircle2, Search, Calculator, Calendar
} from 'lucide-react';
import { pbasApi, academicYearApi } from '../../api/services';
import PBASScoreSummary from '../../components/pbas/PBASScoreSummary';
import PBASSummarySheet from '../../components/pbas/PBASSummarySheet';
import PBASSection from '../../components/pbas/PBASSection';

export default function PBASApprovalsTab() {
  const [academicYear, setAcademicYear] = useState('');
  const [academicYearList, setAcademicYearList] = useState([]);

  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING | REVISION | APPROVED
  const [pendingQueue, setPendingQueue] = useState([]);
  const [revisionQueue, setRevisionQueue] = useState([]);
  const [approvedQueue, setApprovedQueue] = useState([]);

  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [search, setSearch] = useState('');

  // Modals & Action Box
  const [actionType, setActionType] = useState(null); // null | 'DISCUSSION' | 'APPROVE'
  const [actionComment, setActionComment] = useState('');
  
  const [rulesCache, setRulesCache] = useState({});
  const [expandedSection, setExpandedSection] = useState(null);
  const [activeSemesterView, setActiveSemesterView] = useState('semester1');

  // HOD Scores
  const [hodScores, setHodScores] = useState({
    teaching: 0,
    professional: 0,
    research: 0,
    administrative: 0
  });

  useEffect(() => {
    // Load rules for all roles
    Promise.all([
      pbasApi.getRules('ASSISTANT_PROFESSOR'),
      pbasApi.getRules('ASSOCIATE_PROFESSOR'),
      pbasApi.getRules('PROFESSOR')
    ]).then(responses => {
      setRulesCache({
        ASSISTANT_PROFESSOR: responses[0].data.rules,
        ASSOCIATE_PROFESSOR: responses[1].data.rules,
        PROFESSOR: responses[2].data.rules
      });
    }).catch(err => console.error("Failed to load rules:", err));

    academicYearApi.getAll().then(res => {
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length > 0) {
        setAcademicYearList(list);
        const current = list.find(y => y.isCurrent) || list[0];
        setAcademicYear(current.year);
      }
    }).catch(console.error);
  }, []);

  const loadData = async (year) => {
    setLoading(true);
    try {
      const res = await pbasApi.getDeptAppraisals(year);
      const allAppraisals = Array.isArray(res.data) ? res.data : [];

      const pList = allAppraisals.filter(a => a.status === 'SUBMITTED');
      const rList = allAppraisals.filter(a => a.status === 'REVISION_REQUIRED');
      const aList = allAppraisals.filter(a => ['HOD_APPROVED', 'APPROVED'].includes(a.status));

      setPendingQueue(pList);
      setRevisionQueue(rList);
      setApprovedQueue(aList);

      setSelected(prev => {
        const curList = activeTab === 'PENDING' ? pList : activeTab === 'REVISION' ? rList : aList;
        if (prev && curList.some(item => item._id === prev._id)) {
          return curList.find(item => item._id === prev._id);
        }
        return curList[0] || null;
      });
    } catch (err) {
      console.error('Failed to load PBAS appraisals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (academicYear) {
      loadData(academicYear);
    }
  }, [academicYear, activeTab]);

  useEffect(() => {
    if (selected && actionType === 'APPROVE') {
      const scores = selected.calculatedScores || {};
      setHodScores({
        teaching: selected.hodScores?.teaching ?? scores.teaching ?? 0,
        professional: selected.hodScores?.professional ?? scores.professional ?? 0,
        research: selected.hodScores?.research ?? scores.research ?? 0,
        administrative: selected.hodScores?.administrative ?? scores.administrative ?? 0
      });
    }
  }, [selected, actionType]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActionType(null);
    setActionComment('');
    if (tab === 'PENDING') setSelected(pendingQueue[0] || null);
    else if (tab === 'REVISION') setSelected(revisionQueue[0] || null);
    else if (tab === 'APPROVED') setSelected(approvedQueue[0] || null);
  };

  const handleDecision = async (id, decision) => {
    setActing(true);
    try {
      if (decision === 'APPROVE') {
        await pbasApi.updateHodScores(id, {
          teaching: hodScores.teaching,
          professional: hodScores.professional,
          research: hodScores.research,
          administrative: hodScores.administrative,
          comment: actionComment
        });
      } else if (decision === 'DISCUSSION') {
        await pbasApi.requestRevision(id, { comment: actionComment });
      }

      setActionType(null);
      setActionComment('');
      await loadData(academicYear);
    } catch (err) {
      console.error(err);
    } finally {
      setActing(false);
    }
  };

  const currentList = activeTab === 'PENDING' ? pendingQueue : activeTab === 'REVISION' ? revisionQueue : approvedQueue;

  const filteredList = currentList.filter(item => {
    const query = search.toLowerCase();
    return (item.faculty?.name?.toLowerCase().includes(query) || item.faculty?.employeeId?.toLowerCase().includes(query));
  });

  return (
    <div className="space-y-4">
      {/* Filters and Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start">
          <button
            onClick={() => handleTabChange('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'PENDING' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
              activeTab === 'PENDING' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {pendingQueue.length}
            </span>
          </button>
          
          <button
            onClick={() => handleTabChange('REVISION')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'REVISION' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>In Revision</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
              activeTab === 'REVISION' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {revisionQueue.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('APPROVED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'APPROVED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>HOD Approved</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${
              activeTab === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
            }`}>
              {approvedQueue.length}
            </span>
          </button>
        </div>

        {/* Academic Year Selector */}
        <div className="relative">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-2 pr-8 outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors shadow-xs cursor-pointer"
          >
            {academicYearList.length > 0 ? (
              academicYearList.map(y => (
                <option key={y._id} value={y.year}>
                  AY {y.year} {y.isCurrent ? '(Active)' : ''}
                </option>
              ))
            ) : (
              <option value={academicYear}>AY {academicYear}</option>
            )}
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-80 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="flex gap-5 h-[calc(100vh-12rem)]">
          {/* Left Queue List */}
          <div className="w-84 shrink-0 flex flex-col gap-3 h-full">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by faculty name…"
                className="w-full pl-10 pr-3 py-2.5 bg-white border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
                style={{ borderColor: '#e2e8f0' }}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              <AnimatePresence>
                {filteredList.map(item => {
                  const isSel = selected?._id === item._id;
                  return (
                    <motion.button
                      key={item._id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => {
                        setSelected(item);
                        setActionType(null);
                        setActionComment('');
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSel
                          ? activeTab === 'REVISION'
                            ? 'border-amber-300 bg-amber-50/70 shadow-sm'
                            : activeTab === 'APPROVED'
                              ? 'border-emerald-300 bg-emerald-50/70 shadow-sm'
                              : 'border-blue-300 bg-blue-50/70 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-slate-900 text-xs">{item.faculty?.name || 'Faculty Member'}</p>
                        {item.status === 'REVISION_REQUIRED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700 shrink-0">
                            Revising
                          </span>
                        )}
                        {['HOD_APPROVED', 'APPROVED'].includes(item.status) && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 shrink-0">
                            Approved
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.faculty?.designation || 'Faculty'}</span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 flex-wrap gap-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {item.academicYear}
                        </span>
                        <span className="text-[11px] font-bold text-blue-600">
                          {item.calculatedScores?.total || 0} pts
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>

              {filteredList.length === 0 && (
                <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200/80 text-slate-400">
                  <Calculator className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-xs text-slate-600">No PBAS forms found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {activeTab === 'PENDING' ? 'No pending PBAS approvals!' : `No ${activeTab.toLowerCase()} records.`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Preview Pane */}
          {selected ? (
            <motion.div
              key={selected._id}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 flex flex-col gap-3 min-h-0 bg-white rounded-3xl border p-5 shadow-xs overflow-y-auto"
              style={{ borderColor: '#e2e8f0' }}
            >
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">PBAS Appraisal: {selected.faculty?.name}</h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>Designation: <strong className="text-slate-800">{selected.faculty?.designation}</strong></span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Year: <strong className="text-slate-800">{selected.academicYear}</strong></span>
                  </div>
                </div>
              </div>

              <div className="mt-2 space-y-4">
                <PBASScoreSummary calcResult={selected.calculationDetails} />
                
                {selected.role && rulesCache[selected.role] && (
                  <>
                    <PBASSummarySheet 
                      calcResult={selected.calculationDetails}
                      rules={rulesCache[selected.role]}
                      facultyName={selected.faculty?.name}
                      department={selected.faculty?.department}
                      hodScores={selected.hodScores}
                      ifacScores={selected.ifacScores}
                    />

                    <div className="space-y-3 mt-4">
                      <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Detailed Breakdown</h3>
                      {rulesCache[selected.role].sections.map(sectionConfig => {
                        const isExpanded = expandedSection === sectionConfig.key;
                        const sectionResult = selected.calculationDetails?.sections?.find(s => s.key === sectionConfig.key);
                        
                        return (
                          <div key={sectionConfig.key} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                            <button
                              onClick={() => {
                                setExpandedSection(isExpanded ? null : sectionConfig.key);
                                setActiveSemesterView('semester1');
                              }}
                              className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-black text-slate-400">{sectionConfig.numeral || '-'}</span>
                                <span className="font-bold text-slate-700 text-xs text-left">{sectionConfig.label}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                  {sectionResult?.finalScore?.toFixed(1) || 0} / {sectionConfig.maxScore}
                                </span>
                                <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                              </div>
                            </button>
                            
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="border-t border-slate-200 p-4 bg-white"
                                >
                                  {sectionConfig.semesterAveraged && (
                                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit mb-4">
                                      <button
                                        onClick={() => setActiveSemesterView('semester1')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSemesterView === 'semester1' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                      >
                                        Semester 1 (Odd)
                                      </button>
                                      <button
                                        onClick={() => setActiveSemesterView('semester2')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSemesterView === 'semester2' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                      >
                                        Semester 2 (Even)
                                      </button>
                                    </div>
                                  )}
                                  <PBASSection
                                    sectionConfig={sectionConfig}
                                    sectionResult={sectionResult}
                                    inputs={activeSemesterView === 'semester1' ? (selected.semester1?.[sectionConfig.key] || {}) : (selected.semester2?.[sectionConfig.key] || {})}
                                    onInputChange={() => {}} // Read-only
                                    readOnly={true}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              
              {selected.status === 'REVISION_REQUIRED' && selected.hodComment && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs flex items-start gap-2.5 mt-2">
                  <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Your Revision Request Notes:</p>
                    <p className="text-[11px] mt-0.5">{selected.hodComment}</p>
                  </div>
                </div>
              )}

              {/* Action Form */}
              <AnimatePresence>
                {actionType && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-4 bg-slate-50 border rounded-2xl space-y-4 mt-4"
                    style={{ borderColor: actionType === 'APPROVE' ? '#a7f3d0' : '#bfdbfe' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {actionType === 'APPROVE' ? 'Enter Final HOD/DFAC Scores:' : 'Revision Feedback / Discussion Notes for Faculty:'}
                      </span>
                      <button
                        onClick={() => { setActionType(null); setActionComment(''); }}
                        className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    {actionType === 'APPROVE' && (
                      <div className="grid grid-cols-2 gap-4">
                        {['teaching', 'professional', 'research', 'administrative'].map(field => (
                          <div key={field}>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1 capitalize">
                              {field} Score (Calculated: {selected.calculatedScores?.[field] || 0})
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={hodScores[field]}
                              onChange={(e) => setHodScores({ ...hodScores, [field]: Number(e.target.value) })}
                              className="w-full px-3 py-2 bg-white border rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                              style={{ borderColor: '#e2e8f0' }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <textarea
                      rows={2}
                      value={actionComment}
                      onChange={e => setActionComment(e.target.value)}
                      placeholder={actionType === 'APPROVE' ? 'Additional HOD Comments (Optional)…' : 'e.g. Please recalculate section B…'}
                      className="w-full p-2.5 bg-white border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                      style={{ borderColor: '#e2e8f0' }}
                    />

                    <div className="flex justify-end">
                      {actionType === 'APPROVE' ? (
                        <button
                          disabled={acting}
                          onClick={() => handleDecision(selected._id, 'APPROVE')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{acting ? 'Saving…' : 'Save & Finalize PBAS'}</span>
                        </button>
                      ) : (
                        <button
                          disabled={!actionComment.trim() || acting}
                          onClick={() => handleDecision(selected._id, 'DISCUSSION')}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{acting ? 'Sending…' : 'Send Revision to Faculty'}</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Action Footer */}
              {!actionType && (
                <div className="flex items-center justify-between pt-4 mt-auto border-t border-slate-100">
                  <div className="text-xs text-slate-400">
                    {activeTab === 'PENDING' ? 'Awaiting Departmental PBAS Review' : activeTab === 'REVISION' ? 'Faculty is currently revising' : 'PBAS HOD Approved'}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {activeTab === 'PENDING' && (
                      <>
                        <button
                          onClick={() => { setActionType('DISCUSSION'); setActionComment(''); }}
                          className="flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Request Revision</span>
                        </button>
                        <button
                          onClick={() => { setActionType('APPROVE'); setActionComment(''); }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Enter HOD Scores & Approve</span>
                        </button>
                      </>
                    )}
                    {activeTab === 'APPROVED' && (
                      <button
                        onClick={() => { setActionType('APPROVE'); setActionComment(selected.hodComment || ''); }}
                        className="flex items-center gap-1.5 px-4 py-2 border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Update HOD Scores</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 flex items-center justify-center p-8 text-center text-slate-400">
              <div>
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-400" />
                <p className="font-bold text-sm text-slate-700">No form selected</p>
                <p className="text-xs text-slate-400 mt-0.5">Select a PBAS appraisal from the list to preview.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
