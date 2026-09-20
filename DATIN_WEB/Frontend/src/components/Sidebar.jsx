import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useHoverSound, useClickSound } from '../hooks/useHoverSound';
import './Sidebar.css';

const navItems = [
  {
    id: 'chat',
    label: 'Chat',
    path: '/',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="10" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    id: 'submit-report',
    label: 'Submit Report',
    path: '/submit-report',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    id: 'view-reports',
    label: 'View Reports',
    path: '/view-reports',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: 'store',
    label: 'Store',
    path: '/store',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M14.8 9A2 2 0 0 0 13 8h-2a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-2a2 2 0 0 1-1.8-1" />
        <path d="M12 6v2m0 8v2" />
      </svg>
    ),
  },
];

// Buttery smooth Apple visionOS cubic-bezier easing
const sidebarVariants = {
  hidden: {
    x: '-100%',
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
  },
  visible: {
    x: '0%',
    transition: { duration: 0.34, ease: [0.16, 1, 0.3, 1] }
  },
};

const backdropVariants = {
  hidden: { opacity: 0, transition: { duration: 0.22, ease: 'linear' } },
  visible: { opacity: 1, transition: { duration: 0.25, ease: 'linear' } },
};

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const hover = useHoverSound();
  const click = useClickSound();

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleNav = (path) => {
    click.onClick();
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence mode="sync" initial={false}>
      {isOpen && (
        <>
          <motion.div
            className="sidebar-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />

          <motion.aside
            className="sidebar"
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Top Close Button */}
            <div className="sidebar-top">
              <motion.button
                className="sidebar-close"
                onClick={onClose}
                onMouseEnter={hover.onMouseEnter}
                whileHover={{ scale: 1.10 }}
                whileTap={{ scale: 0.92 }}
                aria-label="Close menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </motion.button>
            </div>

            {/* Pure Minimalist Glass Icons Navigation (No text labels) */}
            <nav className="sidebar-nav">
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path === '/' && location.pathname === '/chat');

                return (
                  <div key={item.id} className="sidebar-nav-item-wrapper">
                    <motion.button
                      className={`sidebar-glass-icon-btn ${isActive ? 'active' : ''}`}
                      onClick={() => handleNav(item.path)}
                      onMouseEnter={hover.onMouseEnter}
                      whileHover={{ scale: 1.12, y: -2 }}
                      whileTap={{ scale: 0.92 }}
                      aria-label={item.label}
                    >
                      {item.icon}

                      {/* Smooth floating visionOS glass tooltip */}
                      <span className="sidebar-glass-tooltip">{item.label}</span>
                    </motion.button>
                  </div>
                );
              })}
            </nav>

            {/* Bottom Minimalist Status Indicator */}
            <div className="sidebar-bottom">
              <div className="sidebar-status-dot" title="DATIN Network Active" />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
