import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Building2, Users2, CheckSquare,
  SlidersHorizontal, ListOrdered, Settings,
  LogOut, HelpCircle, Send, BarChart3, Calendar, FileText, ClipboardList
} from 'lucide-react';
import { adminApi, hodApi, authApi } from '../api/services';

import micEmblem from '../assets/mic_emblem.png';

const sidebarVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] } }
};

export default function Sidebar({ role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (role === 'HOD') {
      hodApi.getPendingUploads().then(res => {
        const list = Array.isArray(res.data) ? res.data : res.data?.uploads || [];
        setPendingCount(list.length);
      }).catch(() => { });
    } else if (role === 'ADMIN') {
      adminApi.getPendingUploads().then(res => {
        const list = Array.isArray(res.data) ? res.data : res.data?.uploads || [];
        setPendingCount(list.length);
      }).catch(() => { });
    }
  }, [role, location.pathname]);

  const navItems = {
    ADMIN: [
      { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutGrid },
      { name: 'Departments', path: '/admin/departments', icon: Building2 },
      { name: 'Faculty', path: '/admin/faculty', icon: Users2 },
      { name: 'Approvals', path: '/admin/approvals', icon: CheckSquare, badge: pendingCount },
      { name: 'Credit Config', path: '/admin/credit-config', icon: SlidersHorizontal },
      { name: 'PBAS Appraisal', path: '/admin/pbas-appraisal', icon: ClipboardList },
      { name: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
      { name: 'Calendar', path: '/admin/calendar', icon: Calendar },
      { name: 'Settings', path: '/admin/settings', icon: Settings },
    ],
    HOD: [
      { name: 'Dashboard', path: '/hod/dashboard', icon: LayoutGrid },
      { name: 'Faculty', path: '/hod/faculty', icon: Users2 },
      { name: 'Approvals', path: '/hod/approvals', icon: CheckSquare, badge: pendingCount },
      { name: 'My Activities', path: '/hod/my-activities', icon: ListOrdered },
      { name: 'PBAS Appraisal', path: '/hod/pbas-appraisal', icon: ClipboardList },
      { name: 'Reports & Analytics', path: '/hod/reports', icon: BarChart3 },
      { name: 'Calendar', path: '/hod/calendar', icon: Calendar },
      { name: 'Settings', path: '/hod/settings', icon: Settings },
    ],
    FACULTY: [
      { name: 'Dashboard', path: '/faculty/dashboard', icon: LayoutGrid },
      { name: 'My Uploads', path: '/faculty/my-uploads', icon: FileText },
      { name: 'Standings', path: '/faculty/standings', icon: BarChart3 },
      { name: 'PBAS Appraisal', path: '/faculty/pbas-appraisal', icon: ClipboardList },
      { name: 'Calendar', path: '/faculty/calendar', icon: Calendar },
      { name: 'Settings', path: '/faculty/settings', icon: Settings },
    ],
  };

  const links = navItems[role] || [];
  const roleLabel = {
    ADMIN: 'Admin Portal',
    HOD: 'HOD Portal',
    FACULTY: 'Faculty Portal'
  };

  const handleLogout = async () => {
    try { await authApi.logout(); } catch (_) {}
    localStorage.clear();
    navigate('/login');
  };

  const handleSubmitProposal = () => {
    if (role === 'HOD') {
      navigate('/hod/upload');
    } else if (role === 'FACULTY') {
      navigate('/faculty/upload');
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="w-64 shrink-0 h-full flex flex-col z-20 border-r select-none relative overflow-hidden"
      style={{ background: '#ffffff', borderColor: '#e8edf5' }}
    >
      {/* Brand Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.25 }}
        className="px-6 pt-6 pb-2"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.08 }}
            transition={{ type: "spring", stiffness: 400 }}
            className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 p-1 flex items-center justify-center shadow-sm shrink-0 overflow-hidden"
          >
            <img src={micEmblem} alt="MIC Emblem" className="w-full h-full object-contain" />
          </motion.div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight leading-tight">Intellica</h2>
            <p className="text-[11px] font-bold text-slate-400">{roleLabel[role] || 'Academic Portal'}</p>
          </div>
        </div>
      </motion.div>

      {/* Navigation Links */}
      <motion.nav
        variants={sidebarVariants}
        initial="hidden"
        animate="show"
        className="flex-1 px-4 space-y-1 mt-3 overflow-y-auto"
      >
        {links.map((item) => (
          <motion.div key={item.path} variants={itemVariants}>
            <NavLink to={item.path} className="block">
              {({ isActive }) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    whileHover={{ x: isActive ? 0 : 3 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all relative ${isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    {/* Active indicator pill */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-indicator"
                        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 -z-10"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}

                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span>{item.name}</span>
                    </div>

                    {/* Badge */}
                    {item.badge !== undefined && item.badge > 0 && (
                      <AnimatePresence>
                        <motion.span
                          key={item.badge}
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'}`}
                        >
                          {item.badge}
                        </motion.span>
                      </AnimatePresence>
                    )}
                  </motion.div>
                );
              }}
            </NavLink>
          </motion.div>
        ))}
      </motion.nav>

      {/* Bottom Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="px-4 pb-5 pt-2 space-y-2 border-t border-slate-100/80 relative z-10 bg-white/90 backdrop-blur-xs"
      >
        {/* Submit Proposal CTA Button */}
        {(role === 'HOD' || role === 'FACULTY') && (
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(37,99,235,0.35)' }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmitProposal}
            className="w-full text-white font-bold py-3 px-4 rounded-2xl shadow-md shadow-blue-500/25 text-center transition-all cursor-pointer flex items-center justify-center gap-2 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Proposal</span>
          </motion.button>
        )}

        {/* Support Link */}
        <motion.button
          whileHover={{ x: 2 }}
          type="button"
          onClick={() => { }}
          className="flex items-center gap-3 px-3.5 py-2 w-full rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <span>Support</span>
        </motion.button>

        {/* Logout Link */}
        <motion.button
          whileHover={{ x: 2 }}
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 px-3.5 py-2 w-full rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-400 hover:text-rose-500" />
          <span>Logout</span>
        </motion.button>
      </motion.div>

      {/* Subtle University Tower Graphic in bottom corner */}
      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none opacity-20 flex items-end justify-center">
        <svg viewBox="0 0 200 60" className="w-full h-full text-blue-600" fill="currentColor">
          <path d="M 20 60 L 20 40 L 40 40 L 40 60 Z M 50 60 L 50 35 L 70 35 L 70 60 Z M 85 60 L 85 20 L 95 10 L 105 10 L 115 20 L 115 60 Z M 130 60 L 130 35 L 150 35 L 150 60 Z M 160 60 L 160 40 L 180 40 L 180 60 Z" />
        </svg>
      </div>
    </motion.div>
  );
}
