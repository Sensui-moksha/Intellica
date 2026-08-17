import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit3, Trash2, RefreshCw,
  CheckCircle2, AlertTriangle, CheckSquare, Square,
  Layers, FolderPlus, FileText, Users, Wrench,
  GraduationCap, BookOpen, Lightbulb, FlaskConical,
  Briefcase, Award, BookMarked, Trophy, Mic,
  Presentation, Video, ShieldCheck, Scale,
  Rocket, Handshake, Sparkles, SlidersHorizontal,
  TrendingUp, Zap, ChevronRight, X, ListTree,
  Coins, ArrowRight, CornerDownRight, Check,
  ChevronDown, HelpCircle, Calendar, CalendarDays, History, Clock, Star
} from 'lucide-react';
import { categoriesApi, academicYearApi } from '../../api/services';

const getCategoryMeta = (name) => {
  const key = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (key.includes('publication') || key.includes('paper')) {
    return { icon: FileText, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Research Publications' };
  }
  if (key.includes('conference')) {
    return { icon: Users, color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', label: 'Conferences & Forums' };
  }
  if (key.includes('workshop')) {
    return { icon: Wrench, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Technical Workshops' };
  }
  if (key.includes('fdp')) {
    return { icon: GraduationCap, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', label: 'Faculty Development' };
  }
  if (key.includes('book')) {
    return { icon: BookOpen, color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Books & Chapters' };
  }
  if (key.includes('ipr') || key.includes('patent')) {
    return { icon: Lightbulb, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', label: 'Patents & IPR' };
  }
  if (key.includes('project')) {
    return { icon: FlaskConical, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', label: 'Research Grants' };
  }
  if (key.includes('consultancy')) {
    return { icon: Briefcase, color: '#65a30d', bg: '#f7fee7', border: '#d9f99d', label: 'Industry Consultancy' };
  }
  if (key.includes('nptel') || key.includes('mooc')) {
    return { icon: Award, color: '#ca8a04', bg: '#fefce8', border: '#fef08a', label: 'NPTEL & MOOCs' };
  }
  if (key.includes('thesis') || key.includes('doctoral') || key.includes('phd')) {
    return { icon: BookMarked, color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff', label: 'Doctoral Guidance' };
  }
  if (key.includes('award') || key.includes('honor')) {
    return { icon: Trophy, color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', label: 'Academic Honors' };
  }
  if (key.includes('lecture') || key.includes('talk')) {
    return { icon: Mic, color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', label: 'Invited Keynotes' };
  }
  if (key.includes('seminar')) {
    return { icon: Presentation, color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', label: 'Seminars & Symposia' };
  }
  if (key.includes('webinar')) {
    return { icon: Video, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Online Webinars' };
  }
  if (key.includes('certification')) {
    return { icon: ShieldCheck, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', label: 'Certifications' };
  }
  if (key.includes('policy')) {
    return { icon: Scale, color: '#475569', bg: '#f8fafc', border: '#e2e8f0', label: 'Research Policy' };
  }
  if (key.includes('membership')) {
    return { icon: Users, color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', label: 'Memberships' };
  }
  if (key.includes('incubation') || key.includes('startup')) {
    return { icon: Rocket, color: '#e11d48', bg: '#fff1f2', border: '#fecdd3', label: 'Incubation & Startups' };
  }
  if (key.includes('mou')) {
    return { icon: Handshake, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', label: 'Institutional MoUs' };
  }
  return { icon: Sparkles, color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', label: 'Academic Activity' };
};

export default function CreditConfig() {
  const [categories, setCategories]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [acting, setActing]                 = useState(false);
  const [search, setSearch]                 = useState('');
  const [sectionFilter, setSectionFilter]   = useState('ALL');

  // Selection for bulk actions
  const [selectedIds, setSelectedIds]       = useState([]);

  // Modals & Target State
  const [showModal, setShowModal]                     = useState(false);
  const [editTarget, setEditTarget]                   = useState(null);
  const [deleteTarget, setDeleteTarget]               = useState(null);
  const [showBulkConfirm, setShowBulk]                = useState(false);
  const [toastMsg, setToastMsg]                       = useState('');
  const [errorMsg, setErrorMsg]                       = useState('');

  // Subcategory Management Modal State
  const [subcatModalCat, setSubcatModalCat]           = useState(null);
  const [newSubForm, setNewSubForm]                   = useState({ name: '', creditPoints: 10, description: '' });
  const [editingSubId, setEditingSubId]               = useState(null);
  const [editingSubForm, setEditingSubForm]           = useState({ name: '', creditPoints: 10, description: '' });
  const [subActing, setSubActing]                     = useState(false);

  // Academic Year Management State
  const [academicYears, setAcademicYears]             = useState([]);
  const [showYearsModal, setShowYearsModal]           = useState(false);
  const [newYearForm, setNewYearForm]                 = useState({ year: '', label: '', description: '', isCurrent: false });
  const [yearActing, setYearActing]                   = useState(false);
  const [deleteYearTarget, setDeleteYearTarget]       = useState(null);

  // Form State for Category Create/Edit
  const [form, setForm] = useState({
    name: '',
    section: 'rnd',
    key: '',
    creditPoints: 15,
    description: '',
    isActive: true,
    subcategories: []
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadCategories = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [res, yearRes] = await Promise.all([
        categoriesApi.getAll(),
        academicYearApi.getAll().catch(() => ({ data: [] }))
      ]);
      const list = res.data?.categories || res.data || [];
      const safeList = Array.isArray(list) ? list : [];
      setCategories(safeList);
      setSelectedIds([]);

      const yList = Array.isArray(yearRes.data) ? yearRes.data : [];
      setAcademicYears(yList);

      // If a subcategory modal is open, refresh its current target
      if (subcatModalCat) {
        const refreshed = safeList.find(c => c._id === subcatModalCat._id);
        if (refreshed) setSubcatModalCat(refreshed);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  const loadAcademicYears = async () => {
    try {
      const res = await academicYearApi.getAll();
      setAcademicYears(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load academic years:', err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Multi-select logic
  const toggleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredCategories.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCategories.map(c => c._id));
    }
  };

  // Open Create Modal
  const openCreate = () => {
    setEditTarget(null);
    setForm({
      name: '',
      section: 'rnd',
      key: '',
      creditPoints: 15,
      description: '',
      isActive: true,
      subcategories: []
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const openEdit = (cat, e) => {
    e?.stopPropagation();
    setEditTarget(cat);
    setForm({
      name: cat.name || '',
      section: cat.section || 'rnd',
      key: cat.key || '',
      creditPoints: cat.creditPoints ?? 10,
      description: cat.description || '',
      isActive: cat.isActive !== false,
      subcategories: cat.subcategories ? [...cat.subcategories] : []
    });
    setShowModal(true);
  };

  // Open Subcategory Manager
  const openSubcategoryManager = (cat, e) => {
    e?.stopPropagation();
    setSubcatModalCat(cat);
    setNewSubForm({ name: '', creditPoints: cat.creditPoints ?? 10, description: '' });
    setEditingSubId(null);
  };

  // Save Category (Create or Update)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg('Please provide a category name.');
      return;
    }

    setActing(true);
    setErrorMsg('');
    try {
      if (editTarget) {
        await categoriesApi.update(editTarget._id, form);
        showToast(`Category "${form.name}" updated successfully!`);
      } else {
        await categoriesApi.create(form);
        showToast(`New category "${form.name}" added to Credit Configuration!`);
      }
      setShowModal(false);
      setEditTarget(null);
      loadCategories();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Operation failed. Please try again.');
    } finally {
      setActing(false);
    }
  };

  // Quick inline point change for category
  const handleInlinePointChange = async (cat, newPoints) => {
    const pts = Number(newPoints);
    if (isNaN(pts) || pts < 0) return;
    try {
      await categoriesApi.update(cat._id, { creditPoints: pts });
      setCategories(prev => prev.map(c => c._id === cat._id ? { ...c, creditPoints: pts } : c));
      showToast(`Updated ${cat.name} baseline to ${pts} pts`);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update credit points.');
    }
  };

  // Toggle active status
  const handleToggleStatus = async (cat, e) => {
    e?.stopPropagation();
    try {
      const newStatus = !cat.isActive;
      await categoriesApi.update(cat._id, { isActive: newStatus });
      setCategories(prev => prev.map(c => c._id === cat._id ? { ...c, isActive: newStatus } : c));
      showToast(`Category ${cat.name} is now ${newStatus ? 'Active' : 'Disabled'}`);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update status.');
    }
  };

  // Single Delete Category
  const handleConfirmSingleDelete = async () => {
    if (!deleteTarget) return;
    setActing(true);
    try {
      await categoriesApi.delete(deleteTarget._id);
      showToast(`Category "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      loadCategories();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete category.');
    } finally {
      setActing(false);
    }
  };

  // Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setActing(true);
    try {
      await categoriesApi.bulkDelete(selectedIds);
      showToast(`${selectedIds.length} categories deleted successfully.`);
      setShowBulk(false);
      setSelectedIds([]);
      loadCategories();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Bulk delete failed.');
    } finally {
      setActing(false);
    }
  };

  // ── Subcategory CRUD Actions ──
  const handleAddSubcategory = async (e) => {
    e.preventDefault();
    if (!subcatModalCat || !newSubForm.name.trim()) return;
    setSubActing(true);
    try {
      const res = await categoriesApi.addSubcategory(subcatModalCat._id, {
        name: newSubForm.name.trim(),
        creditPoints: Number(newSubForm.creditPoints ?? 10),
        description: newSubForm.description.trim()
      });
      showToast(`Added subcategory "${newSubForm.name}" (${newSubForm.creditPoints} pts)`);
      setNewSubForm({ name: '', creditPoints: subcatModalCat.creditPoints ?? 10, description: '' });
      if (res.data?.category) {
        setSubcatModalCat(res.data.category);
        setCategories(prev => prev.map(c => c._id === res.data.category._id ? res.data.category : c));
      } else {
        loadCategories();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to add subcategory');
    } finally {
      setSubActing(false);
    }
  };

  const handleStartEditSub = (sub) => {
    setEditingSubId(sub._id);
    setEditingSubForm({
      name: sub.name,
      creditPoints: sub.creditPoints,
      description: sub.description || ''
    });
  };

  const handleSaveEditSub = async (subId) => {
    if (!subcatModalCat || !editingSubForm.name.trim()) return;
    setSubActing(true);
    try {
      const res = await categoriesApi.updateSubcategory(subcatModalCat._id, subId, {
        name: editingSubForm.name.trim(),
        creditPoints: Number(editingSubForm.creditPoints),
        description: editingSubForm.description.trim()
      });
      showToast(`Updated subcategory "${editingSubForm.name}"`);
      setEditingSubId(null);
      if (res.data?.category) {
        setSubcatModalCat(res.data.category);
        setCategories(prev => prev.map(c => c._id === res.data.category._id ? res.data.category : c));
      } else {
        loadCategories();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update subcategory');
    } finally {
      setSubActing(false);
    }
  };

  const handleDeleteSubcategory = async (subId, subName) => {
    if (!subcatModalCat) return;
    setSubActing(true);
    try {
      const res = await categoriesApi.deleteSubcategory(subcatModalCat._id, subId);
      showToast(`Subcategory "${subName}" removed`);
      if (res.data?.category) {
        setSubcatModalCat(res.data.category);
        setCategories(prev => prev.map(c => c._id === res.data.category._id ? res.data.category : c));
      } else {
        loadCategories();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete subcategory');
    } finally {
      setSubActing(false);
    }
  };

  // Filter and Search Categories
  const filteredCategories = categories.filter(c => {
    const matchSearch =
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.key || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.subcategories || []).some(s => (s.name || '').toLowerCase().includes(search.toLowerCase()));
    const matchSec = sectionFilter === 'ALL' || c.section === sectionFilter;
    return matchSearch && matchSec;
  });

  const teachingCount = categories.filter(c => c.section === 'teaching').length;
  const profCount = categories.filter(c => c.section === 'professional').length;
  const rndCount = categories.filter(c => c.section === 'rnd' || c.section === 'research').length;
  const adminCount = categories.filter(c => c.section === 'administrative').length;
  const totalSubcategories = categories.reduce((acc, c) => acc + (c.subcategories?.length || 0), 0);
  const avgCredits = categories.length
    ? Math.round(categories.reduce((acc, c) => acc + (c.creditPoints || 10), 0) / categories.length)
    : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6 pb-12">

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-600 text-white text-xs font-semibold rounded-2xl shadow-xl shadow-emerald-600/25 backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Banner */}
      {errorMsg && (
        <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-800 font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Top Header Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Credit & Subcategory Configuration</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Configure academic categories, tiered subcategories, rule weightages, and evaluation metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={loadCategories}
            title="Refresh Categories"
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowYearsModal(true)}
            className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-300/80 px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <span>Academic Years & Archival ({academicYears.length})</span>
          </motion.button>

          <motion.button
            whileHover={{ y: -1, boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
            whileTap={{ scale: 0.97 }}
            onClick={openCreate}
            className="flex items-center gap-2 text-xs font-bold text-white px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4" /> Add Category
          </motion.button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-lg font-black text-slate-900">{categories.length}</span>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">All Categories</p>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-blue-200/70 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-lg font-black text-blue-700">{teachingCount}</span>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">I. Teaching</p>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-violet-200/70 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <span className="text-lg font-black text-violet-700">{profCount}</span>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">II. Professional</p>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-indigo-200/70 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div>
            <span className="text-lg font-black text-indigo-700">{rndCount}</span>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">III. Research (R&D)</p>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-amber-200/70 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <span className="text-lg font-black text-amber-700">{adminCount}</span>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">IV. Administrative</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        
        {/* Section Tabs */}
        <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 flex-wrap gap-1">
          <button
            onClick={() => setSectionFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              sectionFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({categories.length})
          </button>
          <button
            onClick={() => setSectionFilter('teaching')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              sectionFilter === 'teaching' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            I. Teaching ({teachingCount})
          </button>
          <button
            onClick={() => setSectionFilter('professional')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              sectionFilter === 'professional' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            II. Professional ({profCount})
          </button>
          <button
            onClick={() => setSectionFilter('rnd')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              sectionFilter === 'rnd' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            III. Research ({rndCount})
          </button>
          <button
            onClick={() => setSectionFilter('administrative')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              sectionFilter === 'administrative' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            IV. Admin ({adminCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search category or subcategory name…"
            className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800"
            style={{ borderColor: '#e2e8f0' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
          )}
        </div>

        {/* Bulk Delete Trigger */}
        {selectedIds.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setShowBulk(true)}
            className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedIds.length})
          </motion.button>
        )}
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-200/80">
            <tr>
              <th className="px-5 py-3.5 w-12 text-center">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  {selectedIds.length > 0 && selectedIds.length === filteredCategories.length ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider">Activity Category</th>
              <th className="px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider">Subcategories & Tier Rules</th>
              <th className="px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider">Academic Section</th>
              <th className="px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider">Default Points</th>
              <th className="px-4 py-3.5 font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3.5 font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCategories.map((c, i) => {
              const isSelected = selectedIds.includes(c._id);
              const meta = getCategoryMeta(c.name);
              const IconComp = meta.icon;
              const subCount = c.subcategories?.length || 0;

              return (
                <motion.tr
                  key={c._id || i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.012 }}
                  className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/40' : ''}`}
                  onClick={(e) => openSubcategoryManager(c, e)}
                >
                  {/* Checkbox */}
                  <td className="px-5 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleSelectOne(c._id)}
                      className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </td>

                  {/* Category Details with Vibrant Icon */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{ background: meta.bg, borderColor: meta.border, color: meta.color }}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-xs block hover:text-blue-600 transition-colors">
                          {c.name}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 leading-snug">
                          {c.description || meta.label}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Subcategories Pill / Action */}
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      onClick={(e) => openSubcategoryManager(c, e)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                        subCount > 0
                          ? 'bg-blue-50/90 text-blue-700 border-blue-200/80 hover:bg-blue-100 hover:border-blue-300'
                          : 'bg-slate-50 text-slate-500 border-dashed border-slate-300 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      <ListTree className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                      <span>{subCount > 0 ? `${subCount} Subcategories` : '+ Add Subcategories'}</span>
                      <ChevronRight className="w-3 h-3 opacity-60 ml-0.5" />
                    </button>
                  </td>

                  {/* Section */}
                  <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                    {c.section === 'teaching' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        I. Teaching
                      </span>
                    )}
                    {c.section === 'professional' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                        II. Professional
                      </span>
                    )}
                    {(c.section === 'rnd' || c.section === 'research') && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        III. Research
                      </span>
                    )}
                    {c.section === 'administrative' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        IV. Admin
                      </span>
                    )}
                  </td>

                  {/* Credit Points Inline Box */}
                  <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={c.creditPoints ?? 10}
                        onChange={e => handleInlinePointChange(c, e.target.value)}
                        className="w-16 px-2.5 py-1 text-center font-bold text-xs bg-slate-50 hover:bg-white focus:bg-white border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-blue-600 shadow-2xs transition-all"
                        style={{ borderColor: '#cbd5e1' }}
                      />
                      <span className="text-[11px] text-slate-400 font-semibold">pts</span>
                    </div>
                  </td>

                  {/* Status Toggle */}
                  <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleToggleStatus(c, e)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer ${
                        c.isActive !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70 hover:bg-emerald-100/70'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${c.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      <span>{c.isActive !== false ? 'Active' : 'Disabled'}</span>
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => openEdit(c, e)}
                        title="Edit Category Details"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                        title="Delete Category"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty State */}
        {filteredCategories.length === 0 && !loading && (
          <div className="p-12 text-center">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">No Categories Match Filter</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search ? 'Try clearing your search query.' : 'Click Add Category to create your first activity stream.'}
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={openCreate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                + Add Category
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 🌟 DEDICATED SUBCATEGORIES MANAGEMENT MODAL ── */}
      <AnimatePresence>
        {subcatModalCat && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => setSubcatModalCat(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl p-6 shadow-2xl flex flex-col space-y-4 overflow-hidden"
              style={{ border: '1px solid #e2e8f0' }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/25 shrink-0">
                    <ListTree className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {subcatModalCat.name} Subcategories & Tiered Rules
                      </h3>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-extrabold rounded-lg">
                        {subcatModalCat.creditPoints ?? 10} pts default
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Configure custom sub-types (e.g. IEEE chapters, national vs international) and their credit rewards.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSubcatModalCat(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Add New Subcategory Form Card */}
              <form
                onSubmit={handleAddSubcategory}
                className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3.5 space-y-3 shrink-0"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-blue-600" /> Add New Subcategory
                  </span>
                  <span className="text-[11px] text-slate-400">Will automatically appear in Upload forms</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  <div className="md:col-span-6">
                    <input
                      required
                      value={newSubForm.name}
                      onChange={e => setNewSubForm({ ...newSubForm, name: e.target.value })}
                      placeholder="e.g. Authored Book (International Publisher)"
                      className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                      style={{ borderColor: '#cbd5e1' }}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        required
                        value={newSubForm.creditPoints}
                        onChange={e => setNewSubForm({ ...newSubForm, creditPoints: e.target.value })}
                        placeholder="Credits"
                        className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        style={{ borderColor: '#cbd5e1' }}
                      />
                      <span className="text-slate-400 text-[11px] absolute right-2.5 top-2 font-normal">pts</span>
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <button
                      type="submit"
                      disabled={subActing || !newSubForm.name.trim()}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{subActing ? 'Adding…' : 'Add Subcategory'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <input
                    value={newSubForm.description}
                    onChange={e => setNewSubForm({ ...newSubForm, description: e.target.value })}
                    placeholder="Optional description / indexing criteria (e.g. Scopus / IEEE / Springer Indexed)"
                    className="w-full px-3 py-1.5 border rounded-xl text-[11px] outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>
              </form>

              {/* Subcategories List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1 py-1">
                  <span>Configured Subcategories ({subcatModalCat.subcategories?.length || 0})</span>
                  <span className="text-[11px] text-slate-400">Rewarded upon faculty upload</span>
                </div>

                {(!subcatModalCat.subcategories || subcatModalCat.subcategories.length === 0) ? (
                  <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <ListTree className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">No Subcategories Configured</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Uploads in this category will be awarded the default baseline ({subcatModalCat.creditPoints ?? 10} pts).
                    </p>
                  </div>
                ) : (
                  subcatModalCat.subcategories.map((sub, idx) => {
                    const isEditing = editingSubId === sub._id;

                    if (isEditing) {
                      return (
                        <div
                          key={sub._id || idx}
                          className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                            <div className="md:col-span-8">
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Subcategory Name</label>
                              <input
                                value={editingSubForm.name}
                                onChange={e => setEditingSubForm({ ...editingSubForm, name: e.target.value })}
                                className="w-full px-2.5 py-1.5 border rounded-xl text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                style={{ borderColor: '#cbd5e1' }}
                              />
                            </div>
                            <div className="md:col-span-4">
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Credit Points</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min={0}
                                  value={editingSubForm.creditPoints}
                                  onChange={e => setEditingSubForm({ ...editingSubForm, creditPoints: e.target.value })}
                                  className="w-full px-2.5 py-1.5 border rounded-xl text-xs font-bold text-blue-600 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                  style={{ borderColor: '#cbd5e1' }}
                                />
                                <span className="text-[11px] text-slate-400 absolute right-2.5 top-1.5">pts</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <input
                              value={editingSubForm.description}
                              onChange={e => setEditingSubForm({ ...editingSubForm, description: e.target.value })}
                              placeholder="Description / scope note"
                              className="w-full px-2.5 py-1 border rounded-xl text-[11px] bg-white outline-none focus:ring-2 focus:ring-blue-500"
                              style={{ borderColor: '#cbd5e1' }}
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingSubId(null)}
                              className="px-3 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={subActing || !editingSubForm.name.trim()}
                              onClick={() => handleSaveEditSub(sub._id)}
                              className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={sub._id || idx}
                        className="p-3 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-300 transition-colors shadow-2xs"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 text-xs block leading-tight">
                              {sub.name}
                            </span>
                            {sub.description && (
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                {sub.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs rounded-xl shadow-2xs">
                            {sub.creditPoints} pts
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditSub(sub)}
                              title="Edit Subcategory"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={subActing}
                              onClick={() => handleDeleteSubcategory(sub._id, sub.name)}
                              title="Delete Subcategory"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                <p className="text-[11px] text-slate-400">
                  Subcategories will be dynamically selectable across all upload portals.
                </p>
                <button
                  type="button"
                  onClick={() => setSubcatModalCat(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── ➕ ADD / EDIT CATEGORY MODAL ── */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] bg-white rounded-3xl p-6 shadow-2xl flex flex-col space-y-4 overflow-y-auto"
              style={{ border: '1px solid #e2e8f0' }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                    <FolderPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {editTarget ? 'Edit Activity Category' : 'Add New Activity Category'}
                    </h3>
                    <p className="text-xs text-slate-400">Configure category metadata, section, and evaluation parameters</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
                    <input
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Patent or Book Chapter"
                      className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                      style={{ borderColor: '#e2e8f0' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">PBAS Section *</label>
                    <select
                      value={form.section}
                      onChange={e => setForm({ ...form, section: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-slate-800"
                      style={{ borderColor: '#e2e8f0' }}
                    >
                      <option value="teaching">I. Teaching, Learning & Evaluation</option>
                      <option value="professional">II. Professional Development & Co-Curricular</option>
                      <option value="rnd">III. Research & Academic Contributions (R&D)</option>
                      <option value="administrative">IV. Administrative & Extension Activities</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Default Credit Points *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        required
                        value={form.creditPoints}
                        onChange={e => setForm({ ...form, creditPoints: Number(e.target.value) })}
                        placeholder="e.g. 20"
                        className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ borderColor: '#e2e8f0' }}
                      />
                      <span className="text-slate-400 text-xs absolute right-3 top-2 font-normal">pts</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">System Key (Optional)</label>
                    <input
                      value={form.key}
                      onChange={e => setForm({ ...form, key: e.target.value })}
                      placeholder="Auto-generated from name"
                      className="w-full px-3 py-2 border rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                      style={{ borderColor: '#e2e8f0' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description / Activity Scope</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="e.g. Research activities related to international publications or monographs."
                    className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={form.isActive}
                    onChange={e => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <label htmlFor="isActiveCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Enable category for faculty submissions
                  </label>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={acting || !form.name.trim()}
                    className="px-5 py-2 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {acting ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Category'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 🗑️ SINGLE DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
              onClick={() => setDeleteTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4"
              style={{ border: '1px solid #e2e8f0' }}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center">Delete Activity Category?</h3>
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-800">{deleteTarget.name}</strong> from the evaluation matrix? All configured subcategories will also be deleted.
              </p>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={handleConfirmSingleDelete}
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {acting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 🗑️ BULK DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showBulkConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowBulk(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4"
              style={{ border: '1px solid #e2e8f0' }}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center">Delete Selected Categories?</h3>
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                You have selected <strong className="text-rose-600">{selectedIds.length}</strong> categories. Are you sure you want to permanently delete them?
              </p>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulk(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={handleConfirmBulkDelete}
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {acting ? 'Deleting…' : 'Delete All'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 📅 ACADEMIC YEARS & ARCHIVAL MANAGEMENT MODAL ── */}
      <AnimatePresence>
        {showYearsModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowYearsModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
              style={{ border: '1px solid #e2e8f0' }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/25">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Academic Years & College-Wide Archival</h3>
                    <p className="text-xs text-slate-500">Create, switch active years, and archive historical records</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowYearsModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Active / Current Year Banner */}
              <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50/30 border border-blue-200/80 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Star className="w-4 h-4 fill-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider block">College-Wide Active Year</span>
                    <p className="text-sm font-black text-slate-900">
                      {academicYears.find(y => y.isCurrent)?.label || academicYears.find(y => y.isCurrent)?.year || 'AY 2025-26'}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl">
                  ● Active for Submissions
                </span>
              </div>

              {/* Existing Academic Years List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">All Academic Years ({academicYears.length})</h4>
                <div className="space-y-2">
                  {academicYears.map((ay) => (
                    <div
                      key={ay._id || ay.year}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        ay.isCurrent
                          ? 'bg-blue-50/40 border-blue-300/80 shadow-xs'
                          : ay.isArchived
                            ? 'bg-slate-50 border-slate-200/70 opacity-90'
                            : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          ay.isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {ay.isCurrent ? '★' : 'AY'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-slate-900 text-xs">{ay.label || `AY ${ay.year}`}</h5>
                            {ay.isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-800 uppercase">
                                Active Current Year
                              </span>
                            )}
                            {ay.isArchived && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 uppercase flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> Archived (Read-Only)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {ay.isCurrent
                              ? 'Current Active College Cycle • Open for Submissions'
                              : ay.isArchived
                                ? 'Archived Historical Records • View-Only for All Users'
                                : (ay.description || 'Upcoming Academic Cycle • Ready for Activation')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!ay.isCurrent && (
                          <button
                            type="button"
                            disabled={yearActing}
                            onClick={async () => {
                              setYearActing(true);
                              try {
                                await academicYearApi.setCurrent(ay._id);
                                showToast(`Activated AY ${ay.year} college-wide! Previous years archived.`);
                                loadAcademicYears();
                              } catch (err) {
                                setErrorMsg('Failed to switch academic year');
                              } finally {
                                setYearActing(false);
                              }
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            Set Active
                          </button>
                        )}

                        {!ay.isCurrent && (
                          <button
                            type="button"
                            onClick={() => setDeleteYearTarget(ay)}
                            title="Delete Academic Year"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form to Add New Academic Year */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newYearForm.year.trim()) return;
                  setYearActing(true);
                  try {
                    await academicYearApi.create({
                      year: newYearForm.year.trim(),
                      label: newYearForm.label.trim() || `AY ${newYearForm.year.trim()}`,
                      description: newYearForm.description.trim(),
                      isCurrent: newYearForm.isCurrent,
                    });
                    showToast(`Created Academic Year ${newYearForm.year}!`);
                    setNewYearForm({ year: '', label: '', description: '', isCurrent: false });
                    loadAcademicYears();
                  } catch (err) {
                    setErrorMsg(err.response?.data?.message || 'Failed to create academic year');
                  } finally {
                    setYearActing(false);
                  }
                }}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
              >
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Add New Academic Year (e.g. 2026-27)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Academic Year Code *</label>
                    <input
                      required
                      value={newYearForm.year}
                      onChange={e => setNewYearForm({ ...newYearForm, year: e.target.value })}
                      placeholder="e.g. 2026-27"
                      className="w-full px-3 py-1.5 border rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      style={{ borderColor: '#cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Display Label</label>
                    <input
                      value={newYearForm.label}
                      onChange={e => setNewYearForm({ ...newYearForm, label: e.target.value })}
                      placeholder="e.g. AY 2026-2027"
                      className="w-full px-3 py-1.5 border rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      style={{ borderColor: '#cbd5e1' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
                  <input
                    value={newYearForm.description}
                    onChange={e => setNewYearForm({ ...newYearForm, description: e.target.value })}
                    placeholder="e.g. Upcoming 2026-2027 Academic Cycle"
                    className="w-full px-3 py-1.5 border rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    style={{ borderColor: '#cbd5e1' }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newYearForm.isCurrent}
                      onChange={e => setNewYearForm({ ...newYearForm, isCurrent: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Set as Active College-Wide immediately</span>
                  </label>

                  <button
                    type="submit"
                    disabled={yearActing}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {yearActing ? 'Creating…' : '+ Add Year'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 🗑️ DELETE ACADEMIC YEAR THEMED CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {deleteYearTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setDeleteYearTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-60 w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-1">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center">Delete Academic Year?</h3>
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-800">{deleteYearTarget.label || `AY ${deleteYearTarget.year}`}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteYearTarget(null)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={yearActing}
                  onClick={async () => {
                    setYearActing(true);
                    try {
                      await academicYearApi.delete(deleteYearTarget._id);
                      showToast(`Deleted academic year ${deleteYearTarget.year}`);
                      setDeleteYearTarget(null);
                      loadAcademicYears();
                    } catch (err) {
                      setErrorMsg(err.response?.data?.message || 'Failed to delete year');
                    } finally {
                      setYearActing(false);
                    }
                  }}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {yearActing ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
