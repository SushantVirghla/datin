import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { login, sendSignupOtp, verifySignupOtp, resendSignupOtp } from '../api/auth';
import { useHoverSound, useClickSound } from '../hooks/useHoverSound';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [signupStep, setSignupStep] = useState(1); // 1 = Details, 2 = OTP Verification
  const [formData, setFormData] = useState({
    fullName: '', email: '', password: '', walletAddress: '',
  });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [devOtpNotice, setDevOtpNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRefs = useRef([]);
  const hover = useHoverSound();
  const click = useClickSound();

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus first OTP box when entering step 2
  useEffect(() => {
    if (signupStep === 2 && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [signupStep]);

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[a-z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: '#FF3B30', percent: 25 };
      case 2:
        return { score: 2, label: 'Fair', color: '#FF9500', percent: 50 };
      case 3:
        return { score: 3, label: 'Good', color: '#007AFF', percent: 75 };
      case 4:
        return { score: 4, label: 'Strong', color: '#34C759', percent: 100 };
      default:
        return { score: 0, label: 'Too short', color: '#8e8e93', percent: 10 };
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    // Only accept numeric inputs
    const numeric = value.replace(/[^0-9]/g, '');
    if (!numeric && value !== '') return;

    const newOtp = [...otpDigits];
    newOtp[index] = numeric.slice(-1); // Take only the latest digit
    setOtpDigits(newOtp);
    setError('');

    // Auto-advance to next box
    if (numeric && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otpDigits];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtpDigits(newOtp);
    setError('');

    const focusIdx = Math.min(pastedData.length, 5);
    otpInputRefs.current[focusIdx]?.focus();
  };

  // Step 1 Submit: Login OR Send Signup OTP
  const handleSubmitStep1 = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const data = await login(formData.email, formData.password);
        onAuthSuccess(data.user);
        onClose();
      } else {
        // Validation checks
        if (formData.password.length < 8) {
          throw new Error('Password must be at least 8 characters long');
        }
        if (passwordStrength.score < 3) {
          throw new Error('Please choose a stronger password containing uppercase, lowercase, numbers, and symbols');
        }

        const res = await sendSignupOtp(
          formData.fullName,
          formData.email,
          formData.password,
          formData.walletAddress
        );

        setSignupStep(2);
        setResendCooldown(res.cooldownSeconds || 60);
        setInfoMsg(`A 6-digit verification code has been sent to ${formData.email.trim().toLowerCase()}.`);
        if (res.devOtp) {
          setDevOtpNotice(`Dev OTP: ${res.devOtp}`);
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Something went wrong'
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2 Submit: Verify 6-digit OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await verifySignupOtp(formData.email, otpCode);
      onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Invalid verification code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP code
  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    click.onClick();
    setError('');
    setLoading(true);

    try {
      const res = await resendSignupOtp(formData.email);
      setResendCooldown(res.cooldownSeconds || 60);
      setInfoMsg(`A new verification code was sent to ${formData.email}.`);
      if (res.devOtp) {
        setDevOtpNotice(`Dev OTP: ${res.devOtp}`);
      }
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to resend code'
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    click.onClick();
    setMode(mode === 'login' ? 'signup' : 'login');
    setSignupStep(1);
    setOtpDigits(['', '', '', '', '', '']);
    setError('');
    setInfoMsg('');
    setDevOtpNotice('');
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
          {/* Header */}
          <div className="auth-header">
            <div className="auth-header-badge">
              <span className="auth-radar-dot" />
              <span>{mode === 'login' ? 'Secure Sign In' : signupStep === 1 ? 'Verified Registration' : 'Email Security Check'}</span>
            </div>

            <h2>
              {mode === 'login'
                ? 'Welcome back'
                : signupStep === 1
                ? 'Create account'
                : 'Enter verification code'}
            </h2>
            <p>
              {mode === 'login'
                ? 'Sign in to access your DATIN neural node'
                : signupStep === 1
                ? 'Real email verification is required to prevent sybil/fake nodes'
                : `We sent a 6-digit code to ${formData.email}`}
            </p>

            <button className="auth-close" onClick={onClose} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              className="form-error auth-alert-banner error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </motion.div>
          )}

          {/* Info / Dev Notice */}
          {infoMsg && !error && (
            <div className="auth-alert-banner info">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>{infoMsg}</span>
            </div>
          )}

          {devOtpNotice && (
            <div className="auth-dev-otp-box">
              <span className="auth-dev-tag">Developer Preview</span>
              <span>{devOtpNotice}</span>
            </div>
          )}

          {/* STEP 1: Login OR Signup Credentials Entry */}
          {(mode === 'login' || signupStep === 1) && (
            <form onSubmit={handleSubmitStep1} className="auth-form">
              {mode === 'signup' && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    className="glass-input"
                    type="text"
                    name="fullName"
                    placeholder="e.g. Satoshi Nakamoto"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="glass-input"
                  type="email"
                  name="email"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <div className="form-label-row">
                  <label className="form-label">Password</label>
                  {mode === 'signup' && formData.password && (
                    <span className="password-strength-label" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </span>
                  )}
                </div>
                <input
                  className="glass-input"
                  type="password"
                  name="password"
                  placeholder={mode === 'signup' ? 'Min 8 chars, uppercase, number & symbol' : 'Your password'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={mode === 'signup' ? 8 : undefined}
                />

                {/* Password Strength Meter (Signup only) */}
                {mode === 'signup' && formData.password && (
                  <div className="password-meter-wrap">
                    <div className="password-meter-track">
                      <div
                        className="password-meter-fill"
                        style={{
                          width: `${passwordStrength.percent}%`,
                          backgroundColor: passwordStrength.color
                        }}
                      />
                    </div>
                    <div className="password-rules-hints">
                      <span className={formData.password.length >= 8 ? 'rule-met' : ''}>8+ Chars</span>
                      <span className={/[A-Z]/.test(formData.password) ? 'rule-met' : ''}>Uppercase</span>
                      <span className={/[0-9]/.test(formData.password) ? 'rule-met' : ''}>Number</span>
                      <span className={/[^A-Za-z0-9]/.test(formData.password) ? 'rule-met' : ''}>Symbol</span>
                    </div>
                  </div>
                )}
              </div>

              {mode === 'signup' && (
                <div className="form-group">
                  <label className="form-label">
                    Solana Wallet Address <span style={{ opacity: 0.5 }}>(optional for rewards)</span>
                  </label>
                  <input
                    className="glass-input"
                    type="text"
                    name="walletAddress"
                    placeholder="e.g. 5YNmS1R9nNSUbMp... (Solana pubkey)"
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
                {loading
                  ? 'Please wait...'
                  : mode === 'login'
                  ? 'Sign In'
                  : 'Send Verification Code'}
              </button>
            </form>
          )}

          {/* STEP 2: 6-Digit OTP Verification Screen */}
          {mode === 'signup' && signupStep === 2 && (
            <form onSubmit={handleVerifyOtp} className="auth-form otp-verify-form">
              <div className="otp-input-section">
                <label className="form-label" style={{ textAlign: 'center', marginBottom: '1rem', display: 'block' }}>
                  Enter 6-Digit Security Code
                </label>

                <div className="otp-digit-boxes" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className={`glass-input otp-single-digit ${digit ? 'filled' : ''}`}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e.target.value ? e : e)}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary auth-submit"
                disabled={loading || otpDigits.join('').length !== 6}
                onMouseEnter={hover.onMouseEnter}
              >
                {loading ? 'Verifying...' : 'Verify & Enter DATIN'}
              </button>

              <div className="otp-actions-row">
                <button
                  type="button"
                  className="otp-back-btn"
                  onClick={() => {
                    click.onClick();
                    setSignupStep(1);
                    setError('');
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>Edit Details</span>
                </button>

                <button
                  type="button"
                  className="otp-resend-btn"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                >
                  {resendCooldown > 0 ? (
                    <span>Resend code in <strong>{resendCooldown}s</strong></span>
                  ) : (
                    <span>Resend Code</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Footer Switch */}
          <div className="auth-switch">
            <span>{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}</span>
            <button onClick={switchMode} onMouseEnter={hover.onMouseEnter}>
              {mode === 'login' ? 'Sign Up with Email' : 'Sign In'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthModal;

