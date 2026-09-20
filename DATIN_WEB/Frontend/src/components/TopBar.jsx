import React from 'react';
import { motion } from 'framer-motion';
import { useHoverSound, useClickSound } from '../hooks/useHoverSound';
import './TopBar.css';

const TopBar = ({ onMenuToggle, user, onProfileClick }) => {
  const hover = useHoverSound();
  const click = useClickSound();

  return (
    <div className="topbar">
      <motion.button
        className="topbar-hamburger"
        onClick={(e) => { click.onClick(); onMenuToggle(); }}
        onMouseEnter={hover.onMouseEnter}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.93 }}
        aria-label="Toggle menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </motion.button>

      <motion.button
        className="topbar-avatar"
        onClick={(e) => { click.onClick(); onProfileClick(); }}
        onMouseEnter={hover.onMouseEnter}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.93 }}
        aria-label="Profile"
      >
        {user ? (
          <span className="topbar-avatar-initial">
            {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </motion.button>
    </div>
  );
};

export default TopBar;
