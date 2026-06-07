import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
export default function SecretaryDashboard() {
  const {
    events,
    rabbis,
    addEvent,
    updateEvent,
    cancelEvent,
    simulatedTime,
    addRabbi,
    deleteRabbi,
    updateRabbi,
    reportModalEvent,
    setReportModalEvent,
    viewModalEvent,
    setViewModalEvent,
    fetchSmtpSettings,
    saveSmtpSettings
  } = useContext(AppContext);

  // States for calendar view month/year
  const [calDate, setCalDate] = useState(new Date(simulatedTime));
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  const getRabbiSpecialties = (name) => {
    if (!name) return ['הרצאות', 'חוגי בית'];
    if (name.includes('אברהם') || name.includes('כהן')) return ['הלכות שבת', 'שלום בית', 'הרצאות קהילה'];
    if (name.includes('יצחק') || name.includes('לוי')) return ['כשרות מהדרין', 'חינוך נוער', 'הפרשת חלה'];
    if (name.includes('חיים') || name.includes('יוסף')) return ['חוגי בית', 'פסיקה הלכתית', 'שיעורי מורשת'];
    if (name.includes('דוד') || name.includes('מזרחי')) return ['זוגיות ומשפחה', 'דרשות והרצאות', 'הלכות תפילין'];
    return ['הרצאות', 'חוגי בית', 'ליווי רוחני'];
  };
  
  // States for "Create Event" Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');

  // States for Edit Event Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEventForEdit, setSelectedEventForEdit] = useState(null);
  const [editFormTitle, setEditFormTitle] = useState('');
  const [editFormDate, setEditFormDate] = useState('');
  const [editFormTime, setEditFormTime] = useState('');
  const [editFormRabbiId, setEditFormRabbiId] = useState('');
  const [editFormLocation, setEditFormLocation] = useState('');
  const [editFormClientName, setEditFormClientName] = useState('');
  const [editFormClientPhone, setEditFormClientPhone] = useState('');
  const [editFormDescription, setEditFormDescription] = useState('');
  
  // Bind local view modal variable to AppContext for view event
  const selectedEventForView = viewModalEvent;
  const setSelectedEventForView = setViewModalEvent;

  // States for Rabbi Management Modal
  const [isRabbiManagementOpen, setIsRabbiManagementOpen] = useState(false);
  const [isAddRabbiOpen, setIsAddRabbiOpen] = useState(false);
  const [rabbiError, setRabbiError] = useState('');
  const [rabbiSuccess, setRabbiSuccess] = useState('');

  // New Rabbi Form States
  const [newRabbiName, setNewRabbiName] = useState('');
  const [newRabbiEmail, setNewRabbiEmail] = useState('');
  const [newRabbiPhone, setNewRabbiPhone] = useState('');
  const [newRabbiAddress, setNewRabbiAddress] = useState('');
  const [newRabbiPassword, setNewRabbiPassword] = useState('');
  const [newRabbiAvatar, setNewRabbiAvatar] = useState('');

  // Editing Rabbi States
  const [editingRabbi, setEditingRabbi] = useState(null);
  const [editRabbiName, setEditRabbiName] = useState('');
  const [editRabbiEmail, setEditRabbiEmail] = useState('');
  const [editRabbiPhone, setEditRabbiPhone] = useState('');
  const [editRabbiAddress, setEditRabbiAddress] = useState('');
  const [editRabbiPassword, setEditRabbiPassword] = useState('');
  const [editRabbiAvatar, setEditRabbiAvatar] = useState('');

  // States for SMTP settings modal
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [isSmtpPasswordSet, setIsSmtpPasswordSet] = useState(false);
  const [smtpSuccess, setSmtpSuccess] = useState('');
  const [smtpError, setSmtpError] = useState('');

  const openSmtpModal = async () => {
    setSmtpError('');
    setSmtpSuccess('');
    setSmtpPass('');
    setIsSmtpModalOpen(true);
    
    const settings = await fetchSmtpSettings();
    if (settings) {
      setSmtpHost(settings.smtp_host || '');
      setSmtpPort(String(settings.smtp_port || '587'));
      setSmtpSecure(!!settings.smtp_secure);
      setSmtpUser(settings.smtp_user || '');
      setSmtpFrom(settings.smtp_from || '');
      setIsSmtpPasswordSet(!!settings.is_password_set);
    } else {
      setSmtpError('שגיאה בטעינת הגדרות דואר מהשרת.');
    }
  };

  const handleSmtpSubmit = async (e) => {
    e.preventDefault();
    setSmtpError('');
    setSmtpSuccess('');

    const res = await saveSmtpSettings({
      smtp_host: smtpHost,
      smtp_port: parseInt(smtpPort) || 587,
      smtp_secure: smtpSecure,
      smtp_user: smtpUser,
      smtp_pass: smtpPass || undefined, // Send password only if changed
      smtp_from: smtpFrom
    });

    if (res.success) {
      setSmtpSuccess('הגדרות הדואר נשמרו ועודכנו בהצלחה במערכת!');
      setIsSmtpPasswordSet(!!smtpPass || isSmtpPasswordSet);
      setSmtpPass('');
    } else {
      setSmtpError(res.error || 'שגיאה בשמירת ההגדרות.');
    }
  };

  // Handlers for Rabbi Management
  const handleDeleteRabbi = async (id) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק רב זה מהמערכת?')) return;
    setRabbiError('');
    setRabbiSuccess('');
    const res = await deleteRabbi(id);
    if (res.success) {
      setRabbiSuccess('הרב נמחק בהצלחה מהמערכת.');
    } else {
      setRabbiError(res.error || 'שגיאה במחיקת הרב');
    }
  };

  const handleAddRabbiSubmit = async (e) => {
    e.preventDefault();
    setRabbiError('');
    setRabbiSuccess('');
    
    if (!newRabbiName || !newRabbiEmail || !newRabbiPhone || !newRabbiPassword) {
      setRabbiError('נא למלא את כל שדות החובה.');
      return;
    }

    const res = await addRabbi({
      name: newRabbiName,
      email: newRabbiEmail,
      phone: newRabbiPhone,
      address: newRabbiAddress,
      password: newRabbiPassword,
      avatar: newRabbiAvatar
    });

    if (res.success) {
      setRabbiSuccess('הרב התווסף בהצלחה למערכת.');
      // Clear fields
      setNewRabbiName('');
      setNewRabbiEmail('');
      setNewRabbiPhone('');
      setNewRabbiAddress('');
      setNewRabbiPassword('');
      setNewRabbiAvatar('');
      setIsAddRabbiOpen(false);
    } else {
      setRabbiError(res.error || 'שגיאה בהוספת הרב');
    }
  };

  const startEditRabbi = (rabbi) => {
    setEditingRabbi(rabbi);
    setEditRabbiName(rabbi.name || '');
    setEditRabbiEmail(rabbi.email || '');
    setEditRabbiPhone(rabbi.phone || '');
    setEditRabbiAddress(rabbi.address || '');
    setEditRabbiPassword(''); // Empty by default (unless changing)
    setEditRabbiAvatar(rabbi.avatar || '');
    setRabbiError('');
    setRabbiSuccess('');
  };

  const handleEditRabbiSubmit = async (e) => {
    e.preventDefault();
    setRabbiError('');
    setRabbiSuccess('');

    if (!editRabbiName || !editRabbiEmail || !editRabbiPhone) {
      setRabbiError('שם מלא, אימייל ומספר טלפון הם שדות חובה.');
      return;
    }

    const res = await updateRabbi(editingRabbi.id, {
      name: editRabbiName,
      email: editRabbiEmail,
      phone: editRabbiPhone,
      address: editRabbiAddress,
      avatar: editRabbiAvatar,
      password: editRabbiPassword || undefined // If blank, backend will keep current
    });

    if (res.success) {
      setRabbiSuccess('פרטי הרב עודכנו בהצלחה במערכת.');
      setEditingRabbi(null);
    } else {
      setRabbiError(res.error || 'שגיאה בעדכון פרטי הרב');
    }
  };

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formTime, setFormTime] = useState('19:00');
  const [formRabbiId, setFormRabbiId] = useState('1');
  const [formLocation, setFormLocation] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Calendar Helpers
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  
  const monthNames = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Reported events for the dedicated reports section
  const reportedEvents = events.filter(e => e.status === 'reported');

  const handlePrevMonth = () => {
    setCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayClick = (dayNum) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayEvents = events.filter(e => e.date === dateStr);
    
    setSelectedDayEvents({
      dateStr,
      dayNum,
      events: dayEvents
    });
  };

  const openCreateModal = (dateStr = '') => {
    const defaultDate = dateStr || new Date(simulatedTime).toISOString().split('T')[0];
    setSelectedDateStr(defaultDate);
    
    setFormTitle('');
    setFormTime('19:00');
    setFormRabbiId(rabbis[0]?.id || '1');
    setFormLocation('');
    setFormClientName('');
    setFormClientPhone('');
    setFormDescription('');
    
    setIsCreateModalOpen(true);
  };

  const handleCreateEventSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle || !selectedDateStr || !formTime || !formLocation || !formClientName) {
      alert('נא למלא את כל שדות החובה.');
      return;
    }

    const eventStart = new Date(selectedDateStr + 'T' + formTime);
    const simTimeDate = new Date(simulatedTime);
    if (eventStart < simTimeDate) {
      alert('שגיאה: לא ניתן לקבוע אירוע בתאריך ושעה שעברו.');
      return;
    }

    const res = await addEvent({
      title: formTitle,
      date: selectedDateStr,
      time: formTime,
      rabbiId: formRabbiId,
      location: formLocation,
      clientName: formClientName,
      clientPhone: formClientPhone,
      description: formDescription
    });

    if (res && res.success) {
      setIsCreateModalOpen(false);
      if (selectedDayEvents && selectedDayEvents.dateStr === selectedDateStr) {
        setTimeout(() => {
          handleDayClick(selectedDayEvents.dayNum);
        }, 50);
      }
    } else {
      alert(res?.error || 'שגיאה בשיבוץ האירוע');
    }
  };

  const startEditEvent = (evt) => {
    setSelectedEventForEdit(evt);
    setEditFormTitle(evt.title || '');
    setEditFormDate(evt.date || '');
    setEditFormTime(evt.time || '');
    setEditFormRabbiId(evt.rabbiId || '');
    setEditFormLocation(evt.location || '');
    setEditFormClientName(evt.clientName || '');
    setEditFormClientPhone(evt.clientPhone || '');
    setEditFormDescription(evt.description || '');
    setIsEditModalOpen(true);
    setSelectedEventForView(null);
  };

  const handleEditEventSubmit = async (e) => {
    e.preventDefault();
    if (!editFormTitle || !editFormDate || !editFormTime || !editFormLocation || !editFormClientName) {
      alert('נא למלא את כל שדות החובה.');
      return;
    }

    const res = await updateEvent(selectedEventForEdit.id, {
      title: editFormTitle,
      date: editFormDate,
      time: editFormTime,
      rabbiId: editFormRabbiId,
      location: editFormLocation,
      clientName: editFormClientName,
      clientPhone: editFormClientPhone,
      description: editFormDescription
    });

    if (res.success) {
      setIsEditModalOpen(false);
      setSelectedEventForEdit(null);
    } else {
      alert(res.error || 'שגיאה בעדכון האירוע');
    }
  };

  const handleCancelEvent = async (evtId) => {
    if (!window.confirm('האם אתה בטוח שברצונך לבטל אירוע זה? הודעת ביטול תישלח לרב לאישור קבלתה.')) return;
    const res = await cancelEvent(evtId);
    if (res.success) {
      setSelectedEventForView(null);
    } else {
      alert(res.error || 'שגיאה בביטול האירוע');
    }
  };

  const translateStatus = (status) => {
    switch (status) {
      case 'pending': return 'ממתין לאישור';
      case 'approved': return 'מאושר';
      case 'declined': return 'נדחה';
      case 'completed': return 'הסתיים (ממתין לדוח)';
      case 'reported': return 'דוח מולא';
      case 'canceled_pending': return 'בוטל (ממתין לאישור הרב)';
      case 'canceled': return 'בוטל ואושר';
      default: return status;
    }
  };

  const renderCalendarCells = () => {
    const cells = [];
    const simulatedDateStr = new Date(simulatedTime).toISOString().split('T')[0];

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="calendar-cell empty" style={{ opacity: 0.2 }} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.date === dateStr);
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
            {dayEvents.slice(0, 2).map(evt => {
              let badgeClass = 'status-pending';
              if (evt.status === 'approved') badgeClass = 'status-approved';
              if (evt.status === 'declined') badgeClass = 'status-declined';
              if (evt.status === 'completed') badgeClass = 'status-completed';
              if (evt.status === 'reported') badgeClass = 'status-reported';
              
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
            {dayEvents.length > 2 && (
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center' }}>
                +{dayEvents.length - 2} נוספים
              </div>
            )}
          </div>

          {/* Date Cell Tooltip */}
          {dayEvents.length > 0 && (
            <div className="calendar-cell-tooltip">
              <div style={{ fontWeight: 'bold', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '6px', color: '#fff' }}>
                אירועים ביום זה ({dayEvents.length})
              </div>
              {dayEvents.map(evt => {
                const rabbi = rabbis.find(r => r.id === evt.rabbiId);
                return (
                  <div key={evt.id} style={{ marginBottom: '8px', fontSize: '11px', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{evt.time}</span>
                      <span className={`status-badge status-${evt.status}`} style={{ fontSize: '8.5px', padding: '1px 4px' }}>
                        {translateStatus(evt.status)}
                      </span>
                    </div>
                    <div style={{ color: '#f8fafc', whiteSpace: 'normal', marginTop: '2px', fontWeight: 'bold' }}>{evt.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '1px' }}>👤 הרב: {rabbi?.name || 'לא משויך'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>📍 {evt.location}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );    }

    return cells;
  };

  return (
    <div className="main-panel">
      <div className="split-view">
        {/* Left Side: General Calendar */}
        <div className="calendar-container glass-card">
          <div className="calendar-header flex-between">
            <h2>📅 לוח שנה כללי - מזכירות</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={handlePrevMonth} style={{ padding: '6px 12px' }}>◀</button>
              <span style={{ fontWeight: 'bold', fontSize: '18px', minWidth: '110px', textAlign: 'center' }}>
                {monthNames[month]} {year}
              </span>
              <button type="button" className="btn btn-secondary" onClick={handleNextMonth} style={{ padding: '6px 12px' }}>▶</button>
            </div>
            <button className="btn btn-accent" onClick={() => openCreateModal()}>
              ➕ שיבוץ אירוע חדש
            </button>
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
            <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <div className="flex-between" style={{ marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px' }}>
                  🗓️ אירועים ביום {selectedDayEvents.dayNum} ב{monthNames[month]}:
                </h3>
                <button className="btn btn-accent" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => openCreateModal(selectedDayEvents.dateStr)}>
                  ➕ הוסף ליום זה
                </button>
              </div>

              {selectedDayEvents.events.length === 0 ? (
                <p className="empty-state">אין אירועים רשומים ביום זה.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedDayEvents.events.map(evt => (
                    <div 
                      key={evt.id} 
                      className="flex-between" 
                      style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '6px', cursor: 'pointer' }}
                      onClick={() => setSelectedEventForView(evt)}
                    >
                      <div>
                        <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>{evt.time}</span>
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

        {/* Right Side: Rabbi Staff list and stats */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3>👥 צוות הרבנים</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            רשימת הרבנים הזמינים לשיבוץ וסטטיסטיקות דיווחים.
          </p>

          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={() => {
              setRabbiError('');
              setRabbiSuccess('');
              setIsAddRabbiOpen(false);
              setIsRabbiManagementOpen(true);
            }}
          >
            ⚙️ ניהול רבנים (הוספה/מחיקה)
          </button>



          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rabbis.map(rabbi => {
              const rabbiEvents = events.filter(e => e.rabbiId === rabbi.id);
              const pendingCount = rabbiEvents.filter(e => e.status === 'pending').length;
              const completedCount = rabbiEvents.filter(e => e.status === 'reported').length;

              return (
                <div key={rabbi.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={rabbi.avatar} alt={rabbi.name} className="avatar" />
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-primary)' }}>{rabbi.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{rabbi.phone}</div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {getRabbiSpecialties(rabbi.name).map((spec, sIdx) => (
                          <span key={sIdx} style={{
                            fontSize: '10px',
                            background: '#F1F5F9',
                            color: 'var(--text-secondary)',
                            border: '1px solid #E2E8F0',
                            padding: '2px 6px',
                            borderRadius: '2px',
                            fontWeight: '600'
                          }}>
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'left', fontSize: '12px' }}>
                    <div style={{ color: 'var(--success)', fontWeight: 'bold' }}>דוחות: {completedCount}</div>
                    {pendingCount > 0 && <div style={{ color: 'var(--warning)', fontWeight: 'bold', marginTop: '4px' }}>ממתין: {pendingCount}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main events table list */}
      <div className="glass-card">
        <h3>📋 מעקב סטטוס כלל האירועים והרבנים <span style={{ display: 'inline-block', direction: 'ltr' }}>({events.length})</span></h3>
        <div style={{ overflowX: 'auto', marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '14px' }}>
                <th style={{ padding: '12px 8px' }}>אירוע</th>
                <th style={{ padding: '12px 8px' }}>תאריך ושעה</th>
                <th style={{ padding: '12px 8px' }}>הרב המשובץ</th>
                <th style={{ padding: '12px 8px' }}>מיקום</th>
                <th style={{ padding: '12px 8px' }}>לקוח</th>
                <th style={{ padding: '12px 8px' }}>סטטוס</th>
                <th style={{ padding: '12px 8px' }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {events.map(evt => {
                const rabbi = rabbis.find(r => r.id === evt.rabbiId);
                return (
                  <tr key={evt.id} style={{ borderBottom: '1px solid var(--glass-border)', fontSize: '14px' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{evt.title}</td>
                    <td style={{ padding: '12px 8px' }}>{evt.date} | {evt.time}</td>
                    <td style={{ padding: '12px 8px' }}>{rabbi?.name || 'לא משויך'}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{evt.location}</td>
                    <td style={{ padding: '12px 8px', fontSize: '13px' }}>
                      <div>{evt.clientName}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{evt.clientPhone}</div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span className={`status-badge status-${evt.status}`}>
                        {translateStatus(evt.status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setSelectedEventForView(evt)}>
                          צפה בפרטים
                        </button>
                        {evt.status !== 'canceled' && evt.status !== 'reported' && (
                          <>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '4px 10px', fontSize: '12px', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }} 
                              onClick={() => startEditEvent(evt)}
                            >
                              ✏️ ערוך
                            </button>
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '4px 10px', fontSize: '12px' }} 
                              onClick={() => handleCancelEvent(evt.id)}
                            >
                              ✕ בטל
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUBMITTED REPORTS SECTION */}
      <div className="glass-card">
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <div>
            <h3>📊 דוחות סיכום שהוגשו <span style={{ display: 'inline-block', direction: 'ltr' }}>({reportedEvents.length})</span></h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              צפייה בכל דוחות הסיכום שמולאו על ידי הרבנים עבור אירועים שהושלמו.
            </p>
          </div>
        </div>

        {reportedEvents.length === 0 ? (
          <p className="empty-state">טרם הוגשו דוחות סיכום על ידי הרבנים.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {reportedEvents.map(evt => {
              const rabbi = rabbis.find(r => r.id === evt.rabbiId);
              return (
                <div key={evt.id} style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  borderRight: '3px solid var(--success)',
                  transition: 'var(--transition-smooth)'
                }}>
                  {/* Report Card Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    {rabbi && <img src={rabbi.avatar} alt={rabbi.name} className="avatar" style={{ width: '32px', height: '32px' }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{evt.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        📅 {evt.date} | 📍 {evt.location}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>👤 {rabbi?.name || 'לא משויך'}</div>
                    </div>
                    <span className="status-badge status-reported" style={{ fontSize: '10px' }}>דוח מולא ✓</span>
                  </div>

                  {/* Report Metrics Grid */}
                  {evt.report && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 6px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase' }}>משתתפים</div>
                        <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#fff', marginTop: '2px' }}>{evt.report.participantsCount}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 6px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '9px', fontWeight: '600' }}>פולדרים תקינים</div>
                        <div style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--success)', marginTop: '2px' }}>{evt.report.validFoldersCount}</div>
                      </div>
                      <div style={{ background: 'rgba(16,185,129,0.06)', padding: '8px 6px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '9px', fontWeight: '600' }}>הו"ק שגויסו</div>
                        <div style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--success)', marginTop: '2px' }}>₪{evt.report.recurringDonationsTotal.toLocaleString()}</div>
                      </div>
                    </div>
                  )}

                  {/* Additional mini stats */}
                  {evt.report && (
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span>📝 טפסי תפילה: <strong style={{ color: 'var(--text-secondary)' }}>{evt.report.prayerFormsCount}</strong></span>
                      <span>📂 חסרי פרטים: <strong style={{ color: evt.report.incompleteFoldersCount > 0 ? 'var(--warning)' : 'var(--success)' }}>{evt.report.incompleteFoldersCount}</strong></span>
                      <span>🤝 מתעניינים: <strong style={{ color: 'var(--info)' }}>{evt.report.interestedInEventsCount}</strong></span>
                      <span>רשב"י: <strong style={{ color: evt.report.connectedToRashbi ? 'var(--success)' : 'var(--text-muted)' }}>{evt.report.connectedToRashbi ? '✓' : '✕'}</strong></span>
                      <span>טפסים נבדקו: <strong style={{ color: evt.report.formsVerified ? 'var(--success)' : 'var(--text-muted)' }}>{evt.report.formsVerified ? '✓' : '✕'}</strong></span>
                    </div>
                  )}

                  {/* Comments */}
                  {evt.report?.comments && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--glass-border)', marginBottom: '10px' }}>
                      <strong style={{ color: 'var(--text-muted)', fontSize: '10px' }}>💬 הערות הרב:</strong>
                      <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>{evt.report.comments}</div>
                    </div>
                  )}

                  <button 
                    className="btn btn-secondary" 
                    style={{ width: '100%', fontSize: '12px', padding: '6px' }} 
                    onClick={() => setSelectedEventForView(evt)}
                  >
                    🔍 צפה בפרטים המלאים
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE EVENT MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2>📅 שיבוץ אירוע חדש</h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsCreateModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCreateEventSubmit}>
              <div className="form-group">
                <label>כותרת האירוע *</label>
                <input 
                  type="text" 
                  value={formTitle} 
                  onChange={(e) => setFormTitle(e.target.value)} 
                  placeholder="לדוגמא: שיעור תורה וערב הפרשת חלה"
                  required 
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>תאריך *</label>
                  <input 
                    type="date" 
                    value={selectedDateStr} 
                    onChange={(e) => setSelectedDateStr(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>שעת התחלה *</label>
                  <input 
                    type="time" 
                    value={formTime} 
                    onChange={(e) => setFormTime(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>הרב המשובץ *</label>
                <select value={formRabbiId} onChange={(e) => setFormRabbiId(e.target.value)}>
                  {rabbis.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>מיקום האירוע *</label>
                <input 
                  type="text" 
                  value={formLocation} 
                  onChange={(e) => setFormLocation(e.target.value)} 
                  placeholder='שם האולם, בית כנסת או מתנ"ס'
                  required 
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>שם איש קשר (לקוח) *</label>
                  <input 
                    type="text" 
                    value={formClientName} 
                    onChange={(e) => setFormClientName(e.target.value)} 
                    placeholder="שם מלא"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>טלפון לקוח *</label>
                  <input 
                    type="tel" 
                    value={formClientPhone} 
                    onChange={(e) => setFormClientPhone(e.target.value)} 
                    placeholder="מספר טלפון"
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>דגשים מיוחדים</label>
                <textarea 
                  value={formDescription} 
                  onChange={(e) => setFormDescription(e.target.value)} 
                  placeholder="דגשים טכניים, בקשות מיוחדות של הלקוח וכדומה..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>ביטול</button>
                <button type="submit" className="btn btn-accent">שבץ אירוע ושלח הודעה לרב</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EVENT MODAL */}
      {isEditModalOpen && selectedEventForEdit && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2>✏️ עריכת פרטי אירוע</h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsEditModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleEditEventSubmit}>
              <div className="form-group">
                <label>כותרת האירוע *</label>
                <input 
                  type="text" 
                  value={editFormTitle} 
                  onChange={(e) => setEditFormTitle(e.target.value)} 
                  placeholder="לדוגמא: שיעור תורה וערב הפרשת חלה"
                  required 
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>תאריך *</label>
                  <input 
                    type="date" 
                    value={editFormDate} 
                    onChange={(e) => setEditFormDate(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>שעת התחלה *</label>
                  <input 
                    type="time" 
                    value={editFormTime} 
                    onChange={(e) => setEditFormTime(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>הרב המשובץ *</label>
                <select value={editFormRabbiId} onChange={(e) => setEditFormRabbiId(e.target.value)}>
                  {rabbis.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>מיקום האירוע *</label>
                <input 
                  type="text" 
                  value={editFormLocation} 
                  onChange={(e) => setEditFormLocation(e.target.value)} 
                  placeholder='שם האולם, בית כנסת או מתנ"ס'
                  required 
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>שם איש קשר (לקוח) *</label>
                  <input 
                    type="text" 
                    value={editFormClientName} 
                    onChange={(e) => setEditFormClientName(e.target.value)} 
                    placeholder="שם מלא"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>טלפון לקוח *</label>
                  <input 
                    type="tel" 
                    value={editFormClientPhone} 
                    onChange={(e) => setEditFormClientPhone(e.target.value)} 
                    placeholder="מספר טלפון"
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>דגשים מיוחדים</label>
                <textarea 
                  value={editFormDescription} 
                  onChange={(e) => setEditFormDescription(e.target.value)} 
                  placeholder="דגשים טכניים, בקשות מיוחדות של הלקוח וכדומה..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>ביטול</button>
                <button type="submit" className="btn btn-accent">שמור שינויים ושלח עדכון לרב</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW EVENT MODAL */}
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
                <div><strong>מיקום:</strong> {selectedEventForView.location}</div>
                <div><strong>הרב המשובץ:</strong> {rabbis.find(r => r.id === selectedEventForView.rabbiId)?.name}</div>
              </div>

              <div style={{ fontSize: '14px' }}>
                <strong>לקוח:</strong> {selectedEventForView.clientName} <span style={{ display: 'inline-block', direction: 'ltr' }}>({selectedEventForView.clientPhone})</span>
              </div>

              {selectedEventForView.description && (
                <div style={{ fontSize: '14px', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                  <strong>תיאור ודרישות:</strong>
                  <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>{selectedEventForView.description}</div>
                </div>
              )}

              {/* RABBIS REPORT IN SEC DIRECTORY VIEW */}
              {selectedEventForView.status === 'reported' && selectedEventForView.report && (
                <div className="report-view">
                  <h4 style={{ color: 'var(--success)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', paddingBottom: '6px' }}>
                    📝 דוח סיכום אירוע - הרב {rabbis.find(r => r.id === selectedEventForView.rabbiId)?.name}
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                    
                    <div className="report-view-field">
                      <span className="report-view-label">מספר משתתפים:</span>
                      <span style={{ fontWeight: 'bold' }}>{selectedEventForView.report.participantsCount}</span>
                    </div>

                    <div className="report-view-field">
                      <span className="report-view-label">פולדרים תקינים:</span>
                      <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{selectedEventForView.report.validFoldersCount}</span>
                    </div>

                    <div className="report-view-field">
                      <span className="report-view-label">חיבור למורשת רשב"י:</span>
                      <span style={{ fontWeight: 'bold', color: selectedEventForView.report.connectedToRashbi ? 'var(--success)' : 'var(--danger)' }}>
                        {selectedEventForView.report.connectedToRashbi ? 'כן' : 'לא'}
                      </span>
                    </div>

                    <div className="report-view-field">
                      <span className="report-view-label">פולדרים חסרי פרטים:</span>
                      <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>{selectedEventForView.report.incompleteFoldersCount}</span>
                    </div>

                    <div className="report-view-field">
                      <span className="report-view-label">טפסי שמות לתפילה:</span>
                      <span style={{ fontWeight: 'bold' }}>{selectedEventForView.report.prayerFormsCount}</span>
                    </div>

                    <div className="report-view-field">
                      <span className="report-view-label">מתעניינים בעריכת אירוע:</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--info)' }}>{selectedEventForView.report.interestedInEventsCount}</span>
                    </div>

                    <div className="report-view-field">
                      <span className="report-view-label">טפסים נבדקו ותקינים:</span>
                      <span style={{ fontWeight: 'bold', color: selectedEventForView.report.formsVerified ? 'var(--success)' : 'var(--danger)' }}>
                        {selectedEventForView.report.formsVerified ? 'כן' : 'לא'}
                      </span>
                    </div>

                    <div className="report-view-field" style={{ gridColumn: 'span 2', background: 'rgba(6, 95, 70, 0.05)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(6, 95, 70, 0.15)', marginTop: '4px' }}>
                      <span className="report-view-label" style={{ color: 'var(--text-primary)' }}>סך הוראות קבע שגויסו:</span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--success)' }}>
                        ₪{selectedEventForView.report.recurringDonationsTotal.toLocaleString()}
                      </span>
                    </div>

                    {selectedEventForView.report.comments && (
                      <div className="report-view-field" style={{ gridColumn: 'span 2', background: 'rgba(0,0,0,0.01)', padding: '8px', borderRadius: '4px', border: '1px solid var(--glass-border)', marginTop: '8px' }}>
                        <span className="report-view-label" style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>הערות וסיכום כללי:</span>
                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                          {selectedEventForView.report.comments}
                        </span>
                      </div>
                    )}

                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                {selectedEventForView.status !== 'canceled' && selectedEventForView.status !== 'reported' && (
                  <>
                    <button 
                      className="btn btn-accent" 
                      onClick={() => startEditEvent(selectedEventForView)}
                    >
                      ✏️ ערוך אירוע
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => handleCancelEvent(selectedEventForView.id)}
                    >
                      ✕ בטל אירוע
                    </button>
                  </>
                )}
                <button className="btn btn-secondary" onClick={() => setSelectedEventForView(null)}>סגור</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RABBI MANAGEMENT MODAL */}
      {isRabbiManagementOpen && (
        <div className="modal-overlay" onClick={() => setIsRabbiManagementOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2>{editingRabbi ? '✏️ עריכת פרטי רב' : isAddRabbiOpen ? '➕ הוספת רב חדש' : '⚙️ ניהול רבנים במערכת'}</h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsRabbiManagementOpen(false)}>✕</button>
            </div>

            {rabbiError && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: '#f87171', 
                padding: '10px', 
                borderRadius: '6px', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                marginBottom: '14px', 
                fontSize: '13px', 
                textAlign: 'center' 
              }}>
                {rabbiError}
              </div>
            )}

            {rabbiSuccess && (
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.1)', 
                color: '#34d399', 
                padding: '10px', 
                borderRadius: '6px', 
                border: '1px solid rgba(16, 185, 129, 0.2)', 
                marginBottom: '14px', 
                fontSize: '13px', 
                textAlign: 'center' 
              }}>
                {rabbiSuccess}
              </div>
            )}

            {editingRabbi ? (
              <form onSubmit={handleEditRabbiSubmit}>
                <div className="form-group">
                  <label>שם מלא *</label>
                  <input 
                    type="text" 
                    value={editRabbiName} 
                    onChange={(e) => setEditRabbiName(e.target.value)} 
                    placeholder="שם הרב"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>דואר אלקטרוני (שם משתמש להתחברות) *</label>
                  <input 
                    type="email" 
                    value={editRabbiEmail} 
                    onChange={(e) => setEditRabbiEmail(e.target.value)} 
                    placeholder="email@example.com"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>מספר טלפון *</label>
                  <input 
                    type="tel" 
                    value={editRabbiPhone} 
                    onChange={(e) => setEditRabbiPhone(e.target.value)} 
                    placeholder="050-0000000"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>כתובת הרב</label>
                  <input 
                    type="text" 
                    value={editRabbiAddress} 
                    onChange={(e) => setEditRabbiAddress(e.target.value)} 
                    placeholder="כתובת מלאה (רחוב, עיר)"
                  />
                </div>

                <div className="form-group">
                  <label>סיסמה חדשה (השאר ריק כדי לשמור על הסיסמה הקיימת)</label>
                  <input 
                    type="password" 
                    value={editRabbiPassword} 
                    onChange={(e) => setEditRabbiPassword(e.target.value)} 
                    placeholder="הזן סיסמה חדשה"
                  />
                </div>

                <div className="form-group">
                  <label>קישור לתמונת פרופיל (אופציונלי)</label>
                  <input 
                    type="url" 
                    value={editRabbiAvatar} 
                    onChange={(e) => setEditRabbiAvatar(e.target.value)} 
                    placeholder="https://..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setEditingRabbi(null);
                    setRabbiError('');
                  }}>
                    ביטול וחזרה
                  </button>
                  <button type="submit" className="btn btn-accent">שמור שינויים</button>
                </div>
              </form>
            ) : isAddRabbiOpen ? (
              <form onSubmit={handleAddRabbiSubmit}>
                <div className="form-group">
                  <label>שם מלא *</label>
                  <input 
                    type="text" 
                    value={newRabbiName} 
                    onChange={(e) => setNewRabbiName(e.target.value)} 
                    placeholder="שם הרב"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>דואר אלקטרוני (שם משתמש להתחברות) *</label>
                  <input 
                    type="email" 
                    value={newRabbiEmail} 
                    onChange={(e) => setNewRabbiEmail(e.target.value)} 
                    placeholder="email@example.com"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>מספר טלפון *</label>
                  <input 
                    type="tel" 
                    value={newRabbiPhone} 
                    onChange={(e) => setNewRabbiPhone(e.target.value)} 
                    placeholder="050-0000000"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>כתובת הרב</label>
                  <input 
                    type="text" 
                    value={newRabbiAddress} 
                    onChange={(e) => setNewRabbiAddress(e.target.value)} 
                    placeholder="כתובת מלאה (רחוב, עיר)"
                  />
                </div>

                <div className="form-group">
                  <label>סיסמה זמנית *</label>
                  <input 
                    type="password" 
                    value={newRabbiPassword} 
                    onChange={(e) => setNewRabbiPassword(e.target.value)} 
                    placeholder="מינימום 6 תווים"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>קישור לתמונת פרופיל (אופציונלי)</label>
                  <input 
                    type="url" 
                    value={newRabbiAvatar} 
                    onChange={(e) => setNewRabbiAvatar(e.target.value)} 
                    placeholder="https://..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setRabbiError('');
                    setIsAddRabbiOpen(false);
                  }}>
                    ביטול וחזרה
                  </button>
                  <button type="submit" className="btn btn-accent">שמור רב חדש</button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingLeft: '4px', marginBottom: '16px' }}>
                  {rabbis.length === 0 ? (
                    <p className="empty-state">אין רבנים רשומים במערכת.</p>
                  ) : (
                    rabbis.map(rabbi => (
                      <div key={rabbi.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={rabbi.avatar} alt={rabbi.name} className="avatar" />
                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>{rabbi.name}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              type="button" 
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}
                              onClick={() => startEditRabbi(rabbi)}
                            >
                              ✏️ ערוך
                            </button>
                            <button 
                              type="button"
                              className="btn btn-danger" 
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => handleDeleteRabbi(rabbi.id)}
                            >
                              מחק
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
                          <div><strong>📞 טלפון:</strong> {rabbi.phone}</div>
                          <div><strong>✉️ מייל:</strong> {rabbi.email}</div>
                          <div style={{ gridColumn: 'span 2' }}><strong>📍 כתובת:</strong> {rabbi.address || 'לא הוגדרה כתובת'}</div>
                          <div style={{ gridColumn: 'span 2', color: 'var(--warning)' }}><strong>🔑 סיסמה במערכת:</strong> <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>{rabbi.password_plain || 'לא ידועה'}</code></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '16px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setRabbiError('');
                    setRabbiSuccess('');
                    setIsRabbiManagementOpen(false);
                  }}>סגור</button>
                  <button 
                    type="button" 
                    className="btn btn-accent" 
                    onClick={() => {
                      setRabbiError('');
                      setRabbiSuccess('');
                      setIsAddRabbiOpen(true);
                    }}
                  >
                    ➕ הוסף רב חדש
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
}
