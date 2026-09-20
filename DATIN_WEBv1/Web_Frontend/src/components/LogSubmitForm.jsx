import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import './LogSubmitForm.css';

const LogSubmitForm = () => {
  const [formData, setFormData] = useState({
    owner: '',
    content: '',
    tokenAddress: '',
    reward: '',
    totalValidators: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [contentLength, setContentLength] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEnterpriseMode, setIsEnterpriseMode] = useState(false);
  const [showModePopup, setShowModePopup] = useState(false);
  const navigate = useNavigate();

  // Default DTNC token for single user mode
  const DTNC_TOKEN = "DTNC";

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'reward' && value !== '') {
      // Allow numbers only, no limit on size
      if (!/^\d+$/.test(value)) return;
      // Optional: Prevent going over u64 max (18 quintillion)
      const numValue = BigInt(value);
      const MAX_U64 = BigInt("18446744073709551615");
      if (numValue > MAX_U64) {
        alert("Reward exceeds maximum value (18 quintillion)");
        return;
      }
    }

    if (name === 'totalValidators' && value !== '') {
      if (!/^\d+$/.test(value)) return;
    }
    
    if (name === 'content') {
      // MASSIVE increase: Allow up to 100,000 characters (~20,000 words)
      const trimmedValue = value.substring(0, 100000);
      setContentLength(trimmedValue.length);
      setFormData({
        ...formData,
        [name]: trimmedValue
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleModeToggle = () => {
    const newMode = !isEnterpriseMode;
    setIsEnterpriseMode(newMode);
    
    // Show popup
    setShowModePopup(true);
    setTimeout(() => {
      setShowModePopup(false);
    }, 2000);

    // If switching to single user mode, set DTNC token
    if (!newMode) {
      setFormData({
        ...formData,
        tokenAddress: DTNC_TOKEN
      });
    } else {
      // Clear token address for enterprise mode
      setFormData({
        ...formData,
        tokenAddress: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Set token address based on mode before submission
    const finalTokenAddress = isEnterpriseMode ? formData.tokenAddress : DTNC_TOKEN;
    
    if (!formData.owner || !formData.content || !finalTokenAddress || !formData.reward || !formData.totalValidators) {
      alert("All fields are required");
      return;
    }

    // Validate totalValidators is at least 3
    const validatorCount = parseInt(formData.totalValidators);
    if (validatorCount < 3) {
      alert("Minimum 3 validators are required");
      return;
    }
    
    try {
      const token = localStorage.getItem('datinToken');
      
      if (!token) {
        alert("You must be logged in to submit a report");
        navigate('/login');
        return;
      }
      
      const response = await fetch('http://localhost:3001/submit-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          tokenAddress: finalTokenAddress
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log("Log submitted successfully:", data);
        setIsSubmitted(true);
        
        setTimeout(() => {
          setIsSubmitted(false);
          setFormData({
            owner: '',
            content: '',
            tokenAddress: isEnterpriseMode ? '' : DTNC_TOKEN,
            reward: '',
            totalValidators: ''
          });
          setContentLength(0);
        }, 3000);
      } else {
        alert("Failed to submit log: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error submitting log:", error);
      alert("Error submitting log. Please try again.");
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };
  
  const handleNavigation = (page) => {
    if (page === 'ChatInterface') {
      navigate('/chat');
    } else if (page === 'Dashboard') {
      navigate('/');
    } else if (page === 'ViewReports') {
      navigate('/view-reports');
    }
    
    setShowDropdown(false);
  };

  return (
    <div className="log-submit-container">
      {/* Mode Switch Popup */}
      {showModePopup && (
        <div className="mode-popup">
          <p>Switched to {isEnterpriseMode ? 'Enterprise' : 'Single User'} Mode</p>
        </div>
      )}

      <div className="header">
        <div className="datin-logo" onClick={() => navigate('/')}>DATIN</div>
        <div className="header-title">AI Threat Intelligence Assistant</div>
        
        {/* Mode Toggle Switch */}
        <div className="mode-toggle-container">
          <span className="mode-label">{isEnterpriseMode ? 'Enterprise' : 'Single User'}</span>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={isEnterpriseMode} 
              onChange={handleModeToggle}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="profile-container">
          <div className="user-icon" onClick={toggleDropdown}>
            <div className="profile-icon"></div>
          </div>
          {showDropdown && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={() => handleNavigation('ChatInterface')}>
                Chat Interface
              </div>
              <div className="dropdown-item" onClick={() => handleNavigation('ViewReports')}>
                View Reports
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
            <div className="chat-history-item">
              <div className="chat-indicator"></div>
              <span>XYZ</span>
            </div>
          </div>
          
          <div className="sidebar-section">
            <h3 className="section-title">Threat Report History</h3>
            
            {/* NEW: View All Reports Button */}
            <div 
              className="threat-history-item view-reports-button" 
              onClick={() => navigate('/view-reports')}
            >
              <div className="file-icon" style={{ backgroundColor: 'var(--accent-color)' }}></div>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-color)' }}>📊 View All Reports</span>
            </div>
            
            <div className="threat-history-item">
              <div className="file-icon"></div>
              <span>Network Intrusion...</span>
            </div>
            <div className="threat-history-item">
              <div className="file-icon"></div>
              <span>Ransomware...</span>
            </div>
            <div className="threat-history-item">
              <div className="file-icon"></div>
              <span>DDoS Attack...</span>
            </div>
          </div>
        </div>

        <div className="main-content">
          <h2 className="form-title">AI Threat Intelligence Log Submission</h2>
          
          {isSubmitted ? (
            <div className="submission-success">
              <p>Your Log is Submitted</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="log-form">
              <div className="form-group">
                <label>Owner:</label>
                <input
                  type="text"
                  name="owner"
                  value={formData.owner}
                  onChange={handleChange}
                  placeholder="owner wallet address"
                  required
                />
              </div>

              <div className="form-group">
                <label>Content:</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="cyber security content"
                  required
                ></textarea>
                <div className="character-count">{contentLength}/600</div>
              </div>

              <div className="form-group">
                <label>Token Address:</label>
                <input
                  type="text"
                  name="tokenAddress"
                  value={isEnterpriseMode ? formData.tokenAddress : DTNC_TOKEN}
                  onChange={handleChange}
                  placeholder={isEnterpriseMode ? "requested token for reward" : "ONLY FOR ENTERPRISES"}
                  className={isEnterpriseMode ? "" : "disabled-input"}
                  disabled={!isEnterpriseMode}
                  required
                />
              </div>

              <div className="form-group">
                <label>Reward for Verification:</label>
                <input
                  type="text"
                  name="reward"
                  value={formData.reward}
                  onChange={handleChange}
                  placeholder="enter amount of coins for reward"
                  required
                />
              </div>

              <div className="form-group">
                <label>Total Validators:</label>
                <input
                  type="text"
                  name="totalValidators"
                  value={formData.totalValidators}
                  onChange={handleChange}
                  placeholder="minimum 3 validators required"
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-button">Submit Report</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogSubmitForm;