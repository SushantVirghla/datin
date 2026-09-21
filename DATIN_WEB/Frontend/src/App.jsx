import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import SplineScene from './components/SplineScene';
import TopBar from './components/TopBar';
import ChatBar from './components/ChatBar';
import Sidebar from './components/Sidebar';
import ChatPage from './components/ChatPage';
import AuthModal from './components/AuthModal';
import SubmitReport from './components/SubmitReport';
import ViewReports from './components/ViewReports';
import DTNCStore from './components/DTNCStore';
import DevPage from './components/DevPage';
import { getStoredUser, logout, isAuthenticated, getToken } from './api/auth';
import { AUTH_BASE_URL } from './api/config';
import axios from 'axios';

const HomePage = () => {
  const navigate = useNavigate();

  const handleSend = useCallback((message) => {
    navigate('/chat', { state: { initialMessage: message } });
  }, [navigate]);

  return (
    <ChatBar onSend={handleSend} isLoading={false} />
  );
};

// Protected route wrapper
const ProtectedRoute = ({ children, user, onRequireAuth }) => {
  if (!user) {
    // Show auth modal
    React.useEffect(() => { onRequireAuth(); }, []);
    return (
      <div className="page-container">
        <div className="page-content" style={{ textAlign: 'center', paddingTop: '8rem' }}>
          <h2 style={{ color: '#999', marginBottom: '0.5rem' }}>Authentication Required</h2>
          <p style={{ color: '#bbb' }}>Please sign in to access this page.</p>
        </div>
      </div>
    );
  }
  return children;
};

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());
  const [chatHistory, setChatHistory] = useState([]);
  const navigate = useNavigate();

  // Load chat history from backend
  const loadChatHistory = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      const { data } = await axios.get(`${AUTH_BASE_URL}/chats`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (data.success) setChatHistory(data.chats || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }, []);

  useEffect(() => {
    if (user) loadChatHistory();
  }, [user, loadChatHistory]);

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleProfileClick = useCallback(() => {
    if (user) {
      // Logout
      if (confirm('Do you want to logout?')) {
        logout();
        setUser(null);
        setChatHistory([]);
        navigate('/');
      }
    } else {
      setAuthModalOpen(true);
    }
  }, [user, navigate]);

  const handleAuthSuccess = useCallback((userData) => {
    setUser(userData);
    loadChatHistory();
  }, [loadChatHistory]);

  const location = useLocation();
  // Only mount the 3D robot on the Landing Page — /chat uses a dedicated, ultra-fast ambient environment
  const isSplineBotRoute = location.pathname === '/';

  // Global 3D vs. Speed Mode toggle with persistent localStorage preference
  const [is3DMode, setIs3DMode] = useState(() => {
    const saved = localStorage.getItem('datin_3d_mode');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleGraphics = useCallback(() => {
    setIs3DMode((prev) => {
      const next = !prev;
      localStorage.setItem('datin_3d_mode', String(next));
      return next;
    });
  }, []);

  const handleRequireAuth = useCallback(() => {
    setAuthModalOpen(true);
  }, []);

  return (
    <div className={`app-root${sidebarOpen ? ' sidebar-is-open' : ''}`}>
      <div className="ambient-glow-mesh" aria-hidden="true">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />
      </div>

      {/* 3D Spline Robot or Ultra-Fast Cybernetic Core on Landing Page */}
      {isSplineBotRoute && <SplineScene is3DMode={is3DMode} />}

      <TopBar
        onMenuToggle={handleMenuToggle}
        user={user}
        onProfileClick={handleProfileClick}
        is3DMode={is3DMode}
        onToggleGraphics={handleToggleGraphics}
      />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chatHistory={chatHistory}
      />
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={
          <ChatPage user={user} onChatSaved={loadChatHistory} />
        } />
        <Route path="/submit-report" element={
          <ProtectedRoute user={user} onRequireAuth={handleRequireAuth}>
            <SubmitReport />
          </ProtectedRoute>
        } />
        <Route path="/view-reports" element={
          <ProtectedRoute user={user} onRequireAuth={handleRequireAuth}>
            <ViewReports />
          </ProtectedRoute>
        } />
        <Route path="/store" element={
          <ProtectedRoute user={user} onRequireAuth={handleRequireAuth}>
            <DTNCStore user={user} is3DMode={is3DMode} />
          </ProtectedRoute>
        } />
        <Route path="/dev" element={<DevPage />} />
      </Routes>
    </div>
  );
};

export default App;
