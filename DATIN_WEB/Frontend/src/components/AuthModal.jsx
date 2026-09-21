import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  login,
  sendSignupOtp,
  verifySignupOtp,
  resendSignupOtp,
  sendForgotPasswordOtp,
  resetPassword,
} from '../api/auth';
import { useHoverSound, useClickSound } from '../hooks/useHoverSound';
import './AuthModal.css';

const AuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [signupStep, setSignupStep] = useState(1); // 1 = Details, 2 = OTP Verification
  const [forgotStep, setForgotStep] = useState(1); // 1 = Request Email, 2 = OTP + New Password
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    walletAddress: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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

  // Focus first OTP box when entering OTP step
  useEffect(() => {
    if (((mode === 'signup' && signupStep === 2) || (mode === 'forgot' && forgotStep === 2)) && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [mode, signupStep, forgotStep]);

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
  const newPasswordStrength = getPasswordStrength(newPassword);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccessMsg('');
  };

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    const numeric = value.replace(/[^0-9]/g, '');
    if (!numeric && value !== '') return;

    const newOtp = [...otpDigits];
    newOtp[index] = numeric.slice(-1);
    setOtpDigits(newOtp);
    setError('');

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
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const data = await login(formData.email, formData.password);
        onAuthSuccess(data.user);
        onClose();
      } else if (mode === 'signup') {
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

  // Step 2 Submit: Verify 6-digit Signup OTP
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

  // Resend OTP code for Signup
  const handleResendSignup = async () => {
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

  // Forgot Password: Step 1 Submit (Send Reset OTP)
  const handleForgotStep1Submit = async (e) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      setError('Please enter your account email address');
      return;
    }

    setError('');
    setInfoMsg('');
    setLoading(true);

    try {
      const res = await sendForgotPasswordOtp(formData.email);
      setForgotStep(2);
      setResendCooldown(res.cooldownSeconds || 60);
      setInfoMsg(`A 6-digit reset passcode has been sent to ${formData.email.trim().toLowerCase()}.`);
      if (res.devOtp) {
        setDevOtpNotice(`Dev OTP: ${res.devOtp}`);
      }
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to send password reset code.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password: Step 2 Submit (Verify OTP + Set New Password)
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of your reset code.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    if (newPasswordStrength.score < 3) {
      setError('Please choose a stronger password with uppercase, lowercase, numbers, and symbols');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await resetPassword(formData.email, otpCode, newPassword);
      setMode('login');
      setSuccessMsg(res.message || 'Password successfully updated! You can now sign in.');
      setFormData((prev) => ({ ...prev, password: '' }));
      setNewPassword('');
      setOtpDigits(['', '', '', '', '', '']);
      setForgotStep(1);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to reset password. Please check your verification code.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP code for Forgot Password
  const handleResendForgotOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    click.onClick();
    setError('');
    setLoading(true);

    try {
      const res = await sendForgotPasswordOtp(formData.email);
      setResendCooldown(res.cooldownSeconds || 60);
      setInfoMsg(`A fresh reset code was sent to ${formData.email}.`);
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
        'Failed to resend reset code'
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    click.onClick();
    if (mode === 'forgot') {
      setMode('login');
    } else {
      setMode(mode === 'login' ? 'signup' : 'login');
    }
    setSignupStep(1);
    setForgotStep(1);
    setOtpDigits(['', '', '', '', '', '']);
    setNewPassword('');
    setError('');
    setInfoMsg('');
    setSuccessMsg('');
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
              <span>
                {mode === 'login'
                  ? 'Secure Sign In'
                  : mode === 'forgot'
                  ? 'Password Recovery'
                  : signupStep === 1
                  ? 'Verified Registration'
                  : 'Email Security Check'}
              </span>
            </div>

            <h2>
              {mode === 'login'
                ? 'Welcome back'
                : mode === 'forgot'
                ? forgotStep === 1
                  ? 'Reset password'
                  : 'Set new password'
                : signupStep === 1
                ? 'Create account'
                : 'Enter verification code'}
            </h2>
            <p>
              {mode === 'login'
                ? 'Sign in to access your DATIN neural node'
                : mode === 'forgot'
                ? forgotStep === 1
                  ? 'Enter your registered email to receive a recovery code'
                  : `Enter the code sent to ${formData.email} and set your new password`
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

          {/* Success Banner */}
          {successMsg && (
            <motion.div
              className="auth-alert-banner success"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{successMsg}</span>
            </motion.div>
          )}

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

          {/* ============================================================== */}
          {/* MODE: LOGIN OR SIGNUP (STEP 1)                                */}
          {/* ============================================================== */}
          {(mode === 'login' || (mode === 'signup' && signupStep === 1)) && (
            <form onSubmit={handleSubmitStep1} className="auth-form">
              {mode === 'signup' && (
                <div className="form-group">
                  <div className="auth-public-note">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>
                      <strong>Public Identity:</strong> Your Full Name will be displayed publicly on submitted threat reports, consensus audits, and security discussions.
                    </span>
                  </div>
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
                  {mode === 'login' ? (
                    <button
                      type="button"
                      className="auth-forgot-link"
                      onClick={() => {
                        click.onClick();
                        setMode('forgot');
                        setForgotStep(1);
                        setError('');
                        setInfoMsg('');
                        setSuccessMsg('');
                      }}
                    >
                      Forgot Password?
                    </button>
                  ) : formData.password ? (
                    <span className="password-strength-label" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </span>
                  ) : null}
                </div>

                <div className="password-input-wrapper">
                  <input
                    className="glass-input"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder={mode === 'signup' ? 'Min 8 chars, uppercase, number & symbol' : 'Your password'}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={mode === 'signup' ? 8 : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => {
                      click.onClick();
                      setShowPassword((prev) => !prev);
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Password Strength Meter (Signup only) */}
                {mode === 'signup' && formData.password && (
                  <div className="password-meter-wrap">
                    <div className="password-meter-track">
                      <div
                        className="password-meter-fill"
                        style={{
                          width: `${passwordStrength.percent}%`,
                          backgroundColor: passwordStrength.color,
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

          {/* ============================================================== */}
          {/* MODE: SIGNUP STEP 2 (6-Digit OTP Verification)               */}
          {/* ============================================================== */}
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
                  onClick={handleResendSignup}
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

          {/* ============================================================== */}
          {/* MODE: FORGOT PASSWORD (STEP 1 - EMAIL REQUEST)                 */}
          {/* ============================================================== */}
          {mode === 'forgot' && forgotStep === 1 && (
            <form onSubmit={handleForgotStep1Submit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Your Registered Email</label>
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

              <button
                type="submit"
                className="btn-primary auth-submit"
                disabled={loading}
                onMouseEnter={hover.onMouseEnter}
              >
                {loading ? 'Sending Code...' : 'Send Reset Code'}
              </button>

              <div className="otp-actions-row" style={{ justifyContent: 'center' }}>
                <button
                  type="button"
                  className="otp-back-btn"
                  onClick={() => {
                    click.onClick();
                    setMode('login');
                    setError('');
                    setInfoMsg('');
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* MODE: FORGOT PASSWORD (STEP 2 - OTP & NEW PASSWORD)            */}
          {/* ============================================================== */}
          {mode === 'forgot' && forgotStep === 2 && (
            <form onSubmit={handleResetPasswordSubmit} className="auth-form otp-verify-form">
              <div className="otp-input-section">
                <label className="form-label" style={{ textAlign: 'center', marginBottom: '0.8rem', display: 'block' }}>
                  Enter 6-Digit Password Reset Code
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

              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <div className="form-label-row">
                  <label className="form-label">New Password</label>
                  {newPassword && (
                    <span className="password-strength-label" style={{ color: newPasswordStrength.color }}>
                      {newPasswordStrength.label}
                    </span>
                  )}
                </div>

                <div className="password-input-wrapper">
                  <input
                    className="glass-input"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Min 8 chars, uppercase, number & symbol"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError('');
                    }}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => {
                      click.onClick();
                      setShowNewPassword((prev) => !prev);
                    }}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {newPassword && (
                  <div className="password-meter-wrap">
                    <div className="password-meter-track">
                      <div
                        className="password-meter-fill"
                        style={{
                          width: `${newPasswordStrength.percent}%`,
                          backgroundColor: newPasswordStrength.color,
                        }}
                      />
                    </div>
                    <div className="password-rules-hints">
                      <span className={newPassword.length >= 8 ? 'rule-met' : ''}>8+ Chars</span>
                      <span className={/[A-Z]/.test(newPassword) ? 'rule-met' : ''}>Uppercase</span>
                      <span className={/[0-9]/.test(newPassword) ? 'rule-met' : ''}>Number</span>
                      <span className={/[^A-Za-z0-9]/.test(newPassword) ? 'rule-met' : ''}>Symbol</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary auth-submit"
                disabled={loading || otpDigits.join('').length !== 6 || newPassword.length < 8}
                onMouseEnter={hover.onMouseEnter}
              >
                {loading ? 'Resetting...' : 'Save New Password & Sign In'}
              </button>

              <div className="otp-actions-row">
                <button
                  type="button"
                  className="otp-back-btn"
                  onClick={() => {
                    click.onClick();
                    setForgotStep(1);
                    setError('');
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>Edit Email</span>
                </button>

                <button
                  type="button"
                  className="otp-resend-btn"
                  onClick={handleResendForgotOtp}
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
            <span>
              {mode === 'forgot'
                ? 'Remember your password?'
                : mode === 'login'
                ? "Don't have an account?"
                : 'Already have an account?'}
            </span>
            <button onClick={switchMode} onMouseEnter={hover.onMouseEnter}>
              {mode === 'forgot'
                ? 'Sign In'
                : mode === 'login'
                ? 'Sign Up with Email'
                : 'Sign In'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthModal;
