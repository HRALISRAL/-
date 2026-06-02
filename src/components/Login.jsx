import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function Login({ onLoginSuccess }) {
  const { login, loginWithToken, rabbis } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Google Sign-In Simulation States
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('שם משתמש או סיסמה שגויים');
      } else {
        onLoginSuccess();
      }
    } catch (err) {
      setError('שגיאת חיבור לשרת, אנא וודא שהשרת רץ');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (googleEmail) => {
    setGoogleError('');
    setGoogleLoading(true);

    try {
      const API_URL = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';
      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: googleEmail })
      });
      const data = await res.json();
      
      if (res.ok && data.token) {
        // Use helper in AppContext to log in using the retrieved JWT
        const success = await loginWithToken(data.token);
        if (success) {
          setIsGoogleModalOpen(false);
          onLoginSuccess();
        } else {
          setGoogleError('שגיאה במהלך ביצוע אימות מקומי של אסימון גוגל');
        }
      } else {
        setGoogleError(data.error || 'אימות גוגל נכשל');
      }
    } catch (err) {
      setGoogleError('שגיאת חיבור לשרת בזמן אימות מול גוגל');
    } finally {
      setGoogleLoading(false);
    }
  };

  const fillCredentials = (userEmail, userPass) => {
    setEmail(userEmail);
    setPassword(userPass);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '20px'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '26px', color: 'var(--text-primary)', marginBottom: '8px', borderBottom: 'none', paddingBottom: '0' }}>כניסה למערכת</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>הזן את פרטי הגישה שלך כדי להמשיך</p>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-glow)',
            color: 'var(--danger)',
            border: '1px solid var(--danger)',
            padding: '10px',
            borderRadius: 'var(--border-radius-sm)',
            fontSize: '13px',
            marginBottom: '16px',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label>כתובת אימייל *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@eventflow.co.il"
              required
              style={{ textAlign: 'left', direction: 'ltr' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '0' }}>
            <label>סיסמה *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
              style={{ textAlign: 'left', direction: 'ltr' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '10px' }} disabled={loading}>
            {loading ? 'מתחבר...' : 'התחבר למערכת'}
          </button>
        </form>
      </div>
    </div>
  );
}
