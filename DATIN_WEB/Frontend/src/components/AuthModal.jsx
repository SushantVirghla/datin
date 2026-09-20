import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { login, signup } from '../api/auth';
import { useHoverSound, useClickSound } from '../hooks/useHoverSound';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [formData, setFormData] = useState({
    fullName: '', email: '', password: '', walletAddress: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const hover = useHoverSound();
  const click = useClickSound();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const data = await login(formData.email, formData.password);
        onAuthSuccess(data.user);
        onClose();
      } else {
        await signup(formData.fullName, formData.email, formData.password, formData.walletAddress);
        // Auto-login after signup
        const data = await login(formData.email, formData.password);
        onAuthSuccess(data.user);
        onClose();
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Something went wrong'
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    click.onClick();
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="auth-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="auth-modal glass-card"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        >
          <div className="auth-header">
            <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
            <p>{mode === 'login' ? 'Sign in to your DATIN account' : 'Join the DATIN network'}</p>
            <button className="auth-close" onClick={onClose} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="glass-input"
                  type="text"
                  name="fullName"
                  placeholder="Your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="glass-input"
                type="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="glass-input"
                type="password"
                name="password"
                placeholder={mode === 'signup' ? 'Min 6 characters' : 'Your password'}
                value={formData.password}
                onChange={handleChange}
                required
                minLength={mode === 'signup' ? 6 : undefined}
              />
            </div>

            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Wallet Address <span style={{ opacity: 0.5 }}>(optional)</span></label>
                <input
                  className="glass-input"
                  type="text"
                  name="walletAddress"
                  placeholder="Solana wallet address"
                  value={formData.walletAddress}
                  onChange={handleChange}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn-primary auth-submit"
              disabled={loading}
              onMouseEnter={hover.onMouseEnter}
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="auth-switch">
            <span>{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}</span>
            <button onClick={switchMode} onMouseEnter={hover.onMouseEnter}>
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthModal;
