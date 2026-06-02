import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';

export default function HostDashboard() {
  const {
    events,
    hosts,
    activeHostId,
    setActiveHostId,
    updateEventStatus,
    submitReport,
    simulatedTime
  } = useContext(AppContext);

  // State for active report being filled
  const [activeReportEventId, setActiveReportEventId] = useState(null);
  const [reportActualStart, setReportActualStart] = useState('');
  const [reportActualEnd, setReportActualEnd] = useState('');
  const [reportRating, setReportRating] = useState(5);
  const [reportFeedback, setReportFeedback] = useState('');
  const [reportIssues, setReportIssues] = useState('');

  const currentHost = hosts.find(h => h.id === activeHostId) || hosts[0];

  // Filters for active host
  const myEvents = events.filter(e => e.hostId === activeHostId);
  const pendingEvents = myEvents.filter(e => e.status === 'pending');
  const upcomingEvents = myEvents.filter(e => e.status === 'approved');
  const completedEvents = myEvents.filter(e => e.status === 'completed');
  const reportedEvents = myEvents.filter(e => e.status === 'reported');

  const openReportForm = (evt) => {
    setActiveReportEventId(evt.id);
    setReportActualStart(evt.time);
    // Suggest 3 hours later for end time
    const [h, m] = evt.time.split(':').map(Number);
    const endH = (h + 3) % 24;
    setReportActualEnd(`${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    setReportRating(5);
    setReportFeedback('');
    setReportIssues('');
  };

  const handleReportSubmit = (e) => {
    e.preventDefault();
    if (!reportActualStart || !reportActualEnd || !reportRating) {
      alert('נא למלא את שדות החובה של הדוח.');
      return;
    }

    submitReport(activeReportEventId, {
      actualStartTime: reportActualStart,
      actualEndTime: reportActualEnd,
      rating: String(reportRating),
      feedback: reportFeedback,
      issues: reportIssues
    });

    setActiveReportEventId(null);
  };

  return (
    <div className="main-panel">
      {/* Active Host Selector (Simulator helper) */}
      <div className="glass-card flex-between" style={{ padding: '16px' }}>
        <div>
          <h3>🎭 התחברות כעובד (החלפת זהות לצורך סימולציה)</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            בחר את עורך האירועים שעבורו תרצה לצפות בלוח הבקרה ולבצע פעולות.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {hosts.map(h => (
            <button 
              key={h.id}
              className={`btn ${activeHostId === h.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setActiveHostId(h.id);
                setActiveReportEventId(null); // Close active reports
              }}
              style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <img src={h.avatar} alt={h.name} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
              {h.name}
            </button>
          ))}
        </div>
      </div>

      <div className="split-view">
        {/* Left Side: Pending invitations and reporting tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Pending Invitations */}
          <div className="glass-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📥 הזמנות חדשות הממתינות לאישורך ({pendingEvents.length})</span>
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', marginTop: '4px' }}>
              אירועים ששובצו עבורך על ידי המזכירות. נא לאשר או לדחות את השיבוץ.
            </p>

            {pendingEvents.length === 0 ? (
              <p className="empty-state">אין הזמנות חדשות הממתינות לאישורך.</p>
            ) : (
              pendingEvents.map(evt => (
                <div key={evt.id} className="event-item-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                  <div className="flex-between">
                    <h4 style={{ color: '#fff' }}>{evt.title}</h4>
                    <span className="status-badge status-pending">ממתין לתשובתך</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <div>📍 {evt.location}</div>
                    <div>📅 {evt.date} בשעה {evt.time}</div>
                    <div>👤 לקוח: {evt.clientName}</div>
                    <div>📞 טלפון לקוח: {evt.clientPhone}</div>
                  </div>

                  {evt.description && (
                    <div style={{ fontSize: '13px', background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '6px', color: 'var(--text-muted)' }}>
                      <strong>הערות מזכירות:</strong> {evt.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button className="btn btn-success" style={{ flex: 1 }} onClick={() => updateEventStatus(evt.id, 'approved')}>
                      ✓ אשר שיבוץ
                    </button>
                    <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => updateEventStatus(evt.id, 'declined')}>
                      ✕ דחה שיבוץ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pending Reports (Completed events) */}
          <div className="glass-card">
            <h3>📝 הגשת דוח סיכום אירוע ({completedEvents.length})</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', marginTop: '4px' }}>
              אירועי עבר שהסתיימו ונדרש עבורם מילוי דוח פעילות.
            </p>

            {completedEvents.length === 0 ? (
              <p className="empty-state">אין אירועים הממתינים למילוי דוח כרגע.</p>
            ) : (
              completedEvents.map(evt => (
                <div key={evt.id} style={{ marginBottom: '12px' }}>
                  <div className="event-item-card" style={{ marginBottom: '4px' }}>
                    <div className="event-item-info">
                      <h4>{evt.title}</h4>
                      <div className="event-item-details">
                        <span>📅 {evt.date}</span>
                        <span>📍 {evt.location}</span>
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => openReportForm(evt)}>
                      ✍️ מלא דוח אירוע
                    </button>
                  </div>

                  {/* Report form section (collapsible/inline) */}
                  {activeReportEventId === evt.id && (
                    <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
                      <h4 style={{ marginBottom: '12px', fontSize: '15px' }}>מילוי דוח עבור: {evt.title}</h4>
                      <form onSubmit={handleReportSubmit}>
                        <div className="form-row">
                          <div className="form-group">
                            <label>שעת התחלה בפועל *</label>
                            <input 
                              type="time" 
                              value={reportActualStart} 
                              onChange={(e) => setReportActualStart(e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="form-group">
                            <label>שעת סיום בפועל *</label>
                            <input 
                              type="time" 
                              value={reportActualEnd} 
                              onChange={(e) => setReportActualEnd(e.target.value)} 
                              required 
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>שביעות רצון (ציון האירוע) *</label>
                          <div className="rating-group">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                className={`rating-star-btn ${star <= reportRating ? 'filled' : ''}`}
                                onClick={() => setReportRating(star)}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="form-group">
                          <label>סיכום ומשוב חופשי *</label>
                          <textarea 
                            value={reportFeedback} 
                            onChange={(e) => setReportFeedback(e.target.value)} 
                            placeholder="איך היה האירוע? האם הלקוחות היו מרוצים? מה עבד טוב?"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>תקלות או הערות טכניות (במידה ויש)</label>
                          <textarea 
                            value={reportIssues} 
                            onChange={(e) => setReportIssues(e.target.value)} 
                            placeholder="בעיות הגברה, תאורה, איחורים, קהל קשה וכדומה..."
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                          <button type="button" className="btn btn-secondary" onClick={() => setActiveReportEventId(null)}>ביטול</button>
                          <button type="submit" className="btn btn-success">שלח דוח סופי למזכירות</button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Upcoming approved events and past reported events */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Upcoming Events */}
          <div className="glass-card">
            <h3>📅 האירועים הבאים שלך ({upcomingEvents.length})</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', marginTop: '4px' }}>
              אירועים שאישרת שיתקיימו בקרוב.
            </p>

            {upcomingEvents.length === 0 ? (
              <p className="empty-state">אין אירועים קרובים מאושרים.</p>
            ) : (
              upcomingEvents.map(evt => {
                const eventStart = new Date(evt.date + 'T' + evt.time);
                const isTomorrow = new Date(simulatedTime.getTime() + 24 * 60 * 60 * 1000).toDateString() === eventStart.toDateString();
                
                return (
                  <div key={evt.id} className="event-item-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                    <div className="flex-between">
                      <h4 style={{ fontSize: '15px' }}>{evt.title}</h4>
                      <span className="status-badge status-approved">מאושר</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <div>📅 תאריך: {evt.date} | שעה: {evt.time}</div>
                      <div>📍 מיקום: {evt.location}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', fontSize: '11px' }}>
                      <span style={{ color: evt.reminderSent ? 'var(--success)' : 'var(--text-muted)', fontWeight: evt.reminderSent ? 'bold' : 'normal' }}>
                        {evt.reminderSent ? '🔔 תזכורת יום לפני נשלחה' : '⏳ ממתין לתזכורת (יום לפני)'}
                      </span>
                      {isTomorrow && <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>מחר!</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Recently Reported */}
          <div className="glass-card">
            <h3>✅ אירועים שסוכמו בהצלחה ({reportedEvents.length})</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', marginTop: '4px' }}>
              היסטוריית אירועים שסיימת והגשת עבורם דוח.
            </p>

            {reportedEvents.length === 0 ? (
              <p className="empty-state">טרם הוגשו דוחות.</p>
            ) : (
              reportedEvents.map(evt => (
                <div key={evt.id} style={{ padding: '10px 12px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', marginBottom: '8px' }}>
                  <div className="flex-between" style={{ marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px' }}>{evt.title}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--success)' }}>✓ סיכום הוגש</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>תאריך: {evt.date} | דירוג: </span>
                    <span style={{ color: 'var(--warning)' }}>{'★'.repeat(Number(evt.report?.rating))}</span>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
