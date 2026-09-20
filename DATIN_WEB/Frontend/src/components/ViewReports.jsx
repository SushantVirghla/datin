import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AUTH_BASE_URL } from '../api/config';
import { getToken, getStoredUser } from '../api/auth';
import { useHoverSound, useClickSound } from '../hooks/useHoverSound';
import './ViewReports.css';

const ViewReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my' | 'community'
  const [expandedReport, setExpandedReport] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState({});
  const [validationWallet, setValidationWallet] = useState('');
  const [actionError, setActionError] = useState('');
  const hover = useHoverSound();
  const click = useClickSound();
  const currentUser = getStoredUser();

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${getToken()}` }
  });

  const fetchReports = async () => {
    try {
      const { data } = await axios.get(`${AUTH_BASE_URL}/reports`, authHeaders());
      if (data.success) setReports(data.reports || []);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const isUserReport = (report) => {
    if (!currentUser) return false;
    const currentId = String(currentUser.id || '');
    const currentEmail = String(currentUser.email || '').toLowerCase();
    const reportUserId = String(report.userId || '');
    const reportEmail = String(report.userEmail || '').toLowerCase();
    const reportOwner = String(report.owner || '').toLowerCase();

    return (
      (currentId && reportUserId && currentId === reportUserId) ||
      (currentEmail && reportEmail && currentEmail === reportEmail) ||
      (currentEmail && reportOwner && currentEmail === reportOwner)
    );
  };

  const myReports = useMemo(() => {
    return reports.filter(r => isUserReport(r));
  }, [reports, currentUser]);

  const communityReports = useMemo(() => {
    return reports.filter(r => !isUserReport(r));
  }, [reports, currentUser]);

  const displayedReports = useMemo(() => {
    if (activeTab === 'my') return myReports;
    if (activeTab === 'community') return communityReports;
    // Default 'all' view: My Reports first, followed by Community Reports
    return [...myReports, ...communityReports];
  }, [activeTab, myReports, communityReports]);

  const handleLike = async (reportId) => {
    click.onClick();
    try {
      const { data } = await axios.post(`${AUTH_BASE_URL}/toggle-like/${reportId}`, {}, authHeaders());
      if (data.success) fetchReports();
    } catch (err) { console.error(err); }
  };

  const handleComment = async (reportId) => {
    if (!commentText.trim()) return;
    click.onClick();
    try {
      await axios.post(`${AUTH_BASE_URL}/add-comment/${reportId}`, { content: commentText }, authHeaders());
      setCommentText('');
      loadComments(reportId);
      fetchReports();
    } catch (err) { console.error(err); }
  };

  const loadComments = async (reportId) => {
    try {
      const { data } = await axios.get(`${AUTH_BASE_URL}/comments/${reportId}`, authHeaders());
      if (data.success) setComments(prev => ({ ...prev, [reportId]: data.comments }));
    } catch (err) { console.error(err); }
  };

  const handleValidate = async (reportId) => {
    if (!validationWallet.trim()) return;
    click.onClick();
    setActionError('');
    try {
      await axios.post(`${AUTH_BASE_URL}/validate/${reportId}`, { walletAddress: validationWallet }, authHeaders());
      setValidationWallet('');
      fetchReports();
    } catch (err) {
      const msg = err.response?.data?.message || 'Validation failed';
      setActionError(msg);
      alert(msg);
    }
  };

  const toggleExpand = (reportId) => {
    click.onClick();
    setActionError('');
    if (expandedReport === reportId) {
      setExpandedReport(null);
    } else {
      setExpandedReport(reportId);
      loadComments(reportId);
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
          <div className="view-reports-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Decentralized Ledger</span>
          </div>

          <h1 className="page-title">Intelligence Reports</h1>
          <p className="page-subtitle">Inspect, validate, and audit verified cybersecurity telemetry across the network</p>

          {/* Section filter navigation pills */}
          <div className="reports-segmented-tabs">
            <button
              className={`reports-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => { click.onClick(); setActiveTab('all'); }}
              onMouseEnter={hover.onMouseEnter}
            >
              <span>All Reports</span>
              <span className="reports-tab-count">{reports.length}</span>
            </button>
            <button
              className={`reports-tab-btn ${activeTab === 'my' ? 'active' : ''}`}
              onClick={() => { click.onClick(); setActiveTab('my'); }}
              onMouseEnter={hover.onMouseEnter}
            >
              <span>My Reports</span>
              <span className="reports-tab-count">{myReports.length}</span>
            </button>
            <button
              className={`reports-tab-btn ${activeTab === 'community' ? 'active' : ''}`}
              onClick={() => { click.onClick(); setActiveTab('community'); }}
              onMouseEnter={hover.onMouseEnter}
            >
              <span>Community Reports</span>
              <span className="reports-tab-count">{communityReports.length}</span>
            </button>
          </div>

          {loading ? (
            <div className="reports-loading-box">
              <div className="spline-loading-spinner" />
              <p>Fetching decentralized intelligence...</p>
            </div>
          ) : displayedReports.length === 0 ? (
            <div className="glass-card reports-empty-card">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <h3>
                {activeTab === 'my'
                  ? 'You Have Not Submitted Any Reports'
                  : activeTab === 'community'
                  ? 'No Reports from Other Users'
                  : 'No Intelligence Reports Yet'}
              </h3>
              <p>
                {activeTab === 'my'
                  ? 'Publish your first threat intelligence dispatch in Submit Report.'
                  : 'Be the first security researcher to publish a threat report.'}
              </p>
            </div>
          ) : (
            <div className="reports-list">
              {displayedReports.map((report, i) => {
                const isOwn = isUserReport(report);
                const isComplete = report.validationStatus === 'validated';
                const canValidate = !isOwn && !isComplete;

                return (
                  <motion.div
                    key={report.transactionId}
                    className={`glass-card report-card ${isOwn ? 'report-card-own' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="report-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span className="report-owner">{report.owner || report.userEmail}</span>
                          {isOwn && (
                            <span className="badge badge-own-report">My Report</span>
                          )}
                        </div>
                        <span className="report-date">
                          {new Date(report.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <span className={`badge badge-${report.validationStatus}`}>
                        {report.validationStatus === 'pending'
                          ? `Pending (${report.validatorsCount || 0}/${report.totalValidators || 5})`
                          : report.validationStatus}
                      </span>
                    </div>

                    <p className="report-content">{report.content}</p>

                    <div className="report-meta">
                      <span className="report-meta-pill" title="Token Mint">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                          <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                        <span>{report.tokenAddress}</span>
                      </span>
                      <span className="report-meta-pill" title="Validator Reward">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                          <path d="M12 6v2m0 8v2" />
                        </svg>
                        <span>{report.reward} DTNC</span>
                      </span>
                      <span className="report-meta-pill" title="Network Validations">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <polyline points="9 12 11 14 15 10" />
                        </svg>
                        <span>{report.validatorsCount || 0}/{report.totalValidators} validators</span>
                      </span>
                    </div>

                    <div className="report-actions">
                      <button
                        className={`report-action-btn${report.likedByCurrentUser ? ' liked' : ''}`}
                        onClick={() => handleLike(report.transactionId)}
                        onMouseEnter={hover.onMouseEnter}
                        aria-label="Like report"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill={report.likedByCurrentUser ? "#ff3b30" : "none"}
                          stroke={report.likedByCurrentUser ? "#ff3b30" : "currentColor"}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span>{report.likesCount || 0}</span>
                      </button>

                      <button
                        className="report-action-btn"
                        onClick={() => toggleExpand(report.transactionId)}
                        onMouseEnter={hover.onMouseEnter}
                        aria-label="View comments"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{report.commentsCount || 0}</span>
                      </button>

                      {canValidate ? (
                        <button
                          className="report-action-btn validate-btn"
                          onClick={() => toggleExpand(report.transactionId)}
                          onMouseEnter={hover.onMouseEnter}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Validate</span>
                        </button>
                      ) : isOwn ? (
                        <span className="report-author-badge" title="You cannot validate your own submission">
                          Author
                        </span>
                      ) : null}
                    </div>

                    <AnimatePresence>
                      {expandedReport === report.transactionId && (
                        <motion.div
                          className="report-expanded"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          {/* Validation section — hidden for report submitter */}
                          {canValidate && (
                            <div className="report-validate-section">
                              <h4>Validate this report</h4>
                              <p className="validate-helper-text">
                                Validate this threat intelligence with your Solana wallet address to earn DTNC validator rewards.
                              </p>
                              <div style={{ display: 'flex', gap: '0.65rem' }}>
                                <input
                                  className="glass-input"
                                  type="text"
                                  placeholder="Your Solana wallet address (e.g. 7BuU...)"
                                  value={validationWallet}
                                  onChange={(e) => setValidationWallet(e.target.value)}
                                />
                                <button
                                  className="btn-primary report-submit-sub-btn"
                                  onClick={() => handleValidate(report.transactionId)}
                                  onMouseEnter={hover.onMouseEnter}
                                >
                                  Submit
                                </button>
                              </div>
                              {actionError && <div className="form-error" style={{ marginTop: '0.6rem' }}>{actionError}</div>}
                            </div>
                          )}

                          {/* Comments section */}
                          <div className="report-comments-section">
                            <h4>Comments</h4>
                            {(comments[report.transactionId] || []).length === 0 ? (
                              <p className="report-no-comments">No remarks on this report yet.</p>
                            ) : (
                              <div className="report-comments-list">
                                {(comments[report.transactionId] || []).map((c, idx) => (
                                  <div key={idx} className="report-comment-item">
                                    <div className="report-comment-meta">
                                      <span className="report-comment-user">{c.userEmail}</span>
                                      <span className="report-comment-date">{new Date(c.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="report-comment-text">{c.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="report-add-comment">
                              <input
                                className="glass-input"
                                type="text"
                                placeholder="Add a comment or security remark..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleComment(report.transactionId); }}
                              />
                              <button
                                className="btn-primary report-submit-sub-btn"
                                onClick={() => handleComment(report.transactionId)}
                                onMouseEnter={hover.onMouseEnter}
                              >
                                Post
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ViewReports;
