import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from './context/AppContext';
import SecretaryDashboard from './components/SecretaryDashboard';
import RabbiDashboard from './components/RabbiDashboard';
import NotificationSimulator from './components/NotificationSimulator';
import Login from './components/Login';

function AppContent() {
  const { user, logout } = useContext(AppContext);
  const [activeView, setActiveView] = useState('secretary'); // 'secretary' | 'rabbi'
  const [showSimulator, setShowSimulator] = useState(true); // Default to true so they can record their demo video

  // Set active view based on user role when logged in
  useEffect(() => {
    if (user) {
      setActiveView(user.role === 'secretary' ? 'secretary' : 'rabbi');
    }
  }, [user]);

  // If not logged in, render the login page
  if (!user) {
    return <Login onLoginSuccess={() => {}} />;
  }

  // Active view to render (Secretary can toggle, Rabbis are restricted to RabbiDashboard)
  const viewToRender = user.role === 'secretary' ? activeView : 'rabbi';

  return (
    <div className="app-container" style={showSimulator ? { display: 'grid', gridTemplateColumns: '1fr 340px' } : {}}>
      {/* Main Workspace (Left/Center Panel) */}
      <div className="main-panel">
        
        {/* App Header */}
        <header className="app-header">
          <div className="logo-section">
            <h1>✨ ניהול ארועים</h1>
            <p>מערכת חכמה לשיבוץ רבנים וניהול אירועים</p>
          </div>

          <div className="header-controls">
            {/* Toggle Simulator */}
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowSimulator(!showSimulator)}
              style={{ 
                padding: '6px 12px', 
                fontSize: '12px',
                background: showSimulator ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: showSimulator ? '#f87171' : '#34d399',
                borderColor: showSimulator ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                marginLeft: '10px'
              }}
            >
              🛠️ {showSimulator ? 'הסתר סימולטור' : 'הצג סימולטור'}
            </button>

            {user.role === 'secretary' && (
              <div className="role-tabs" style={{ marginLeft: '10px' }}>
                <button 
                  className={`tab-btn ${activeView === 'secretary' ? 'active' : ''}`}
                  onClick={() => setActiveView('secretary')}
                >
                  💼 פאנל מזכירות
                </button>
                <button 
                  className={`tab-btn ${activeView === 'rabbi' ? 'active' : ''}`}
                  onClick={() => setActiveView('rabbi')}
                >
                  👳 סימולציית רבנים
                </button>
              </div>
            )}

            {/* User Account Info & Logout */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              padding: '6px 12px',
              background: 'rgba(0, 0, 0, 0.15)',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)'
            }}>
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '16px' }}>👤</span>
              )}
              <div style={{ fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>שלום, </span>
                <span style={{ fontWeight: 'bold' }}>{user.name}</span>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={logout}
                style={{ padding: '3px 8px', fontSize: '11px', marginRight: '6px' }}
              >
                יציאה
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Workspace Content */}
        {viewToRender === 'secretary' ? (
          <SecretaryDashboard />
        ) : (
          <RabbiDashboard />
        )}
      </div>
      
      {showSimulator && <NotificationSimulator />}
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
