import React, { createContext, useState, useEffect } from 'react';

export const AppContext = createContext();

const API_URL = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ef_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [simulatedTime, setSimulatedTime] = useState(new Date());
  const [rabbis, setRabbis] = useState([]);
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeRabbiId, setActiveRabbiId] = useState('1');
  const [reportModalEvent, setReportModalEvent] = useState(null);
  const [viewModalEvent, setViewModalEvent] = useState(null);

  // Token helper
  const getHeaders = () => {
    if (user && user.token) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      };
    }
    return { 'Content-Type': 'application/json' };
  };

  // Sync active Rabbi view context when logged in as Rabbi
  useEffect(() => {
    if (user && user.role === 'rabbi') {
      setActiveRabbiId(user.id);
    }
  }, [user]);

  const fetchTime = async () => {
    try {
      const res = await fetch(`${API_URL}/time`);
      const data = await res.json();
      if (data.simulatedTime) {
        setSimulatedTime(new Date(data.simulatedTime));
      }
    } catch (e) {
      console.error('Error fetching time:', e);
    }
  };

  const fetchRabbis = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/rabbis`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRabbis(data);
      }
    } catch (e) {
      console.error('Error fetching rabbis:', e);
    }
  };

  const fetchEvents = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/events`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (e) {
      console.error('Error fetching events:', e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications`);
      if (res.ok) {
        const data = await res.json();
        // Convert ISO string timestamps back to Date objects
        setNotifications(data.map(n => ({ ...n, timestamp: new Date(n.timestamp) })));
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  // Fetch initial data if logged in
  useEffect(() => {
    fetchTime();
    fetchNotifications();
    if (user) {
      fetchRabbis();
      fetchEvents();
    }
  }, [user]);

  // Auth Functions
  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!res.ok) return false;

      const data = await res.json();
      if (data.token) {
        const loggedInUser = { token: data.token, ...data.user };
        setUser(loggedInUser);
        localStorage.setItem('ef_user', JSON.stringify(loggedInUser));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Login error:', e);
      throw e;
    }
  };

  const loginWithToken = async (token) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const userData = await res.json();
        const loggedInUser = { token, ...userData };
        setUser(loggedInUser);
        localStorage.setItem('ef_user', JSON.stringify(loggedInUser));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error logging in with token:', e);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setEvents([]);
    setRabbis([]);
    localStorage.removeItem('ef_user');
  };



  // API wrappers
  const addEvent = async (eventData) => {
    try {
      const res = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(eventData)
      });
      const data = await res.json();
      if (res.ok) {
        await fetchEvents();
        await fetchNotifications();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      console.error('Error adding event:', e);
      return { success: false, error: 'שגיאת חיבור לשרת' };
    }
  };

  const updateEvent = async (eventId, eventData) => {
    try {
      const res = await fetch(`${API_URL}/events/${eventId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(eventData)
      });
      const data = await res.json();
      if (res.ok) {
        await fetchEvents();
        await fetchNotifications();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      console.error('Error updating event:', e);
      return { success: false, error: 'שגיאת חיבור לשרת' };
    }
  };

  const cancelEvent = async (eventId) => {
    try {
      const res = await fetch(`${API_URL}/events/${eventId}/cancel`, {
        method: 'PUT',
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        await fetchEvents();
        await fetchNotifications();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      console.error('Error canceling event:', e);
      return { success: false, error: 'שגיאת חיבור לשרת' };
    }
  };

  const updateEventStatus = async (eventId, status) => {
    try {
      const res = await fetch(`${API_URL}/events/${eventId}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        await fetchEvents();
        await fetchNotifications();
      }
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  const submitReport = async (eventId, reportData) => {
    try {
      const res = await fetch(`${API_URL}/events/${eventId}/report`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(reportData)
      });
      if (res.ok) {
        await fetchEvents();
        await fetchNotifications();
      }
    } catch (e) {
      console.error('Error submitting report:', e);
    }
  };

  const advanceTime = async (amount, unit) => {
    try {
      const res = await fetch(`${API_URL}/time/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, unit })
      });
      if (res.ok) {
        const data = await res.json();
        setSimulatedTime(new Date(data.simulatedTime));
        // Refresh event statuses and notifications resulting from triggers
        await fetchEvents();
        await fetchNotifications();
      }
    } catch (e) {
      console.error('Error advancing time:', e);
    }
  };

  const resetSystem = async () => {
    try {
      const res = await fetch(`${API_URL}/time/reset`, { method: 'POST' });
      if (res.ok) {
        logout();
        window.location.reload();
      }
    } catch (e) {
      console.error('Error resetting system:', e);
    }
  };

  const addRabbi = async (rabbiData) => {
    try {
      const res = await fetch(`${API_URL}/rabbis`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(rabbiData)
      });
      const data = await res.json();
      if (res.ok) {
        await fetchRabbis();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      console.error('Error adding rabbi:', e);
      return { success: false, error: 'שגיאת חיבור לשרת' };
    }
  };

  const deleteRabbi = async (rabbiId) => {
    try {
      const res = await fetch(`${API_URL}/rabbis/${rabbiId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        await fetchRabbis();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      console.error('Error deleting rabbi:', e);
      return { success: false, error: 'שגיאת חיבור לשרת' };
    }
  };

  const fetchSmtpSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/settings/smtp`, { headers: getHeaders() });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (e) {
      console.error('Error fetching SMTP settings:', e);
      return null;
    }
  };

  const saveSmtpSettings = async (smtpData) => {
    try {
      const res = await fetch(`${API_URL}/settings/smtp`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(smtpData)
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      console.error('Error saving SMTP settings:', e);
      return { success: false, error: 'שגיאת חיבור לשרת' };
    }
  };

  const updateRabbi = async (rabbiId, rabbiData) => {
    try {
      const res = await fetch(`${API_URL}/rabbis/${rabbiId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(rabbiData)
      });
      const data = await res.json();
      if (res.ok) {
        await fetchRabbis();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      console.error('Error updating rabbi:', e);
      return { success: false, error: 'שגיאת חיבור לשרת' };
    }
  };

  return (
    <AppContext.Provider value={{
      user,
      simulatedTime,
      rabbis,
      events,
      notifications,
      activeRabbiId,
      setActiveRabbiId,
      reportModalEvent,
      setReportModalEvent,
      viewModalEvent,
      setViewModalEvent,
      login,
      loginWithToken,
      logout,
      addEvent,
      updateEvent,
      cancelEvent,
      updateEventStatus,
      submitReport,
      advanceTime,
      resetSystem,
      addRabbi,
      deleteRabbi,
      updateRabbi,
      fetchSmtpSettings,
      saveSmtpSettings
    }}>
      {children}
    </AppContext.Provider>
  );
};
