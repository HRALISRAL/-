import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function NotificationSimulator() {
  const {
    simulatedTime,
    notifications,
    events,
    updateEventStatus,
    setReportModalEvent,
    setViewModalEvent,
    advanceTime,
    resetSystem,
    user
  } = useContext(AppContext);

  // Filter logs: Rabbis see their own WhatsApp messages, Secretary sees only action confirmations (email type)
  const filteredNotifications = user && user.role === 'rabbi'
    ? notifications.filter(n => n.recipientName === user.name)
    : notifications.filter(n => n.type === 'email');

  // Formatted date and time
  const formattedDate = simulatedTime.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  const formattedTime = simulatedTime.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const getFormatTimeAgo = (date) => {
    const diffMs = simulatedTime.getTime() - date.getTime();
    if (diffMs < 0) return 'בעתיד (סימולציה)';
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 1) return 'עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דק'`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    const diffDays = Math.floor(diffHours / 24);
    return `לפני ${diffDays} ימים`;
  };

  return (
    <div className="simulator-panel glass-card">
      <div className="simulator-header">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚙️ סימולטור מערכת</span>
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          הרצת זמנים לבדיקת הודעות ותזכורות אוטומטיות.
        </p>
      </div>

      <div className="time-travel-controls">
        <label>שעון מערכת (סימולטיבי):</label>
        <div className="time-display">
          <div>{formattedDate}</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>{formattedTime}</div>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', margin: '4px 0' }}>
          התקדמות בזמן תפעיל תזכורות ודוחות בהתאם לסטטוס האירועים.
        </div>
        <div className="time-buttons">
          <button className="btn btn-secondary" onClick={() => advanceTime(3, 'hours')}>
            ➕ 3 שעות
          </button>
          <button className="btn btn-secondary" onClick={() => advanceTime(1, 'days')}>
            ➕ יום אחד
          </button>
        </div>
        <button 
          className="btn btn-danger" 
          onClick={() => {
            if (confirm('האם אתה בטוח שברצונך לאפס את כל הנתונים במערכת?')) {
              resetSystem();
            }
          }}
          style={{ marginTop: '8px', fontSize: '12px', padding: '6px' }}
        >
          ♻️ איפוס נתוני הדגמה
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <h4 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
          {user?.role === 'rabbi' ? '📱' : '📋'} {user?.role === 'rabbi' ? 'יומן הודעות והתראות' : 'עדכוני אישורים ודוחות'} ({filteredNotifications.length})
        </h4>
        
        <div className="notification-logs">
          {filteredNotifications.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              {user?.role === 'rabbi' ? 'טרם נשלחו הודעות במערכת.' : 'טרם התקבלו עדכוני אישורים או דוחות מהרבנים.'}
            </div>
          ) : (
            filteredNotifications.map(notif => {
              const evt = events.find(e => e.id === notif.eventId);
              return (
                <div key={notif.id} className={`notif-card ${notif.type}`}>
                  <div className="notif-meta">
                    <span className="notif-recipient">
                      {notif.type === 'whatsapp' ? '🟢 WhatsApp' : '✉️ Email'} - {notif.recipientName}
                    </span>
                    <span style={{ fontSize: '10px' }}>{getFormatTimeAgo(notif.timestamp)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    אל: {notif.recipientContact}
                  </div>
                  <div className="notif-body">
                    {notif.message.includes('https://eventflow.co.il/report/') ? (
                      <>
                        {notif.message.split('https://eventflow.co.il/report/')[0]}
                        <a 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (evt) {
                              if (evt.status === 'completed' || evt.status === 'approved') {
                                setReportModalEvent(evt);
                              } else {
                                alert('הדוח לאירוע זה כבר מולא במערכת.');
                              }
                            }
                          }}
                          style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: 'bold', display: 'inline-block', marginTop: '4px' }}
                        >
                          🔗 לחץ כאן למילוי דוח סיכום במערכת
                        </a>
                      </>
                    ) : (
                      notif.message
                    )}
                  </div>

                  {evt && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {evt.status === 'pending' && (
                          <>
                            <button 
                              className="btn btn-success" 
                              style={{ flex: 1, padding: '4px 8px', fontSize: '10.5px' }}
                              onClick={() => updateEventStatus(evt.id, 'approved')}
                            >
                              ✓ אשר אירוע
                            </button>
                            <button 
                              className="btn btn-danger" 
                              style={{ flex: 1, padding: '4px 8px', fontSize: '10.5px' }}
                              onClick={() => updateEventStatus(evt.id, 'declined')}
                            >
                              ✕ דחה אירוע
                            </button>
                          </>
                        )}
                        {evt.status === 'completed' && (
                          <button 
                            className="btn btn-primary" 
                            style={{ flex: 1, padding: '4px 8px', fontSize: '10.5px' }}
                            onClick={() => setReportModalEvent(evt)}
                          >
                            ✍️ מלא דוח סיכום
                          </button>
                        )}
                      </div>
                      <button 
                        className="btn btn-secondary" 
                        style={{ width: '100%', padding: '4px 8px', fontSize: '10.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        onClick={() => setViewModalEvent(evt)}
                      >
                        🔍 צפה בפרטי האירוע
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
