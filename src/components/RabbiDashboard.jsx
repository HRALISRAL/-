import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';export default function RabbiDashboard() {
  const {
    events,
    rabbis,
    activeRabbiId,
    setActiveRabbiId,
    updateEventStatus,
    submitReport,
    simulatedTime,
    user,
    reportModalEvent,
    setReportModalEvent,
    viewModalEvent,
    setViewModalEvent
  } = useContext(AppContext);

  // Calendar states
  const [calDate, setCalDate] = useState(new Date(simulatedTime));
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  // Bind local modal variables to AppContext
  const selectedEventForView = viewModalEvent;
  const setSelectedEventForView = setViewModalEvent;
  
  const selectedEventForReport = reportModalEvent;
  const setSelectedEventForReport = setReportModalEvent;
  const isReportModalOpen = !!reportModalEvent;
  const setIsReportModalOpen = (isOpen) => {
    if (!isOpen) setReportModalEvent(null);
  };

  // Report Form States
  const [participantsCount, setParticipantsCount] = useState('');
  const [connectedToRashbi, setConnectedToRashbi] = useState(false);
  const [validFoldersCount, setValidFoldersCount] = useState('');
  const [incompleteFoldersCount, setIncompleteFoldersCount] = useState('');
  const [prayerFormsCount, setPrayerFormsCount] = useState('');
  const [interestedInEventsCount, setInterestedInEventsCount] = useState('');
  const [formsVerified, setFormsVerified] = useState(false);
  const [recurringDonationsTotal, setRecurringDonationsTotal] = useState('');
  const [comments, setComments] = useState('');

  // Active Rabbi object
  const currentRabbi = rabbis.find(r => r.id === activeRabbiId) || rabbis[0] || { name: 'טוען...', avatar: '', phone: '' };

  // Filters - ONLY show events for the currently active Rabbi (Security Isolation)
  const myEvents = events.filter(e => e.rabbiId === activeRabbiId);
  const pendingEvents = myEvents.filter(e => e.status === 'pending');
  const upcomingEvents = myEvents.filter(e => e.status === 'approved');
  const completedEvents = myEvents.filter(e => e.status === 'completed');
  const reportedEvents = myEvents.filter(e => e.status === 'reported');
  const canceledPendingEvents = myEvents.filter(e => e.status === 'canceled_pending');

  // Calendar parameters
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  
  const currentMonthEvents = myEvents.filter(evt => {
    if (!evt.date) return false;
    const [evtYear, evtMonth] = evt.date.split('-').map(Number);
    return evtMonth === (month + 1) && evtYear === year && evt.status !== 'canceled';
  });
  
  const monthNames = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayClick = (dayNum) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayEvents = myEvents.filter(e => e.date === dateStr && e.status !== 'canceled'); // Filtered by active Rabbi only
    
    setSelectedDayEvents({
      dateStr,
      dayNum,
      events: dayEvents
    });
  };

  const openReportForm = (evt) => {
    setSelectedEventForReport(evt);
    
    // Clear and set defaults
    setParticipantsCount('');
    setConnectedToRashbi(false);
    setValidFoldersCount('');
    setIncompleteFoldersCount('');
    setPrayerFormsCount('');
    setInterestedInEventsCount('');
    setFormsVerified(false);
    setRecurringDonationsTotal('');
    setComments('');

    setIsReportModalOpen(true);
  };

  const handleReportSubmit = (e) => {
    e.preventDefault();

    submitReport(selectedEventForReport.id, {
      actualStartTime: '19:00', // Pre-defaulted placeholder
      actualEndTime: '22:00',
      participantsCount: Number(participantsCount) || 0,
      connectedToRashbi,
      validFoldersCount: Number(validFoldersCount) || 0,
      incompleteFoldersCount: Number(incompleteFoldersCount) || 0,
      prayerFormsCount: Number(prayerFormsCount) || 0,
      interestedInEventsCount: Number(interestedInEventsCount) || 0,
      formsVerified,
      recurringDonationsTotal: Number(recurringDonationsTotal) || 0,
      comments
    });

    setIsReportModalOpen(false);
    setSelectedEventForReport(null);
  };

  const translateStatus = (status) => {
    switch (status) {
      case 'pending': return 'ממתין לאישורך';
      case 'approved': return 'מאושר';
      case 'declined': return 'נדחה';
      case 'completed': return 'הסתיים (ממתין לדוח)';
      case 'reported': return 'דוח מולא';
      case 'canceled_pending': return 'בוטל (ממתין לאישור קבלה)';
      case 'canceled': return 'בוטל ואושר';
      default: return status;
    }
  };

  const renderCalendarCells = () => {
    const cells = [];
    const simulatedDateStr = new Date(simulatedTime).toISOString().split('T')[0];

    // Empty cells before month start
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="calendar-cell empty" style={{ opacity: 0.2 }} />);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = myEvents.filter(e => e.date === dateStr && e.status !== 'canceled'); // Rabbi's personal calendar events only
      const isToday = dateStr === simulatedDateStr;
      cells.push(
        <div 
          key={`day-${day}`} 
          className={`calendar-cell ${isToday ? 'today' : ''}`}
          onClick={() => handleDayClick(day)}
          style={{ cursor: 'pointer' }}
        >
          <div className="calendar-day-number">{day}</div>
          <div className="calendar-events">
            {dayEvents.map(evt => {
              let badgeClass = 'status-pending';
              if (evt.status === 'approved') badgeClass = 'status-approved';
              if (evt.status === 'declined') badgeClass = 'status-declined';
              if (evt.status === 'completed') badgeClass = 'status-completed';
              if (evt.status === 'reported') badgeClass = 'status-reported';
              if (evt.status === 'canceled_pending') badgeClass = 'status-declined';
              if (evt.status === 'canceled') badgeClass = 'status-declined';
              
              return (
                <div 
                  key={evt.id} 
                  className={`calendar-event-badge ${badgeClass}`}
                  title={`${evt.title} (${translateStatus(evt.status)})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEventForView(evt);
                  }}
                >
                  {evt.title}
                </div>
              );
            })}
          </div>

          {/* Date Cell Tooltip */}
          {dayEvents.length > 0 && (
            <div className="calendar-cell-tooltip">
              <div style={{ fontWeight: 'bold', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '6px', color: '#fff' }}>
                אירועים שלי ביום זה ({dayEvents.length})
              </div>
              {dayEvents.map(evt => (
                <div key={evt.id} style={{ marginBottom: '8px', fontSize: '11px', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{evt.time}</span>
                    <span className={`status-badge status-${evt.status}`} style={{ fontSize: '8.5px', padding: '1px 4px' }}>
                      {translateStatus(evt.status)}
                    </span>
                  </div>
                  <div style={{ color: '#f8fafc', whiteSpace: 'normal', marginTop: '2px', fontWeight: 'bold' }}>{evt.title}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '1px' }}>📍 {evt.location}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );    }

    return cells;
  };

  return (
    <div className="main-panel">
      {/* Identity Selector Banner */}
      {user && user.role === 'secretary' && (
        <div className="glass-card flex-between" style={{ padding: '16px' }}>
          <div>
            <h3>🎭 התחברות כרב (סימולציית יומן אישי)</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              בחר רב כדי לראות את **לוח השנה האישי** וההרשאות הפרטיות שלו.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {rabbis.map(r => (
              <button 
                key={r.id}
                className={`btn ${activeRabbiId === r.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setActiveRabbiId(r.id);
                  setReportModalEvent(null);
                  setViewModalEvent(null);
                  setSelectedDayEvents(null);
                }}
                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <img src={r.avatar} alt={r.name} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                {r.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="split-view">
        {/* Left Side: Personal Calendar */}
        <div className="calendar-container glass-card">
          <div className="calendar-header flex-between">
            <h2>📅 היומן האישי שלי - {currentRabbi.name}</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={handlePrevMonth} style={{ padding: '4px 10px' }}>◀</button>
              <span style={{ fontWeight: 'bold', minWidth: '100px', textAlign: 'center' }}>
                {monthNames[month]} {year}
              </span>
              <button type="button" className="btn btn-secondary" onClick={handleNextMonth} style={{ padding: '4px 10px' }}>▶</button>
            </div>
          </div>

          <div className="calendar-grid">
            <div className="calendar-day-label">א'</div>
            <div className="calendar-day-label">ב'</div>
            <div className="calendar-day-label">ג'</div>
            <div className="calendar-day-label">ד'</div>
            <div className="calendar-day-label">ה'</div>
            <div className="calendar-day-label">ו'</div>
            <div className="calendar-day-label">ש'</div>
            {renderCalendarCells()}
          </div>

          {selectedDayEvents && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>
                אירועים שלי ביום {selectedDayEvents.dayNum} ב{monthNames[month]}:
              </h4>
              {selectedDayEvents.events.length === 0 ? (
                <p className="empty-state" style={{ padding: '10px' }}>אין אירועים משויכים אליך ביום זה.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedDayEvents.events.map(evt => (
                    <div 
                      key={evt.id} 
                      className="flex-between" 
                      onClick={() => setSelectedEventForView(evt)}
                      style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <div>
                        <strong style={{ marginLeft: '10px' }}>{evt.time}</strong>
                        <span>{evt.title}</span>
                      </div>
                      <span className={`status-badge status-${evt.status}`}>
                        {translateStatus(evt.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Rabbi actions & report lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Monthly Statistics Summary */}
          <div className="glass-card" style={{ background: 'var(--primary)', color: '#fff', borderTop: '3px solid var(--accent)' }}>
            <h3 style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
              <span>📊 סיכום חודשי ל{monthNames[month]} {year}</span>
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>סה"כ אירועים החודש</span>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>
                  {currentMonthEvents.length}
                </div>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>דוחות שהוגשו</span>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--success)', marginTop: '4px' }}>
                  {currentMonthEvents.filter(e => e.status === 'reported').length}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>משתתפים שקובצו</span>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--info)', marginTop: '4px' }}>
                  {currentMonthEvents.reduce((sum, e) => sum + (e.report?.participantsCount || 0), 0)}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>הוראות קבע שגויסו</span>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--warning)', marginTop: '4px' }}>
                  ₪{currentMonthEvents.reduce((sum, e) => sum + (e.report?.recurringDonationsTotal || 0), 0).toLocaleString()}
                </div>
              </div>
            </div>
            
            {/* Small status breakdown */}
            <div style={{ marginTop: '12px', fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
              <span>מאושרים: <strong>{currentMonthEvents.filter(e => e.status === 'approved').length}</strong></span>
              <span>•</span>
              <span>ממתינים: <strong>{currentMonthEvents.filter(e => e.status === 'pending').length}</strong></span>
              <span>•</span>
              <span>נדחו: <strong>{currentMonthEvents.filter(e => e.status === 'declined').length}</strong></span>
            </div>
          </div>

          {/* Canceled Events Awaiting Confirmation */}
          {canceledPendingEvents.length > 0 && (
            <div className="glass-card" style={{ borderRight: '4px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
              <h3 style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>⚠️ ביטולי אירועים הממתינים לאישור קבלתך <span style={{ display: 'inline-block', direction: 'ltr' }}>({canceledPendingEvents.length})</span></h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                מזכירות הארגון ביטלה את האירועים הבאים. נא אשר את קבלת הודעת הביטול.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                {canceledPendingEvents.map(evt => (
                  <div 
                    key={evt.id} 
                    style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', cursor: 'pointer' }}
                    onClick={() => setSelectedEventForView(evt)}
                  >
                    <div className="flex-between" style={{ marginBottom: '8px' }}>
                      <strong style={{ color: '#f87171' }}>{evt.title}</strong>
                      <span className="status-badge status-declined" style={{ fontSize: '10px' }}>בוטל במזכירות</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      <div>📍 {evt.location}</div>
                      <div>📅 {evt.date} | {evt.time}</div>
                    </div>
                    <button 
                      className="btn btn-danger" 
                      style={{ width: '100%', padding: '8px', fontWeight: 'bold' }} 
                      onClick={(e) => {
                        e.stopPropagation();
                        updateEventStatus(evt.id, 'canceled');
                      }}
                    >
                      ✓ אשר קבלת ביטול
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Event Invitations */}
          <div className="glass-card">
            <h3>📥 הזמנות לאירועים חדשים <span style={{ display: 'inline-block', direction: 'ltr' }}>({pendingEvents.length})</span></h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              {pendingEvents.length === 0 ? (
                <p className="empty-state" style={{ padding: '10px 0' }}>אין הזמנות חדשות הממתינות לאישורך.</p>
              ) : (
                pendingEvents.map(evt => (
                  <div 
                    key={evt.id} 
                    style={{ 
                      padding: '12px', 
                      background: 'rgba(0,0,0,0.2)', 
                      border: evt.isUpdated ? '1.5px solid var(--warning)' : '1px solid var(--glass-border)', 
                      borderRadius: '8px', 
                      cursor: 'pointer' 
                    }}
                    onClick={() => setSelectedEventForView(evt)}
                  >
                    <div className="flex-between" style={{ marginBottom: '8px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {evt.title} {evt.isUpdated && <span style={{ color: 'var(--warning)', fontSize: '12px', marginRight: '6px' }}>⚠️ עודכן</span>}
                      </strong>
                      <span className="status-badge status-pending" style={{ fontSize: '10px' }}>
                        {evt.isUpdated ? 'עודכן ונדרש אישור מחדש' : 'ממתין לתשובה'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      <div>📍 {evt.location}</div>
                      <div>📅 {evt.date} | {evt.time}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-success" style={{ flex: 1, padding: '6px' }} onClick={() => updateEventStatus(evt.id, 'approved')}>
                        ✓ אשר
                      </button>
                      <button className="btn btn-danger" style={{ flex: 1, padding: '6px' }} onClick={() => updateEventStatus(evt.id, 'declined')}>
                        ✕ דחה
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Reports (Completed events) */}
          <div className="glass-card">
            <h3>📝 הגשת דוח סיכום אירוע <span style={{ display: 'inline-block', direction: 'ltr' }}>({completedEvents.length})</span></h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              {completedEvents.length === 0 ? (
                <p className="empty-state" style={{ padding: '10px 0' }}>אין אירועים שממתינים למילוי דוח.</p>
              ) : (
                completedEvents.map(evt => (
                  <div 
                    key={evt.id} 
                    className="flex-between" 
                    style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '6px', cursor: 'pointer' }}
                    onClick={() => setSelectedEventForView(evt)}
                  >
                    <div>
                      <strong style={{ fontSize: '13px' }}>{evt.title}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📅 {evt.date} | 📍 {evt.location}</div>
                    </div>
                    <button 
                      className="btn btn-accent" 
                      style={{ padding: '6px 12px', fontSize: '12px' }} 
                      onClick={(e) => {
                        e.stopPropagation();
                        openReportForm(evt);
                      }}
                    >
                      מלא דוח
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="glass-card">
            <h3>📅 אירועים מאושרים שלי בקרוב <span style={{ display: 'inline-block', direction: 'ltr' }}>({upcomingEvents.length})</span></h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {upcomingEvents.length === 0 ? (
                <p className="empty-state" style={{ padding: '10px 0' }}>אין אירועים קרובים מאושרים.</p>
              ) : (
                upcomingEvents.map(evt => (
                  <div 
                    key={evt.id} 
                    style={{ padding: '10px', background: 'rgba(0,0,0,0.01)', border: '1px solid var(--glass-border)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                    onClick={() => setSelectedEventForView(evt)}
                  >
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>{evt.title}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>📅 {evt.date} בשעה {evt.time} | 📍 {evt.location}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EVENT DETAILS MODAL (VIEW POPUP FOR RABBIS) */}
      {selectedEventForView && (
        <div className="modal-overlay" onClick={() => setSelectedEventForView(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2>🔍 פרטי אירוע</h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setSelectedEventForView(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="flex-between">
                <h3 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>{selectedEventForView.title}</h3>
                <span className={`status-badge status-${selectedEventForView.status}`}>
                  {translateStatus(selectedEventForView.status)}
                </span>
              </div>

              <hr style={{ borderColor: 'var(--glass-border)' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                <div><strong>תאריך:</strong> {selectedEventForView.date}</div>
                <div><strong>שעה:</strong> {selectedEventForView.time}</div>
                <div style={{ gridColumn: 'span 2' }}><strong>מיקום:</strong> {selectedEventForView.location}</div>
              </div>

              <div style={{ fontSize: '14px', background: '#F8FAFC', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <strong>👤 איש קשר (לקוח):</strong>
                <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>{selectedEventForView.clientName} | {selectedEventForView.clientPhone}</div>
              </div>

              {selectedEventForView.description && (
                <div style={{ fontSize: '14px' }}>
                  <strong>דגשים נוספים:</strong>
                  <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>{selectedEventForView.description}</div>
                </div>
              )}

              {/* Display Report details if reported */}
              {selectedEventForView.status === 'reported' && selectedEventForView.report && (
                <div className="report-view">
                  <h4 style={{ color: 'var(--success)', marginBottom: '8px', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', paddingBottom: '4px' }}>
                    📝 דוח סיכום שהוגש
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    <div><strong>מספר משתתפים:</strong> {selectedEventForView.report.participantsCount}</div>
                    <div><strong>חיבור למורשת רשב"י:</strong> {selectedEventForView.report.connectedToRashbi ? 'כן' : 'לא'}</div>
                    <div><strong>פולדרים תקינים:</strong> {selectedEventForView.report.validFoldersCount}</div>
                    <div><strong>פולדרים חסרים:</strong> {selectedEventForView.report.incompleteFoldersCount}</div>
                    <div><strong>טפסי שמות לתפילה:</strong> {selectedEventForView.report.prayerFormsCount}</div>
                    <div><strong>מתעניינים נוספים:</strong> {selectedEventForView.report.interestedInEventsCount}</div>
                    <div style={{ gridColumn: 'span 2' }}><strong>סך הוראות קבע שגויסו:</strong> ₪{selectedEventForView.report.recurringDonationsTotal.toLocaleString()}</div>
                    {selectedEventForView.report.comments && (
                      <div style={{ gridColumn: 'span 2', marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.15)', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                        <strong>הערות וסיכום כללי:</strong>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{selectedEventForView.report.comments}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action button inside popup for completed events needing reports */}
              {selectedEventForView.status === 'completed' && (
                <button 
                  className="btn btn-accent" 
                  onClick={() => {
                    setSelectedEventForView(null);
                    openReportForm(selectedEventForView);
                  }}
                  style={{ marginTop: '10px' }}
                >
                  ✍️ עבור למילוי דוח סיכום
                </button>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedEventForView(null)}>סגור</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RABBIS REPORT MODAL (QUESTIONNAIRE POPUP) */}
      {isReportModalOpen && selectedEventForReport && (
        <div className="modal-overlay" onClick={() => { setIsReportModalOpen(false); setSelectedEventForReport(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2>✍️ טופס שאלון סיכום אירוע</h2>
              <button className="btn btn-secondary btn-icon" onClick={() => { setIsReportModalOpen(false); setSelectedEventForReport(null); }}>✕</button>
            </div>

            <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: '#F8FAFC', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <div><strong>רב מדווח:</strong> {currentRabbi.name}</div>
                <div><strong>תאריך:</strong> {selectedEventForReport.date}</div>
                <div style={{ gridColumn: 'span 2' }}><strong>מקום האירוע:</strong> {selectedEventForReport.location}</div>
              </div>

              <div className="form-group" style={{ marginBottom: '0' }}>
                <label>מספר משתתפים באירוע *</label>
                <input 
                  type="number" 
                  value={participantsCount} 
                  onChange={(e) => setParticipantsCount(e.target.value)} 
                  placeholder="כמות נוכחים מוערכת"
                  required 
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                <input 
                  type="checkbox" 
                  id="connectedRashbi"
                  checked={connectedToRashbi} 
                  onChange={(e) => setConnectedToRashbi(e.target.checked)} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="connectedRashbi" style={{ cursor: 'pointer', userSelect: 'none' }}>
                  חיברתי את המשתתפים למורשת רשב"י והארגון
                </label>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label>פולדרים תקינים (מלאים) *</label>
                  <input 
                    type="number" 
                    value={validFoldersCount} 
                    onChange={(e) => setValidFoldersCount(e.target.value)} 
                    placeholder="כמות"
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label>פולדרים חסרי פרטים *</label>
                  <input 
                    type="number" 
                    value={incompleteFoldersCount} 
                    onChange={(e) => setIncompleteFoldersCount(e.target.value)} 
                    placeholder="כמות"
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label>טפסי שמות לתפילה *</label>
                  <input 
                    type="number" 
                    value={prayerFormsCount} 
                    onChange={(e) => setPrayerFormsCount(e.target.value)} 
                    placeholder="כמות שנאספה"
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label>מתעניינים בעריכת אירוע *</label>
                  <input 
                    type="number" 
                    value={interestedInEventsCount} 
                    onChange={(e) => setInterestedInEventsCount(e.target.value)} 
                    placeholder="כמות"
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                <input 
                  type="checkbox" 
                  id="formsChecked"
                  checked={formsVerified} 
                  onChange={(e) => setFormsVerified(e.target.checked)} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="formsChecked" style={{ cursor: 'pointer', userSelect: 'none' }}>
                  עברתי על הטפסים לוודא שהם תקינים ומלאים
                </label>
              </div>

              <div className="form-group" style={{ marginBottom: '0' }}>
                <label>סך הוראות קבע שגויסו (בש"ח) *</label>
                <input 
                  type="number" 
                  value={recurringDonationsTotal} 
                  onChange={(e) => setRecurringDonationsTotal(e.target.value)} 
                  placeholder="סכום כולל בשקלים"
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0' }}>
                <label>הערות וסיכום כללי</label>
                <textarea 
                  value={comments} 
                  onChange={(e) => setComments(e.target.value)} 
                  placeholder="הערות נוספות, חוויות מהאירוע, סיכום..."
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsReportModalOpen(false); setSelectedEventForReport(null); }}>ביטול</button>
                <button type="submit" className="btn btn-success">הגש דוח סופי למזכירות</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
