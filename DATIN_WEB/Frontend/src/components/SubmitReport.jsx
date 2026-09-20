import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { AUTH_BASE_URL } from '../api/config';
import { getToken } from '../api/auth';
import { useHoverSound } from '../hooks/useHoverSound';
import './SubmitReport.css';

const SubmitReport = () => {
  const navigate = useNavigate();
  const hover = useHoverSound();
  const [formData, setFormData] = useState({
    content: '', tokenAddress: '', reward: '10', totalValidators: '5',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const token = getToken();
    if (!token) {
      setError('Please login first');
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.post(
        `${AUTH_BASE_URL}/submit-report`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setSuccess(`Report submitted! Transaction ID: ${data.transactionId}`);
        setFormData({ content: '', tokenAddress: '', reward: '10', totalValidators: '5' });
      } else {
        setError(data.message || 'Failed to submit report');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="submit-report-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Threat Intelligence Dispatch</span>
          </div>

          <h1 className="page-title">Submit Report</h1>
          <p className="page-subtitle">Submit a verified cybersecurity threat or vulnerability finding to the DATIN network</p>

          <div className="glass-card submit-report-card">
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Report Content</label>
                <textarea
                  className="glass-textarea"
                  name="content"
                  placeholder="Describe the cybersecurity threat, vulnerability, attack vector, or finding in detail..."
                  value={formData.content}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Token Address</label>
                <input
                  className="glass-input"
                  type="text"
                  name="tokenAddress"
                  placeholder="Solana token address or contract mint"
                  value={formData.tokenAddress}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="submit-report-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Reward (DTNC)</label>
                  <input
                    className="glass-input"
                    type="number"
                    name="reward"
                    placeholder="10"
                    value={formData.reward}
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Total Validators</label>
                  <input
                    className="glass-input"
                    type="number"
                    name="totalValidators"
                    placeholder="5"
                    value={formData.totalValidators}
                    onChange={handleChange}
                    min="1"
                    max="20"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary submit-report-btn"
                disabled={loading}
                onMouseEnter={hover.onMouseEnter}
              >
                {loading ? 'Submitting...' : (
                  <>
                    <span>Submit Report</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SubmitReport;
