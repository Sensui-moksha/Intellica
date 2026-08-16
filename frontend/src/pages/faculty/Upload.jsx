import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, AlertTriangle, CheckCircle2, Sparkles, BookOpen,
  FileText, Hash, Building2, Send, ListTree, Coins, Layers
} from 'lucide-react';
import { categoriesApi, facultyApi } from '../../api/services';

export default function FacultyUpload() {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData]     = useState({
    category: '',
    subcategory: '',
    title: '',
    year: new Date().getFullYear(),
    date: '',
    file: null,
    // Dynamic / Category specific metadata
    bookType: 'book_authored_intl',
    publisher: '',
    isbn: '',
    authorRole: 'First / Principal Author',
    paperType: 'Journal',
    indexing: 'Scopus',
    quartile: 'Q1',
    doi: '',
    confLevel: 'International',
    confRole: 'Paper Presentation',
    iprStatus: 'Granted',
    iprNumber: '',
  });

  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    categoriesApi.getAll()
      .then(res => {
        const list = res.data?.categories || res.data || [];
        const safeList = Array.isArray(list) ? list : [];
        setCategories(safeList);

        if (safeList.length > 0) {
          const firstCat = safeList[0];
          const firstSub = firstCat.subcategories?.[0]?.name || '';
          setFormData(prev => ({
            ...prev,
            category: prev.category || firstCat.name,
            subcategory: prev.subcategory || firstSub
          }));
        }
      })
      .catch(console.error);
  }, []);

  // When category changes, auto-assign first available subcategory
  const handleCategoryChange = (newCatName) => {
    const matched = categories.find(c => c.name === newCatName);
    const firstSub = matched?.subcategories?.[0]?.name || '';
    setFormData(prev => ({
      ...prev,
      category: newCatName,
      subcategory: firstSub,
      // Default bookType to matching subcategory if available
      bookType: matched?.subcategories?.[0]?.key || 'book_authored_intl'
    }));
  };

  const selectedCatObj = categories.find(c => c.name?.toLowerCase() === formData.category?.toLowerCase());
  const availableSubcategories = selectedCatObj?.subcategories || [];

  // Compute live estimated credits preview based on selected subcategory or category baseline
  const getEstimatedCredits = () => {
    if (!selectedCatObj) return 15;

    // 1. If a subcategory is explicitly chosen, check if it matches in the category's subcategories
    if (formData.subcategory && availableSubcategories.length > 0) {
      const matchedSub = availableSubcategories.find(
        s => s.name.toLowerCase() === formData.subcategory.toLowerCase() ||
             (s.key && s.key.toLowerCase() === formData.subcategory.toLowerCase())
      );
      if (matchedSub && typeof matchedSub.creditPoints === 'number') {
        return matchedSub.creditPoints;
      }
    }

    // 2. Fallbacks for specific classic rules if subcategory is not explicitly picked
    const cat = (formData.category || '').toLowerCase();
    if (cat === 'book') {
      if (formData.bookType === 'book_authored_intl') return 30;
      if (formData.bookType === 'book_authored_natl') return 20;
      if (formData.bookType === 'book_chapter') return 10;
      if (formData.bookType === 'edited_volume') return 25;
      return selectedCatObj.creditPoints || 25;
    }
    if (cat === 'publication') {
      if (formData.indexing === 'Scopus') {
        if (formData.quartile === 'Q1') return 40;
        if (formData.quartile === 'Q2') return 35;
        if (formData.quartile === 'Q3') return 30;
        if (formData.quartile === 'Q4') return 25;
        return 30;
      }
      if (formData.indexing === 'UGC-CARE') return 20;
      return 15;
    }
    if (cat === 'conference') {
      return formData.confLevel === 'International' ? 20 : 15;
    }
    if (cat === 'ipr') {
      if (formData.iprStatus === 'Granted') return 35;
      if (formData.iprStatus === 'Published') return 25;
      return 15;
    }

    return selectedCatObj.creditPoints ?? 15;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category || !formData.file) {
      setError('Please select a category and upload a supporting document file.');
      return;
    }
    if (!formData.title.trim()) {
      setError('Please enter a document title.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const data = new FormData();
    data.append('file', formData.file);
    data.append('document', formData.file);
    data.append('title', formData.title.trim());
    data.append('subcategory', formData.subcategory || '');
    data.append('year', formData.year);
    if (formData.date) data.append('date', formData.date);

    // Append category specific metadata
    const cat = formData.category.toLowerCase();
    if (cat === 'book') {
      data.append('bookType', formData.bookType || formData.subcategory);
      data.append('ruleKey', formData.bookType || formData.subcategory);
      data.append('publisher', formData.publisher);
      data.append('isbn', formData.isbn);
      data.append('authorRole', formData.authorRole);
    } else if (cat === 'publication') {
      data.append('paperType', formData.paperType);
      data.append('indexing', formData.indexing);
      data.append('quartile', formData.quartile);
      data.append('doi', formData.doi);
    } else if (cat === 'conference') {
      data.append('level', formData.confLevel);
      data.append('role', formData.confRole);
    } else if (cat === 'ipr') {
      data.append('statusType', formData.iprStatus);
      data.append('iprNumber', formData.iprNumber);
    }

    try {
      await facultyApi.createUpload(formData.category, data);
      setSuccess(true);
      setFormData({
        category: categories[0]?.name || 'Book',
        subcategory: categories[0]?.subcategories?.[0]?.name || '',
        title: '',
        year: new Date().getFullYear(),
        date: '',
        file: null,
        bookType: 'book_authored_intl',
        publisher: '',
        isbn: '',
        authorRole: 'First / Principal Author',
        paperType: 'Journal',
        indexing: 'Scopus',
        quartile: 'Q1',
        doi: '',
        confLevel: 'International',
        confRole: 'Paper Presentation',
        iprStatus: 'Granted',
        iprNumber: '',
      });
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBook = formData.category?.toLowerCase() === 'book';
  const isPub  = formData.category?.toLowerCase() === 'publication';
  const isConf = formData.category?.toLowerCase() === 'conference';
  const isIpr  = formData.category?.toLowerCase() === 'ipr';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Submit Research Proposal</h1>
          <p className="text-slate-500 text-xs mt-1">
            Submit authored books, research publications, conferences, workshops, or patents for departmental validation.
          </p>
        </div>

        {/* Live Estimated Credits Pill */}
        <div className="px-3.5 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-center gap-2 shadow-2xs">
          <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
          <span className="text-xs text-slate-600 font-medium">Estimated Reward:</span>
          <span className="text-xs font-black text-blue-700">{getEstimatedCredits()} Credits</span>
        </div>
      </div>

      <AnimatePresence>
        {isDuplicate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-800">Potential Duplicate Title Detected</p>
                <p className="text-rose-600 mt-0.5">A document with a similar title already exists. Please verify before submitting.</p>
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-700 font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border p-6 space-y-6 shadow-xs"
        style={{ borderColor: '#e8edf5' }}>

        {/* General Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Activity Category <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.category}
              onChange={e => handleCategoryChange(e.target.value)}
              className="w-full px-3.5 py-2.5 border rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-800 transition-all cursor-pointer"
              style={{ borderColor: '#e2e8f0' }}
            >
              {categories.map(c => (
                <option key={c._id || c.name} value={c.name}>
                  {c.name} ({c.subcategories?.length ? `${c.subcategories.length} sub-tiers` : `${c.creditPoints || 15} pts default`})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Document / Activity Title <span className="text-rose-500">*</span>
            </label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={e => {
                setFormData({ ...formData, title: e.target.value });
                setIsDuplicate(e.target.value.toLowerCase().includes('duplicate'));
              }}
              placeholder={isBook ? "e.g. Distributed Computing (ISBN Monograph)" : "e.g. Research paper or activity title"}
              className="w-full px-3.5 py-2.5 border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-800 transition-all"
              style={{ borderColor: '#e2e8f0' }}
            />
          </div>

          {/* Dynamic Subcategory Selection */}
          {availableSubcategories.length > 0 && (
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ListTree className="w-3.5 h-3.5 text-blue-600" />
                  Specific Subcategory / Tier Classification <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/60">
                  Select tier to apply exact credit rule
                </span>
              </label>
              <select
                value={formData.subcategory}
                onChange={e => {
                  const val = e.target.value;
                  const matchedSub = availableSubcategories.find(s => s.name === val);
                  setFormData({
                    ...formData,
                    subcategory: val,
                    bookType: matchedSub?.key || formData.bookType
                  });
                }}
                className="w-full px-3.5 py-2.5 border rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 text-blue-900 transition-all cursor-pointer shadow-2xs"
                style={{ borderColor: '#bfdbfe' }}
              >
                {availableSubcategories.map(sub => (
                  <option key={sub._id || sub.name} value={sub.name}>
                    {sub.name}  —  [{sub.creditPoints} Credits]{sub.description ? ` (${sub.description})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Publication / Activity Year</label>
            <input
              type="number"
              value={formData.year}
              min="2000"
              max="2030"
              onChange={e => setFormData({ ...formData, year: e.target.value })}
              className="w-full px-3.5 py-2.5 border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-800 transition-all"
              style={{ borderColor: '#e2e8f0' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Date (Optional)</label>
            <input
              type="date"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3.5 py-2.5 border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-800 transition-all cursor-pointer"
              style={{ borderColor: '#e2e8f0' }}
            />
          </div>
        </div>

        {/* ── 📚 BOOK SPECIFIC METADATA SECTION ── */}
        {isBook && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4.5 bg-blue-50/40 border border-blue-200/80 rounded-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-900">Book Details & Publisher Info</span>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg">
                ISBN & Author Details
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Publisher Name (e.g. IEEE, Springer, Pearson)
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={formData.publisher}
                    onChange={e => setFormData({ ...formData, publisher: e.target.value })}
                    placeholder="e.g. IEEE Computer Society / Springer"
                    className="w-full pl-9 pr-3.5 py-2.5 border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 transition-all shadow-2xs"
                    style={{ borderColor: '#cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ISBN Number
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={formData.isbn}
                    onChange={e => setFormData({ ...formData, isbn: e.target.value })}
                    placeholder="e.g. 978-0-123456-47-2"
                    className="w-full pl-9 pr-3.5 py-2.5 border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 transition-all shadow-2xs"
                    style={{ borderColor: '#cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Author Role
                </label>
                <select
                  value={formData.authorRole}
                  onChange={e => setFormData({ ...formData, authorRole: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 transition-all cursor-pointer shadow-2xs"
                  style={{ borderColor: '#cbd5e1' }}
                >
                  <option value="First / Principal Author">First / Principal Author</option>
                  <option value="Co-Author">Co-Author</option>
                  <option value="Chief Editor">Chief Editor</option>
                  <option value="Volume Editor">Volume Editor</option>
                  <option value="Chapter Author">Chapter Author</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── 📄 PUBLICATION SPECIFIC METADATA ── */}
        {isPub && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4.5 bg-blue-50/40 border border-blue-200/80 rounded-2xl space-y-4"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-blue-200/60 text-xs font-bold text-blue-900">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Publication Indexing & DOI</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Indexing Body</label>
                <select
                  value={formData.indexing}
                  onChange={e => setFormData({ ...formData, indexing: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 shadow-2xs cursor-pointer"
                  style={{ borderColor: '#cbd5e1' }}
                >
                  <option value="Scopus">Scopus / SCI / Web of Science</option>
                  <option value="UGC-CARE">UGC-CARE List</option>
                  <option value="Peer-Reviewed">Peer-Reviewed / Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Journal Quartile</label>
                <select
                  value={formData.quartile}
                  onChange={e => setFormData({ ...formData, quartile: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 shadow-2xs cursor-pointer"
                  style={{ borderColor: '#cbd5e1' }}
                >
                  <option value="Q1">Q1 Top 25% (40 Credits)</option>
                  <option value="Q2">Q2 25-50% (35 Credits)</option>
                  <option value="Q3">Q3 50-75% (30 Credits)</option>
                  <option value="Q4">Q4 75-100% (25 Credits)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">DOI / URL</label>
                <input
                  type="text"
                  value={formData.doi}
                  onChange={e => setFormData({ ...formData, doi: e.target.value })}
                  placeholder="e.g. 10.1109/TSE.2026.123456"
                  className="w-full px-3.5 py-2.5 border rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 shadow-2xs"
                  style={{ borderColor: '#cbd5e1' }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── 📎 DOCUMENT UPLOAD DROPZONE ── */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Attach Supporting PDF / Document Proof <span className="text-rose-500">*</span>
          </label>
          <div
            className="relative border-2 border-dashed rounded-2xl p-7 text-center transition-all cursor-pointer hover:border-blue-400"
            style={{
              borderColor: formData.file ? '#86efac' : '#cbd5e1',
              background: formData.file ? '#f0fdf4' : '#f8fafc'
            }}
          >
            <input
              type="file"
              required
              accept=".pdf,.doc,.docx,.png,.jpg"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={e => setFormData({ ...formData, file: e.target.files[0] || null })}
            />
            {formData.file ? (
              <div className="flex flex-col items-center gap-1">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                <span className="font-bold text-emerald-800 text-xs">{formData.file.name}</span>
                <span className="text-[11px] text-emerald-600 font-medium">
                  {(formData.file.size / 1024 / 1024).toFixed(2)} MB · Ready to submit
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <UploadCloud className="w-9 h-9 text-blue-500" />
                <p className="text-xs font-bold text-slate-700">Click to choose file or drag & drop</p>
                <p className="text-[10px] text-slate-400">PDF, DOCX, or scanned certificate (Max 25 MB)</p>
              </div>
            )}
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-500 font-medium">
            Your document will be submitted to the approval pipeline for credit validation.
          </p>

          <button
            type="submit"
            disabled={isSubmitting || !formData.file || !formData.category}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-50 flex items-center gap-2 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Submitting Proposal…' : 'Submit for Review'}</span>
          </button>
        </div>
      </form>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 z-50 bg-emerald-600"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold text-xs">Research proposal submitted for review successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
