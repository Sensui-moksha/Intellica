import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.99 },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: [0.21, 0.47, 0.32, 0.98] }
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.99,
    transition: { duration: 0.18, ease: [0.4, 0, 0.6, 1] }
  }
};

export default function DashboardLayout({ role }) {
  const currentRole = localStorage.getItem('role');
  const location = useLocation();

  if (!currentRole || currentRole !== role) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: '#f0f4ff' }}>
      {/* Sidebar — pure white */}
      <Sidebar role={role} />

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header />

        {/* Animated page content */}
        <main className="flex-1 overflow-auto p-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              style={{ height: '100%' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
