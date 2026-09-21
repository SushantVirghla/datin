import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AUTH_BASE_URL } from '../api/config';
import { getToken, getStoredUser } from '../api/auth';
import { useHoverSound, useClickSound } from '../hooks/useHoverSound';
import './ViewReports.css';

// Relative time formatting helper
function timeAgo(dateString) {
  if (!dateString) return 'recently';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Generate initials from name
function getInitials(name) {
  if (!name) return 'SN';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic pastel avatar gradient based on name
function getAvatarGradient(name) {
  if (!name) return 'linear-gradient(135deg, #007AFF, #5856D6)';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    'linear-gradient(135deg, #007AFF, #5856D6)',
    'linear-gradient(135deg, #34C759, #30D158)',
    'linear-gradient(135deg, #FF9500, #FF3B30)',
    'linear-gradient(135deg, #AF52DE, #5856D6)',
    'linear-gradient(135deg, #00C7BE, #007AFF)',
    'linear-gradient(135deg, #FF2D55, #FF9500)',
  ];
  const idx = Math.abs(hash) % gradients.length;
  return gradients[idx];
}

const ViewReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scopeTab, setScopeTab] = useState('all'); // 'all' | 'my' | 'community'
  const [sortTab, setSortTab] = useState('newest'); // 'newest' | 'active' | 'bounty' | 'validated' | 'needs-review'
  const [tagFilter, setTagFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedReport, setExpandedReport] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState({});
  const [validationWallet, setValidationWallet] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [copyNotice, setCopyNotice] = useState('');

  const hover = useHoverSound();
  const click = useClickSound();
  const currentUser = getStoredUser();

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  const fetchReports = async () => {
    try {
      const { data } = await axios.get(`${AUTH_BASE_URL}/reports`, authHeaders());
      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const isUserReport = (report) => {
    if (report.isOwn !== undefined) return report.isOwn;
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

  // Scope Filtering
  const scopedReports = useMemo(() => {
    if (scopeTab === 'my') {
      return reports.filter((r) => isUserReport(r));
    }
    if (scopeTab === 'community') {
      return reports.filter((r) => !isUserReport(r));
    }
    return reports;
  }, [reports, scopeTab, currentUser]);

  // Search & Tag Filtering + Sorting
  const filteredAndSortedReports = useMemo(() => {
    let result = [...scopedReports];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          (r.content && r.content.toLowerCase().includes(q)) ||
          (r.tokenAddress && r.tokenAddress.toLowerCase().includes(q)) ||
          (r.authorName && r.authorName.toLowerCase().includes(q)) ||
          (r.transactionId && r.transactionId.toLowerCase().includes(q))
      );
    }

    // Tag filter
    if (tagFilter !== 'all') {
      if (tagFilter === 'high-bounty') {
        result = result.filter((r) => Number(r.reward) >= 20);
      } else if (tagFilter === 'validated') {
        result = result.filter((r) => r.validationStatus === 'validated');
      } else if (tagFilter === 'pending') {
        result = result.filter((r) => r.validationStatus !== 'validated');
      }
    }

    // Sort order (StackOverflow tabs)
    switch (sortTab) {
      case 'active':
        result.sort((a, b) => {
          const activityA = (a.likesCount || 0) + (a.commentsCount || 0) * 2 + (a.validatorsCount || 0) * 3;
          const activityB = (b.likesCount || 0) + (b.commentsCount || 0) * 2 + (b.validatorsCount || 0) * 3;
          return activityB - activityA;
        });
        break;
      case 'bounty':
        result.sort((a, b) => Number(b.reward || 0) - Number(a.reward || 0));
        break;
      case 'validated':
        result = result.filter((r) => r.validationStatus === 'validated');
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'needs-review':
        result = result.filter((r) => r.validationStatus !== 'validated');
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    return result;
  }, [scopedReports, searchQuery, tagFilter, sortTab]);

  // Overall metrics
  const totalBounties = useMemo(() => {
    return reports.reduce((acc, curr) => acc + (Number(curr.reward) || 0), 0);
  }, [reports]);

  const validatedCount = useMemo(() => {
    return reports.filter((r) => r.validationStatus === 'validated').length;
  }, [reports]);

  const handleLike = async (e, reportId) => {
    e.stopPropagation();
    click.onClick();
    try {
      const { data } = await axios.post(`${AUTH_BASE_URL}/toggle-like/${reportId}`, {}, authHeaders());
      if (data.success) {
        setReports((prev) =>
          prev.map((r) =>
            r.transactionId === reportId
              ? {
                  ...r,
                  likedByCurrentUser: data.liked,
                  likesCount: data.likesCount,
                }
              : r
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleComment = async (reportId) => {
    if (!commentText.trim()) return;
    click.onClick();
    try {
      const { data } = await axios.post(
        `${AUTH_BASE_URL}/add-comment/${reportId}`,
        { content: commentText },
        authHeaders()
      );
      if (data.success) {
        setCommentText('');
        loadComments(reportId);
        fetchReports();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadComments = async (reportId) => {
    try {
      const { data } = await axios.get(`${AUTH_BASE_URL}/comments/${reportId}`, authHeaders());
      if (data.success) {
        setComments((prev) => ({ ...prev, [reportId]: data.comments }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleValidate = async (reportId) => {
    if (!validationWallet.trim()) return;
    click.onClick();
    setActionError('');
    setActionSuccess('');

    try {
      const { data } = await axios.post(
        `${AUTH_BASE_URL}/validate/${reportId}`,
        { walletAddress: validationWallet },
        authHeaders()
      );
      if (data.success) {
        setActionSuccess('Validation signature successfully submitted to network consensus!');
        setValidationWallet('');
        fetchReports();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Validation failed';
      setActionError(msg);
    }
  };

  const toggleExpand = (reportId) => {
    click.onClick();
    setActionError('');
    setActionSuccess('');
    if (expandedReport === reportId) {
      setExpandedReport(null);
    } else {
      setExpandedReport(reportId);
      loadComments(reportId);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopyNotice(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopyNotice(''), 2500);
  };

  return (
    <div className="page-container so-reports-container">
      <div className="page-content">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Header Banner */}
          <div className="so-header-row">
            <div>
              <div className="view-reports-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>Decentralized Threat Ledger</span>
              </div>
              <h1 className="page-title so-page-title">Threat Intelligence Forum</h1>
              <p className="page-subtitle so-page-subtitle">
                Audited zero-day cyber threats, vulnerability findings, and Solana consensus validations
              </p>
            </div>

            <div className="so-header-actions">
              <Link to="/submit" className="btn-primary so-new-report-btn" onMouseEnter={hover.onMouseEnter}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Dispatch Report</span>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="so-stats-overview">
            <div className="so-stat-chip">
              <span className="so-stat-num">{reports.length}</span>
              <span className="so-stat-label">Total Dispatches</span>
            </div>
            <div className="so-stat-divider" />
            <div className="so-stat-chip">
              <span className="so-stat-num">{validatedCount}</span>
              <span className="so-stat-label">Consensus Validated</span>
            </div>
            <div className="so-stat-divider" />
            <div className="so-stat-chip">
              <span className="so-stat-num">{totalBounties} DTNC</span>
              <span className="so-stat-label">Active Validator Bounties</span>
            </div>
          </div>

          {/* Search Bar & Quick Filters */}
          <div className="so-filter-control-panel glass-card">
            <div className="so-search-wrapper">
              <svg className="so-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="so-search-input"
                placeholder="Search reports by title, vulnerability, token address, or researcher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="so-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Scope segmented tabs & StackOverflow sort tabs row */}
            <div className="so-toolbar-row">
              <div className="so-scope-tabs">
                <button
                  className={`so-scope-btn ${scopeTab === 'all' ? 'active' : ''}`}
                  onClick={() => { click.onClick(); setScopeTab('all'); }}
                >
                  All Dispatches ({reports.length})
                </button>
                <button
                  className={`so-scope-btn ${scopeTab === 'my' ? 'active' : ''}`}
                  onClick={() => { click.onClick(); setScopeTab('my'); }}
                >
                  My Reports ({reports.filter((r) => isUserReport(r)).length})
                </button>
                <button
                  className={`so-scope-btn ${scopeTab === 'community' ? 'active' : ''}`}
                  onClick={() => { click.onClick(); setScopeTab('community'); }}
                >
                  Community ({reports.filter((r) => !isUserReport(r)).length})
                </button>
              </div>

              {/* StackOverflow Style Tab Filters */}
              <div className="so-sort-pills">
                <button
                  className={`so-sort-pill ${sortTab === 'newest' ? 'active' : ''}`}
                  onClick={() => { click.onClick(); setSortTab('newest'); }}
                >
                  Newest
                </button>
                <button
                  className={`so-sort-pill ${sortTab === 'active' ? 'active' : ''}`}
                  onClick={() => { click.onClick(); setSortTab('active'); }}
                >
                  Active
                </button>
                <button
                  className={`so-sort-pill ${sortTab === 'bounty' ? 'active' : ''}`}
                  onClick={() => { click.onClick(); setSortTab('bounty'); }}
                >
                  Bounties
                </button>
                <button
                  className={`so-sort-pill ${sortTab === 'validated' ? 'active' : ''}`}
                  onClick={() => { click.onClick(); setSortTab('validated'); }}
                >
                  Validated
                </button>
                <button
                  className={`so-sort-pill ${sortTab === 'needs-review' ? 'active' : ''}`}
                  onClick={() => { click.onClick(); setSortTab('needs-review'); }}
                >
                  Needs Review
                </button>
              </div>
            </div>

            {/* Quick Tag Filter Chips */}
            <div className="so-tag-filter-row">
              <span className="so-tag-filter-title">Filter by tag:</span>
              <button
                className={`so-tag-chip ${tagFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTagFilter('all')}
              >
                All
              </button>
              <button
                className={`so-tag-chip ${tagFilter === 'high-bounty' ? 'active' : ''}`}
                onClick={() => setTagFilter('high-bounty')}
              >
                ⚡ High Bounty (&gt;20 DTNC)
              </button>
              <button
                className={`so-tag-chip ${tagFilter === 'validated' ? 'active' : ''}`}
                onClick={() => setTagFilter('validated')}
              >
                ✓ Consensus Reached
              </button>
              <button
                className={`so-tag-chip ${tagFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setTagFilter('pending')}
              >
                ⏳ Open for Auditing
              </button>
            </div>
          </div>

          {/* Copy Notification Toast */}
          <AnimatePresence>
            {copyNotice && (
              <motion.div
                className="so-toast-notice"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {copyNotice}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Feed Content */}
          {loading ? (
            <div className="reports-loading-box">
              <div className="spline-loading-spinner" />
              <p>Fetching decentralized intelligence feed...</p>
            </div>
          ) : filteredAndSortedReports.length === 0 ? (
            <div className="glass-card reports-empty-card">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <h3>No Threat Intelligence Dispatches Found</h3>
              <p>
                {searchQuery
                  ? `No reports matched "${searchQuery}". Try different keywords or reset filters.`
                  : scopeTab === 'my'
                  ? "You haven't submitted any threat reports yet. Dispatch one to earn DTNC rewards!"
                  : 'Be the first cybersecurity researcher to submit an audited report.'}
              </p>
              {searchQuery && (
                <button
                  className="btn-secondary"
                  style={{ marginTop: '0.75rem', padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                  onClick={() => { setSearchQuery(''); setTagFilter('all'); }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="so-questions-list">
              {filteredAndSortedReports.map((report, i) => {
                const isOwn = isUserReport(report);
                const isComplete = report.validationStatus === 'validated';
                const canValidate = !isOwn && !isComplete;
                const isExpanded = expandedReport === report.transactionId;
                const authorDisplay = report.authorName || (isOwn ? 'Researcher (You)' : 'Autonomous Security Node');
                const authorInitials = getInitials(authorDisplay);
                const authorGradient = getAvatarGradient(authorDisplay);

                // Excerpt snippet
                const lines = (report.content || '').split('\n').filter((l) => l.trim().length > 0);
                const titlePreview = lines[0] || 'Unclassified Threat Vector';
                const bodyPreview = lines.slice(1).join(' ') || lines[0] || '';

                return (
                  <motion.div
                    key={report.transactionId}
                    className={`glass-card so-question-row ${isOwn ? 'so-question-own' : ''} ${isExpanded ? 'expanded' : ''}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  >
                    {/* Top Row: StackOverflow 3-Column Layout */}
                    <div className="so-row-main" onClick={() => toggleExpand(report.transactionId)}>
                      {/* Left Column: Stats & Counters (StackOverflow signature) */}
                      <div className="so-stats-column" onClick={(e) => e.stopPropagation()}>
                        {/* Upvote / Likes */}
                        <button
                          className={`so-stat-box so-stat-votes ${report.likedByCurrentUser ? 'voted' : ''}`}
                          onClick={(e) => handleLike(e, report.transactionId)}
                          title={report.likedByCurrentUser ? 'Unlike dispatch' : 'Upvote / Like dispatch'}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill={report.likedByCurrentUser ? '#ff3b30' : 'none'} stroke={report.likedByCurrentUser ? '#ff3b30' : 'currentColor'} strokeWidth="2.2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          <span className="so-stat-count">{report.likesCount || 0}</span>
                          <span className="so-stat-unit">votes</span>
                        </button>

                        {/* Status / Validations Box */}
                        <div className={`so-stat-box so-stat-answers ${isComplete ? 'answered-accepted' : 'unanswered'}`}>
                          {isComplete && (
                            <svg className="so-check-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                          <span className="so-stat-count">
                            {report.validatorsCount || 0}/{report.totalValidators || 5}
                          </span>
                          <span className="so-stat-unit">{isComplete ? 'validated' : 'validations'}</span>
                        </div>

                        {/* Comments count */}
                        <div className="so-stat-box so-stat-views">
                          <span className="so-stat-count">{report.commentsCount || 0}</span>
                          <span className="so-stat-unit">remarks</span>
                        </div>
                      </div>

                      {/* Middle Column: Summary, Title, Snippet & Tags */}
                      <div className="so-summary-column">
                        <div className="so-title-wrapper">
                          <h3 className="so-question-title">
                            {titlePreview}
                          </h3>
                          {report.reward && Number(report.reward) > 0 && (
                            <span className="so-bounty-badge" title="Reward allocated for network validation">
                              +{report.reward} DTNC
                            </span>
                          )}
                        </div>

                        <p className="so-question-excerpt">
                          {bodyPreview.slice(0, 180)}
                          {bodyPreview.length > 180 ? '...' : ''}
                        </p>

                        {/* Tags & Metadata Row */}
                        <div className="so-meta-row">
                          <div className="so-tags-list">
                            {/* Token Address Pill */}
                            <button
                              type="button"
                              className="so-tag-badge so-token-tag"
                              title="Click to copy Solana Token Mint"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(report.tokenAddress, 'Token Mint');
                              }}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                              </svg>
                              <span>{report.tokenAddress.slice(0, 6)}...{report.tokenAddress.slice(-4)}</span>
                            </button>

                            {/* Status Tag */}
                            <span className={`so-tag-badge so-status-tag ${report.validationStatus}`}>
                              {report.validationStatus === 'validated' ? 'Consensus Achieved' : 'Consensus Open'}
                            </span>

                            {/* Blockchain Tx tag */}
                            <span className="so-tag-badge so-txn-tag" title="Decentralized Transaction ID">
                              {report.transactionId.slice(0, 12)}...
                            </span>
                          </div>

                          {/* Right Usercard (StackOverflow signature) */}
                          <div className="so-usercard">
                            <span className="so-usercard-time">
                              dispatched {timeAgo(report.createdAt)}
                            </span>
                            <div className="so-usercard-profile">
                              <div
                                className="so-avatar-circle"
                                style={{ background: authorGradient }}
                              >
                                {authorInitials}
                              </div>
                              <div className="so-usercard-details">
                                <span className="so-author-name">
                                  {authorDisplay}
                                </span>
                                <span className="so-reputation-badge">
                                  {isOwn ? 'Author (You)' : 'Verified Node'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Accordion Drawer */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          className="so-expanded-drawer"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28 }}
                        >
                          {/* Full Report Narrative */}
                          <div className="so-full-report-section">
                            <div className="so-section-header">
                              <h4>Threat Assessment & Technical Finding</h4>
                              <button
                                className="so-text-action-btn"
                                onClick={() => copyToClipboard(report.content, 'Report Content')}
                              >
                                Copy Text
                              </button>
                            </div>
                            <div className="so-full-content-body">
                              {report.content}
                            </div>
                          </div>

                          {/* On-chain Solana Verification Info */}
                          <div className="so-blockchain-info-card">
                            <div className="so-bc-row">
                              <div className="so-bc-item">
                                <span className="so-bc-label">Token Mint:</span>
                                <span className="so-bc-val mono">{report.tokenAddress}</span>
                              </div>
                              <div className="so-bc-item">
                                <span className="so-bc-label">Consensus State:</span>
                                <span className="so-bc-val">
                                  {report.validatorsCount || 0} of {report.totalValidators || 5} Signatures Required
                                </span>
                              </div>
                              <div className="so-bc-item">
                                <span className="so-bc-label">Allocated Bounty:</span>
                                <span className="so-bc-val highlight">{report.reward} DTNC</span>
                              </div>
                            </div>

                            {/* Consensus Progress Bar */}
                            <div className="so-consensus-bar-wrapper">
                              <div className="so-consensus-bar-track">
                                <div
                                  className="so-consensus-bar-fill"
                                  style={{
                                    width: `${Math.min(100, ((report.validatorsCount || 0) / (report.totalValidators || 5)) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Consensus Validation Submission Box */}
                          {canValidate && (
                            <div className="so-validate-box">
                              <div className="so-validate-header">
                                <div>
                                  <h5>Audit & Sign Decentralized Consensus</h5>
                                  <p>Verify this threat report with your Solana wallet to contribute to network trust and earn validator DTNC rewards.</p>
                                </div>
                              </div>

                              <div className="so-validate-input-row">
                                <input
                                  className="glass-input so-wallet-input"
                                  type="text"
                                  placeholder="Your Solana wallet address (e.g. 5YNm...)"
                                  value={validationWallet}
                                  onChange={(e) => setValidationWallet(e.target.value)}
                                />
                                <button
                                  className="btn-primary so-validate-submit-btn"
                                  onClick={() => handleValidate(report.transactionId)}
                                  onMouseEnter={hover.onMouseEnter}
                                >
                                  Submit Validation
                                </button>
                              </div>

                              {actionError && <div className="form-error" style={{ marginTop: '0.6rem' }}>{actionError}</div>}
                              {actionSuccess && <div className="form-success" style={{ marginTop: '0.6rem' }}>{actionSuccess}</div>}
                            </div>
                          )}

                          {isOwn && (
                            <div className="so-author-notice-box">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                              </svg>
                              <span>You are the author of this dispatch. Peer security researchers validate your report to reach consensus.</span>
                            </div>
                          )}

                          {/* StackOverflow Style Remarks / Discussion Thread */}
                          <div className="so-discussion-section">
                            <div className="so-discussion-header">
                              <h5>Peer Remarks & Auditing Notes ({(comments[report.transactionId] || []).length})</h5>
                            </div>

                            <div className="so-comments-feed">
                              {(comments[report.transactionId] || []).length === 0 ? (
                                <p className="so-no-comments">No remarks yet. Start the peer review by adding a comment below.</p>
                              ) : (
                                (comments[report.transactionId] || []).map((c, idx) => (
                                  <div key={c.commentId || idx} className="so-comment-item">
                                    <div className="so-comment-avatar" style={{ background: getAvatarGradient(c.authorName) }}>
                                      {getInitials(c.authorName)}
                                    </div>
                                    <div className="so-comment-body">
                                      <div className="so-comment-top">
                                        <span className="so-comment-author">{c.authorName || 'Autonomous Security Node'}</span>
                                        <span className="so-comment-time">{timeAgo(c.createdAt)}</span>
                                      </div>
                                      <p className="so-comment-content">{c.content}</p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Add Remark Input */}
                            <div className="so-add-comment-row">
                              <input
                                className="glass-input so-comment-input"
                                type="text"
                                placeholder="Add a comment, reproduction step, or security remark..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleComment(report.transactionId);
                                }}
                              />
                              <button
                                className="btn-primary so-comment-btn"
                                onClick={() => handleComment(report.transactionId)}
                                onMouseEnter={hover.onMouseEnter}
                              >
                                Post Remark
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
