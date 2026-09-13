import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ReportLogViewer.css';

/* 
 * ENHANCED REPORT LOG VIEWER WITH:
 * - Like feature
 * - Comments feature
 * - Edit content (owner only)
 * - Validate reports
 * - Reevaluate/Challenge reports
 * - Version history/Archive
 */

const ReportLogViewer = () => {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [viewMode, setViewMode] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedReport, setExpandedReport] = useState(null);
  
  // New states for features
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showReevaluateModal, setShowReevaluateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [validatorWallet, setValidatorWallet] = useState('');
  const [reevaluateContent, setReevaluateContent] = useState('');
  const [reevaluateWallet, setReevaluateWallet] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [editContent, setEditContent] = useState('');
  const [comments, setComments] = useState({});
  const [validations, setValidations] = useState({});
  const [reevaluations, setReevaluations] = useState({});
  const [versions, setVersions] = useState({});
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentUser();
    fetchReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, viewMode, currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('datinToken');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:3001/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('datinToken');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:3001/reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    if (viewMode === 'my' && currentUser) {
      setFilteredReports(reports.filter(r => r.userId === currentUser.id));
    } else {
      setFilteredReports(reports);
    }
  };

  const handleToggleLike = async (reportId) => {
    try {
      const token = localStorage.getItem('datinToken');
      const response = await fetch(`http://localhost:3001/toggle-like/${reportId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchReports();
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const openCommentModal = async (report) => {
    setSelectedReport(report);
    setShowCommentModal(true);
    await fetchComments(report.transactionId);
  };

  const fetchComments = async (reportId) => {
    try {
      const token = localStorage.getItem('datinToken');
      const response = await fetch(`http://localhost:3001/comments/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => ({
          ...prev,
          [reportId]: data.comments
        }));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      const token = localStorage.getItem('datinToken');
      const response = await fetch(`http://localhost:3001/add-comment/${selectedReport.transactionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: commentText })
      });

      if (response.ok) {
        setCommentText('');
        await fetchComments(selectedReport.transactionId);
        await fetchReports();
        alert('Comment added successfully!');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    }
  };

  const openValidateModal = async (report) => {
    setSelectedReport(report);
    setShowValidateModal(true);
    await fetchValidations(report.transactionId);
  };

  const fetchValidations = async (reportId) => {
    try {
      const token = localStorage.getItem('datinToken');
      const response = await fetch(`http://localhost:3001/validations/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setValidations(prev => ({
          ...prev,
          [reportId]: data.validations
        }));
      }
    } catch (error) {
      console.error('Error fetching validations:', error);
    }
  };

  const handleValidate = async () => {
    if (!validatorWallet.trim()) {
      alert('Please enter your wallet address');
      return;
    }

    try {
      const token = localStorage.getItem('datinToken');
      const response = await fetch(`http://localhost:3001/validate/${selectedReport.transactionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ walletAddress: validatorWallet })
      });

      if (response.ok) {
        setValidatorWallet('');
        setShowValidateModal(false);
        await fetchReports();
        alert('Validation submitted! You will receive rewards when validation is complete.');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to validate');
      }
    } catch (error) {
      console.error('Error validating:', error);
      alert('Failed to validate report');
    }
  };

  const openReevaluateModal = async (report) => {
    setSelectedReport(report);
    setReevaluateContent(report.content);
    setShowReevaluateModal(true);
    await fetchReevaluations(report.transactionId);
  };

  const fetchReevaluations = async (reportId) => {
    try {
      const token = localStorage.getItem('datinToken');
      const response = await fetch(`http://localhost:3001/reevaluations/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReevaluations(prev => ({
          ...prev,
          [reportId]: data.reevaluations
        }));
      }
    } catch (error) {
      console.error('Error fetching reevaluations:', error);
    }
  };

  const handleReevaluate = async () => {
    if (!reevaluateWallet.trim() || !reevaluateContent.trim() || !stakeAmount) {
      alert('Please fill all fields');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ WARNING: You are challenging this validated report.\n\n` +
      `Stake Amount: ${stakeAmount} DTNC\n\n` +
      `If your challenge is CORRECT:\n` +
      `- You will receive rewards\n` +
      `- Previous validators will be penalized\n\n` +
      `If your challenge is WRONG:\n` +
      `- Your ${stakeAmount} DTNC stake will be distributed\n` +
      `- To the report submitter and previous validators\n\n` +
      `Do you want to proceed?`
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem('datinToken');
      const response = await fetch(`http://localhost:3001/reevaluate/${selectedReport.transactionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress: reevaluateWallet,
          newContent: reevaluateContent,
          stakeAmount: parseInt(stakeAmount)
        })
      });

      if (response.ok) {
        setReevaluateWallet('');
        setReevaluateContent('');
        setStakeAmount('');
        setShowReevaluateModal(false);
        await fetchReports();
        alert('Reevaluation submitted! Result pending...');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to reevaluate');
      }
    } catch (error) {
      console.error('Error reevaluating:', error);
      alert('Failed to reevaluate report');
    }
  };

  const openEditModal = (report) => {
    setSelectedReport(report);
    setEditContent(report.content);
    setShowEditModal(true);
  };

  const handleEditContent = async () => {
    if (!editContent.trim()) {
      alert('Content cannot be empty');
      return;
    }

    try {
      const token = localStorage.getItem('datinToken');
      const response = await fetch(`http://localhost:3001/edit-content/${selectedReport.transactionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: editContent })
      });

      if (response.ok) {
        setEditContent('');
        setShowEditModal(false);
        await fetchReports();
        alert('Content updated successfully!');
      }
    } catch (error) {
      console.error('Error editing content:', error);
      alert('Failed to edit content');
    }
  };

  const openArchiveModal = async (report) => {
    setSelectedReport(report);
    setShowArchiveModal(true);
    await fetchVersions(report.transactionId);
  };

  const fetchVersions = async (reportId) => {
    try {
      const token = localStorage.getItem('datinToken');
      const response = await fetch(`http://localhost:3001/versions/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVersions(prev => ({
          ...prev,
          [reportId]: data.versions
        }));
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'status-confirmed';
      case 'validated':
        return 'status-validated';
      case 'reevaluated':
        return 'status-reevaluated';
      case 'pending':
        return 'status-pending';
      case 'failed':
        return 'status-failed';
      default:
        return 'status-unknown';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleReportExpansion = (transactionId) => {
    setExpandedReport(expandedReport === transactionId ? null : transactionId);
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleNavigation = (page) => {
    if (page === 'ChatInterface') {
      navigate('/chat');
    } else if (page === 'Dashboard') {
      navigate('/');
    } else if (page === 'SubmitReport') {
      navigate('/submit-report');
    }
    setShowDropdown(false);
  };

  const closeModal = () => {
    setShowCommentModal(false);
    setShowValidateModal(false);
    setShowReevaluateModal(false);
    setShowEditModal(false);
    setShowArchiveModal(false);
    setCommentText('');
    setValidatorWallet('');
    setReevaluateContent('');
    setReevaluateWallet('');
    setStakeAmount('');
    setEditContent('');
    setSelectedReport(null);
  };

  return (
    <div className="report-viewer-container">
      <div className="header">
        <div className="datin-logo" onClick={() => navigate('/')}>DATIN</div>
        <div className="header-title">Threat Intelligence Reports</div>
        
        <div className="profile-container">
          <div className="user-icon" onClick={toggleDropdown}>
            <div className="profile-icon"></div>
          </div>
          {showDropdown && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={() => handleNavigation('ChatInterface')}>
                Chat Interface
              </div>
              <div className="dropdown-item" onClick={() => handleNavigation('SubmitReport')}>
                Submit Report
              </div>
              <div className="dropdown-item" onClick={() => handleNavigation('Dashboard')}>
                Home
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="content-container">
        <div className="sidebar">
          <div className="sidebar-section">
            <h3 className="section-title">Chat History</h3>
            <div className="chat-history-item">
              <div className="chat-indicator"></div>
              <span>XYZ</span>
            </div>
            <div className="chat-history-item">
              <div className="chat-indicator"></div>
              <span>ABC</span>
            </div>
          </div>
          
          <div className="sidebar-section">
            <h3 className="section-title">Threat Report History</h3>
            <div className="threat-history-item">
              <div className="file-icon"></div>
              <span>Network Intrusion...</span>
            </div>
            <div className="threat-history-item">
              <div className="file-icon"></div>
              <span>Ransomware...</span>
            </div>
          </div>
        </div>

        <div className="main-content">
          <div className="viewer-header">
            <h2 className="viewer-title">Report Logs</h2>
            
            <div className="view-mode-toggle">
              <button 
                className={`mode-button ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => setViewMode('all')}
              >
                All Reports ({reports.length})
              </button>
              <button 
                className={`mode-button ${viewMode === 'my' ? 'active' : ''}`}
                onClick={() => setViewMode('my')}
              >
                My Reports ({reports.filter(r => currentUser && r.userId === currentUser.id).length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="no-reports">
              <div className="no-reports-icon">📄</div>
              <h3>No Reports Found</h3>
              <p>{viewMode === 'my' ? 'You haven\'t submitted any reports yet.' : 'No reports have been submitted.'}</p>
              <button className="submit-button" onClick={() => navigate('/submit-report')}>
                Submit Your First Report
              </button>
            </div>
          ) : (
            <div className="reports-grid">
              {filteredReports.map((report) => (
                <div key={report.transactionId} className="report-card">
                  <div className="report-header">
                    <div className="report-user">
                      <div className="user-avatar">
                        {report.userEmail ? report.userEmail.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="user-info">
                        <div className="user-email">{report.userEmail || 'Anonymous'}</div>
                        <div className="report-date">{formatDate(report.createdAt)}</div>
                      </div>
                    </div>
                    <div className="report-status">
                      <span className={`status-badge ${getStatusColor(report.validationStatus || report.blockchainStatus)}`}>
                        {report.validationStatus === 'validated' ? 'Validated' : 
                         report.validationStatus === 'reevaluated' ? `Re-evaluated (${report.reevaluationCount}x)` :
                         report.blockchainStatus || 'pending'}
                      </span>
                    </div>
                  </div>

                  <div className="report-body">
                    <div className="report-field">
                      <label>Transaction ID:</label>
                      <div className="field-value transaction-id">{report.transactionId}</div>
                    </div>

                    <div className="report-field">
                      <label>Content:</label>
                      <div className={`field-value content-text ${expandedReport === report.transactionId ? 'expanded' : ''}`}>
                        {report.content}
                        {report.isEdited && <span className="edited-badge"> (Edited)</span>}
                      </div>
                      {report.content.length > 100 && (
                        <button 
                          className="expand-button"
                          onClick={() => toggleReportExpansion(report.transactionId)}
                        >
                          {expandedReport === report.transactionId ? 'Show Less' : 'Show More'}
                        </button>
                      )}
                    </div>

                    {/* Social Actions */}
                    <div className="social-actions">
                      <button 
                        className={`action-btn ${report.likedByCurrentUser ? 'liked' : ''}`}
                        onClick={() => handleToggleLike(report.transactionId)}
                      >
                        👍 {report.likesCount || 0}
                      </button>
                      <button 
                        className="action-btn"
                        onClick={() => openCommentModal(report)}
                      >
                        💬 {report.commentsCount || 0}
                      </button>
                      {currentUser && report.userId === currentUser.id && (
                        <button 
                          className="action-btn edit-btn"
                          onClick={() => openEditModal(report)}
                        >
                          ✏️ Edit
                        </button>
                      )}
                      <button 
                        className="action-btn"
                        onClick={() => openArchiveModal(report)}
                      >
                        📚 Archive
                      </button>
                    </div>

                    {/* Validation Actions */}
                    <div className="validation-actions">
                      {report.validationStatus === 'pending' && (
                        <button 
                          className="validate-btn"
                          onClick={() => openValidateModal(report)}
                        >
                          ✅ Validate ({report.validatorsCount || 0}/{report.totalValidators})
                        </button>
                      )}
                      {report.validationStatus === 'validated' && (
                        <button 
                          className="reevaluate-btn"
                          onClick={() => openReevaluateModal(report)}
                        >
                          🔄 Challenge/Reevaluate
                        </button>
                      )}
                    </div>

                    {report.blockchainSignature && (
                      <div className="blockchain-info">
                        <div className="blockchain-label">🔗 Blockchain Details:</div>
                        <div className="blockchain-field">
                          <label>Signature:</label>
                          <div className="blockchain-value">{report.blockchainSignature}</div>
                        </div>
                        <a 
                          href={`https://explorer.solana.com/tx/${report.blockchainSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="explorer-link"
                        >
                          View on Solana Explorer →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💬 Comments</h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="comments-list">
                {comments[selectedReport?.transactionId]?.map((comment) => (
                  <div key={comment.commentId} className="comment-item">
                    <div className="comment-header">
                      <strong>{comment.userEmail}</strong>
                      <span className="comment-date">{formatDate(comment.createdAt)}</span>
                    </div>
                    <div className="comment-content">{comment.content}</div>
                  </div>
                ))}
              </div>
              <div className="add-comment">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  rows="3"
                />
                <button className="submit-comment-btn" onClick={handleAddComment}>
                  Post Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validate Modal */}
      {showValidateModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✅ Validate Report</h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <p>By validating this report, you confirm its accuracy.</p>
              <p><strong>Reward: {selectedReport?.reward} {selectedReport?.tokenAddress}</strong></p>
              <p>Current Validators: {selectedReport?.validatorsCount || 0} / {selectedReport?.totalValidators}</p>
              
              <div className="validators-list">
                <h4>Previous Validators:</h4>
                {validations[selectedReport?.transactionId]?.map((val) => (
                  <div key={val.validationId} className="validator-item">
                    <span>{val.userEmail}</span>
                    <span className="validator-date">{formatDate(val.createdAt)}</span>
                  </div>
                ))}
              </div>
              
              <input
                type="text"
                value={validatorWallet}
                onChange={(e) => setValidatorWallet(e.target.value)}
                placeholder="Enter your wallet address for rewards"
                className="modal-input"
              />
              <button className="modal-submit-btn" onClick={handleValidate}>
                Submit Validation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reevaluate Modal */}
      {showReevaluateModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔄 Challenge/Reevaluate Report</h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="warning-box">
                <h4>⚠️ WARNING: Staking Required</h4>
                <p>• If your challenge is <strong>CORRECT</strong>: You receive rewards, previous validators are penalized</p>
                <p>• If your challenge is <strong>WRONG</strong>: Your stake is distributed to submitter and validators</p>
              </div>
              
              <div className="reevaluations-history">
                <h4>Previous Reevaluations: {selectedReport?.reevaluationCount || 0}</h4>
                {reevaluations[selectedReport?.transactionId]?.map((reeval) => (
                  <div key={reeval.reevaluationId} className="reeval-item">
                    <div><strong>{reeval.userEmail}</strong> - {formatDate(reeval.createdAt)}</div>
                    <div>Stake: {reeval.stakeAmount} DTNC - Status: {reeval.challengeResult}</div>
                  </div>
                ))}
              </div>
              
              <label>Your Wallet Address:</label>
              <input
                type="text"
                value={reevaluateWallet}
                onChange={(e) => setReevaluateWallet(e.target.value)}
                placeholder="Enter wallet address for rewards"
                className="modal-input"
              />
              
              <label>Stake Amount (DTNC):</label>
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="Amount to stake"
                className="modal-input"
              />
              
              <label>Corrected Content:</label>
              <textarea
                value={reevaluateContent}
                onChange={(e) => setReevaluateContent(e.target.value)}
                placeholder="Enter the corrected content"
                rows="6"
                className="modal-textarea"
              />
              
              <button className="modal-submit-btn danger" onClick={handleReevaluate}>
                Submit Challenge (Stake {stakeAmount} DTNC)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Edit Content</h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows="8"
                className="modal-textarea"
              />
              <button className="modal-submit-btn" onClick={handleEditContent}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📚 Content Version History</h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <p>Current Version: {selectedReport?.currentVersion}</p>
              <div className="versions-list">
                {versions[selectedReport?.transactionId]?.map((version) => (
                  <div key={version.versionId} className="version-item">
                    <div className="version-header">
                      <span className="version-number">Version {version.versionNumber}</span>
                      <span className="version-type">{version.changeType}</span>
                      <span className="version-date">{formatDate(version.createdAt)}</span>
                    </div>
                    <div className="version-author">By: {version.changedBy}</div>
                    <div className="version-content">{version.content}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportLogViewer;