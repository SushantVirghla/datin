import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useHoverSound, useClickSound } from '../hooks/useHoverSound';
import './ChatBar.css';

const ChatBar = ({ onSend, isLoading }) => {
  const [message, setMessage] = useState('');
  const hover = useHoverSound();
  const click = useClickSound();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      click.onClick();
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <div className="chatbar-wrapper">
      <motion.form
        className="chatbar"
        onSubmit={handleSubmit}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="chatbar-robot-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="8" width="16" height="12" rx="3" stroke="#999" strokeWidth="1.8" />
            <circle cx="9" cy="14" r="1.5" fill="#999" />
            <circle cx="15" cy="14" r="1.5" fill="#999" />
            <path d="M12 4V8" stroke="#999" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="3" r="1.5" fill="#999" />
          </svg>
        </div>

        <input
          type="text"
          className="chatbar-input"
          placeholder="Ask DATIN..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isLoading}
        />

        <button
          type="button"
          className="chatbar-mic-btn"
          aria-label="Voice input"
          onMouseEnter={hover.onMouseEnter}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        <motion.button
          type="submit"
          className="chatbar-send-btn"
          disabled={isLoading || !message.trim()}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          onMouseEnter={hover.onMouseEnter}
          aria-label="Send message"
        >
          {isLoading ? (
            <div className="chatbar-loading-dots">
              <span /><span /><span />
            </div>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          )}
        </motion.button>
      </motion.form>
    </div>
  );
};

export default ChatBar;
