import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { getDbConnection, initDb } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'event_flow_super_secret_key_123';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// In-memory simulated time state (persisted to file database in settings/vars if needed, but in-memory is fine for dev sandbox)
let simulatedTime = new Date();

// Helper to load simulated time on startup
async function loadSimulatedTime() {
  try {
    const db = await getDbConnection();
    // Use notifications table latest time or default to now
    const latestNotif = await db.get('SELECT timestamp FROM notifications ORDER BY timestamp DESC LIMIT 1');
    if (latestNotif) {
      simulatedTime = new Date(latestNotif.timestamp);
    }
  } catch (e) {
    console.error('Could not load simulated time, defaulting to now', e);
  }
}

// Database startup initialization
async function startServer() {
  await initDb();
  await loadSimulatedTime();
  
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'פקודת אבטחה חסרה' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'פג תוקף האבטחה, נא להתחבר מחדש' });
    req.user = user;
    next();
  });
}

// WhatsApp Integration Helper (Green API)
async function sendWhatsAppMessage(recipientPhone, recipientName, message, eventId) {
  const db = await getDbConnection();
  const timestamp = new Date(simulatedTime).toISOString();
  const id = 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

  // Clean phone format: remove dashes, spaces, leading 0 to international format 972...
  let cleanPhone = recipientPhone.replace(/[-\s]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '972' + cleanPhone.substring(1);
  }

  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;

  let apiStatus = 'simulated';

  if (instanceId && token && instanceId !== 'YOUR_INSTANCE_ID' && token !== 'YOUR_TOKEN') {
    try {
      console.log(`[Green API] Sending real WhatsApp to ${cleanPhone}...`);
      const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${cleanPhone}@c.us`,
          message: message
        })
      });
      const data = await response.json();
      if (data && data.idMessage) {
        console.log(`[Green API] Message sent successfully! MsgId: ${data.idMessage}`);
        apiStatus = 'sent';
      } else {
        console.warn(`[Green API] Send failed:`, data);
      }
    } catch (err) {
      console.error('[Green API] Error calling WhatsApp API:', err);
    }
  } else {
    console.log(`[WhatsApp Simulation] To: ${recipientName} (${recipientPhone})\nMessage: ${message}`);
  }

  // Insert notification log to database (so frontend simulator can read it)
  await db.run(
    'INSERT INTO notifications (id, timestamp, type, recipientName, recipientContact, message, eventId) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, timestamp, 'whatsapp', recipientName, recipientPhone, message, eventId]
  );
  
  await db.close();
  return apiStatus;
}

// Helper to get SMTP settings from Settings table or dotenv fallback
async function getSmtpSettings(db) {
  const settingsRows = await db.all('SELECT * FROM settings WHERE key LIKE "smtp_%"');
  const config = {};
  settingsRows.forEach(row => {
    config[row.key] = row.value;
  });
  return {
    host: config.smtp_host || process.env.SMTP_HOST,
    port: parseInt(config.smtp_port || process.env.SMTP_PORT || '587'),
    secure: (config.smtp_secure === 'true') || (process.env.SMTP_SECURE === 'true') || (config.smtp_port === '465') || (process.env.SMTP_PORT === '465'),
    user: config.smtp_user || process.env.SMTP_USER,
    pass: config.smtp_pass || process.env.SMTP_PASS,
    from: config.smtp_from || process.env.SMTP_FROM || (config.smtp_user ? `"מערכת EventFlow" <${config.smtp_user}>` : `"מערכת EventFlow" <${process.env.SMTP_USER}>`)
  };
}

// Helper to build a premium HTML email template (RTL dark slate EventFlow style)
function buildEmailTemplate(title, bodyHtml, actionLink = null, actionLabel = null, secondActionLink = null, secondActionLabel = null) {
  let buttonsHtml = '';
  if (actionLink && actionLabel) {
    buttonsHtml += `
      <a href="${actionLink}" style="display: inline-block; padding: 12px 24px; margin: 10px 5px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; background-color: #3b82f6; border-radius: 8px; text-decoration: none; text-align: center; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);">${actionLabel}</a>
    `;
  }
  if (secondActionLink && secondActionLabel) {
    buttonsHtml += `
      <a href="${secondActionLink}" style="display: inline-block; padding: 12px 24px; margin: 10px 5px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; background-color: #ef4444; border-radius: 8px; text-decoration: none; text-align: center; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);">${secondActionLabel}</a>
    `;
  }

  return `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.06); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 20px; margin-bottom: 20px;">
        <span style="font-size: 28px; font-weight: bold; color: #3b82f6; text-shadow: 0 0 10px rgba(59, 130, 246, 0.3);">✨ ניהול ארועים</span>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">מערכת ניהול ושיבוץ אירועים</div>
      </div>
      
      <h2 style="font-size: 20px; color: #ffffff; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 8px;">${title}</h2>
      
      <div style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px;">
        ${bodyHtml}
      </div>
      
      ${buttonsHtml ? `
        <div style="text-align: center; margin-bottom: 30px; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 20px;">
          ${buttonsHtml}
        </div>
      ` : ''}
      
      <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 15px; font-size: 11px; color: #64748b;">
        נשלח באופן אוטומטי על ידי מערכת ניהול ארועים. נא לא להשיב למייל זה.
      </div>
    </div>
  `;
}

// Email integration Helper
async function sendEmailMessage(recipientName, recipientContact, message, eventId, html = null) {
  const db = await getDbConnection();
  const timestamp = new Date(simulatedTime).toISOString();
  const id = 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

  const smtp = await getSmtpSettings(db);

  let isRealEmailSent = false;

  if (smtp.host && smtp.user && smtp.pass) {
    try {
      console.log(`[SMTP] Sending real email to ${recipientContact}...`);
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
          user: smtp.user,
          pass: smtp.pass
        }
      });

      await transporter.sendMail({
        from: smtp.from,
        to: recipientContact,
        subject: `תזכורת ועדכון EventFlow: ${message.split('\n')[0]}`,
        text: message,
        html: html || undefined
      });
      console.log(`[SMTP] Email successfully sent to ${recipientContact}`);
      isRealEmailSent = true;
    } catch (err) {
      console.error('[SMTP] Failed to send real email, falling back to simulation:', err);
    }
  }

  if (!isRealEmailSent) {
    console.log(`[Email Simulation] To: ${recipientName} (${recipientContact})\nMessage: ${message}`);
  }

  await db.run(
    'INSERT INTO notifications (id, timestamp, type, recipientName, recipientContact, message, eventId) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, timestamp, 'email', recipientName, recipientContact, message, eventId]
  );

  await db.close();
}

// Run Automations Scheduler checks (equiv to hourly cron)
async function runAutoTriggers(db, currentTime) {
  // Query all active events
  const events = await db.all('SELECT * FROM events WHERE status IN ("approved", "completed")');
  const rabbis = await db.all('SELECT * FROM rabbis');

  for (const evt of events) {
    const eventStart = new Date(evt.date + 'T' + evt.time);
    const rabbi = rabbis.find(r => r.id === evt.rabbiId);
    if (!rabbi) continue;

    // 1. Reminder 24 hours before
    const oneDayBefore = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000);
    if (evt.status === 'approved' && evt.reminderSent === 0 && currentTime >= oneDayBefore && currentTime < eventStart) {
      await db.run('UPDATE events SET reminderSent = 1 WHERE id = ?', [evt.id]);
      const msg = `תזכורת: שלום כבוד הרב ${rabbi.name}, מחר בשעה ${evt.time} יתקיים האירוע "${evt.title}" ב-${evt.location}. בהצלחה!`;
      await sendWhatsAppMessage(rabbi.phone, rabbi.name, msg, evt.id);
      
      const emailMsg = `שלום כבוד הרב ${rabbi.name},\nתזכורת: מחר בשעה ${evt.time} יתקיים האירוע "${evt.title}" ב-${evt.location}.\nבברכה,\nמשרד EventFlow`;
      
      const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
      const htmlContent = buildEmailTemplate(
        'תזכורת: מחר יתקיים האירוע שלך',
        `<p>שלום כבוד הרב <strong>${rabbi.name}</strong>,</p>
         <p>זוהי תזכורת לקראת האירוע המשויך אליך מחר:</p>
         <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); margin: 15px 0; color: #cbd5e1;">
           <div style="margin-bottom: 8px;"><strong>אירוע:</strong> ${evt.title}</div>
           <div style="margin-bottom: 8px;"><strong>תאריך:</strong> ${evt.date} (מחר)</div>
           <div style="margin-bottom: 8px;"><strong>שעה:</strong> ${evt.time}</div>
           <div style="margin-bottom: 8px;"><strong>מיקום:</strong> ${evt.location}</div>
           <div style="margin-bottom: 8px;"><strong>שם הלקוח:</strong> ${evt.clientName} (${evt.clientPhone})</div>
           ${evt.description ? `<div style="margin-bottom: 8px;"><strong>דגשים:</strong> ${evt.description}</div>` : ''}
         </div>
         <p>נאחל לך בהצלחה רבה באירוע!</p>`,
        `${BASE_URL}/`,
        'כניסה לאזור האישי'
      );
      await sendEmailMessage(rabbi.name, rabbi.email, emailMsg, evt.id, htmlContent);
    }

    // 2. Mark completed when event ends (duration 3 hours)
    const eventDurationMs = 3 * 60 * 60 * 1000;
    const eventEnd = new Date(eventStart.getTime() + eventDurationMs);
    if (evt.status === 'approved' && currentTime >= eventEnd) {
      await db.run('UPDATE events SET status = "completed" WHERE id = ?', [evt.id]);
    }

    // 3. Prompt for report 2 hours after event end, and then every 12 hours until report is filled
    const hoursOffset = evt.reportPromptSent === 0 ? 2 : (2 + 12 * evt.reportPromptSent);
    const promptTime = new Date(eventEnd.getTime() + hoursOffset * 60 * 60 * 1000);
    
    if (evt.status === 'completed' && currentTime >= promptTime) {
      const nextPromptCount = evt.reportPromptSent + 1;
      await db.run('UPDATE events SET reportPromptSent = ? WHERE id = ?', [nextPromptCount, evt.id]);
      
      const msg = `שלום כבוד הרב ${rabbi.name},\nהאירוע "${evt.title}" הסתיים. נא להיכנס למערכת למילוי דוח סיכום האירוע: https://eventflow.co.il/report/${evt.id}`;
      await sendWhatsAppMessage(rabbi.phone, rabbi.name, msg, evt.id);

      const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
      const emailMsg = `שלום כבוד הרב ${rabbi.name},\nהאירוע "${evt.title}" הסתיים. נא להיכנס למערכת למילוי דוח סיכום האירוע.\nקישור: ${BASE_URL}/`;
      
      const htmlContent = buildEmailTemplate(
        'תזכורת: מילוי דוח סיכום אירוע',
        `<p>שלום כבוד הרב <strong>${rabbi.name}</strong>,</p>
         <p>האירוע <strong>"${evt.title}"</strong> שהתקיים ב-${evt.date} ב-${evt.location} הסתיים בהצלחה.</p>
         <p>נשמח אם תוכל להיכנס למערכת ולמלא את דוח סיכום האירוע (הכולל את כמות המשתתפים, תרומות וטפסים שנאספו).</p>
         <p style="font-size: 12px; color: #64748b; margin-top: 10px;">* תזכורת זו תישלח אליך מדי 12 שעות עד להשלמת הגשת הדוח במערכת.</p>`,
        `${BASE_URL}/`,
        '✍️ מלא דוח סיכום במערכת'
      );
      
      await sendEmailMessage(rabbi.name, rabbi.email, emailMsg, evt.id, htmlContent);
    }
  }
}

// API Routes

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'נא להזין דוא"ל וסיסמה' });
  }

  // Secretary Hardcoded Credential check
  const officeEmail = process.env.OFFICE_EMAIL || 'office@eventflow.co.il';
  const officePass = process.env.OFFICE_PASSWORD || 'admin123';

  if (email === officeEmail && password === officePass) {
    const token = jwt.sign({ id: 'office', role: 'secretary', email: officeEmail }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({
      token,
      user: { id: 'office', role: 'secretary', name: 'מזכירות הארגון', email: officeEmail }
    });
  }

  // Rabbi database query
  try {
    const db = await getDbConnection();
    const rabbi = await db.get('SELECT * FROM rabbis WHERE email = ?', [email]);
    if (!rabbi) {
      await db.close();
      return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
    }

    const passMatch = bcrypt.compareSync(password, rabbi.password);
    if (!passMatch) {
      await db.close();
      return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
    }

    const token = jwt.sign({ id: rabbi.id, role: 'rabbi', email: rabbi.email }, JWT_SECRET, { expiresIn: '30d' });
    await db.close();

    return res.json({
      token,
      user: { id: rabbi.id, role: 'rabbi', name: rabbi.name, email: rabbi.email, avatar: rabbi.avatar }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// Fetch current user details
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  if (req.user.role === 'secretary') {
    const officeEmail = process.env.OFFICE_EMAIL || 'office@eventflow.co.il';
    return res.json({
      id: 'office',
      role: 'secretary',
      name: 'מזכירות הארגון',
      email: officeEmail
    });
  }

  try {
    const db = await getDbConnection();
    const rabbi = await db.get('SELECT id, name, email, phone, avatar FROM rabbis WHERE id = ?', [req.user.id]);
    await db.close();
    if (!rabbi) {
      return res.status(404).json({ error: 'המשתמש לא נמצא במערכת' });
    }
    return res.json({
      id: rabbi.id,
      role: 'rabbi',
      name: rabbi.name,
      email: rabbi.email,
      avatar: rabbi.avatar
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
  }
});

// Google Auth Sign-In (Rabbis only)
app.post('/api/auth/google', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'כתובת האימייל של Google חסרה' });
  }

  const officeEmail = process.env.OFFICE_EMAIL || 'office@eventflow.co.il';
  if (email.toLowerCase() === officeEmail.toLowerCase()) {
    return res.status(403).json({ error: 'התחברות באמצעות Google מוגבלת לרבנים בלבד' });
  }

  try {
    const db = await getDbConnection();
    const rabbi = await db.get('SELECT * FROM rabbis WHERE email = ?', [email]);
    await db.close();
    
    if (!rabbi) {
      return res.status(404).json({ error: 'חשבון Google זה אינו רשום במערכת כרב. אנא פנה למזכירות להוספת החשבון במערכת.' });
    }

    const token = jwt.sign({ id: rabbi.id, role: 'rabbi', email: rabbi.email }, JWT_SECRET, { expiresIn: '30d' });
    
    return res.json({
      token,
      user: { id: rabbi.id, role: 'rabbi', name: rabbi.name, email: rabbi.email, avatar: rabbi.avatar }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת פנימית במהלך התחברות Google' });
  }
});

// Fetch Rabbis list
app.get('/api/rabbis', authenticateToken, async (req, res) => {
  try {
    const db = await getDbConnection();
    const list = await db.all('SELECT id, name, email, phone, address, password_plain, avatar FROM rabbis');
    await db.close();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת רבנים' });
  }
});

// Create new Rabbi (Secretary only)
app.post('/api/rabbis', authenticateToken, async (req, res) => {
  if (req.user.role !== 'secretary') {
    return res.status(403).json({ error: 'פעולה זו מורשית למזכירות בלבד' });
  }
  
  const { name, email, phone, address, avatar, password } = req.body;
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: 'נא להזין את כל שדות החובה (שם, אימייל, טלפון, סיסמה)' });
  }

  try {
    const db = await getDbConnection();
    // Check if email already exists
    const existing = await db.get('SELECT * FROM rabbis WHERE email = ?', [email]);
    if (existing) {
      await db.close();
      return res.status(400).json({ error: 'כתובת אימייל זו כבר רשומה במערכת' });
    }

    const id = 'rabbi-' + Date.now();
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const avatarUrl = avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80';

    await db.run(
      'INSERT INTO rabbis (id, name, email, phone, address, password_plain, avatar, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, email, phone, address || '', password, avatarUrl, hash]
    );

    await db.close();
    res.status(201).json({ message: 'הרב נוסף בהצלחה למערכת', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בהוספת הרב למערכת' });
  }
});

// Update Rabbi (Secretary only)
app.put('/api/rabbis/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'secretary') {
    return res.status(403).json({ error: 'פעולה זו מורשית למזכירות בלבד' });
  }

  const { id } = req.params;
  const { name, email, phone, address, avatar, password } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'שם, אימייל וטלפון הם שדות חובה' });
  }

  try {
    const db = await getDbConnection();
    
    // Check if email already exists on a different rabbi
    const existing = await db.get('SELECT * FROM rabbis WHERE email = ? AND id != ?', [email, id]);
    if (existing) {
      await db.close();
      return res.status(400).json({ error: 'כתובת אימייל זו כבר משויכת לרב אחר במערכת' });
    }

    if (password) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      await db.run(
        'UPDATE rabbis SET name = ?, email = ?, phone = ?, address = ?, password_plain = ?, avatar = ?, password = ? WHERE id = ?',
        [name, email, phone, address || '', password, avatar || '', hash, id]
      );
    } else {
      await db.run(
        'UPDATE rabbis SET name = ?, email = ?, phone = ?, address = ?, avatar = ? WHERE id = ?',
        [name, email, phone, address || '', avatar || '', id]
      );
    }

    await db.close();
    res.json({ message: 'פרטי הרב עודכנו בהצלחה' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בעדכון פרטי הרב' });
  }
});

// Delete Rabbi (Secretary only)
app.delete('/api/rabbis/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'secretary') {
    return res.status(403).json({ error: 'פעולה זו מורשית למזכירות בלבד' });
  }

  const { id } = req.params;

  try {
    const db = await getDbConnection();
    
    // Check if Rabbi has assigned events
    const eventsCount = await db.get('SELECT COUNT(*) as count FROM events WHERE rabbiId = ?', [id]);
    if (eventsCount.count > 0) {
      await db.close();
      return res.status(400).json({ error: 'לא ניתן למחוק רב שיש לו אירועים משויכים במערכת. יש להעביר את אירועיו לרב אחר תחילה.' });
    }

    await db.run('DELETE FROM rabbis WHERE id = ?', [id]);
    await db.close();
    res.json({ message: 'הרב הוסר בהצלחה מהמערכת' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה במחיקת הרב מהמערכת' });
  }
});

// Fetch events list (Filtered by roles)
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const db = await getDbConnection();
    let events = [];

    if (req.user.role === 'secretary') {
      events = await db.all('SELECT * FROM events');
    } else {
      events = await db.all('SELECT * FROM events WHERE rabbiId = ?', [req.user.id]);
    }

    // Embed reports for events
    const reports = await db.all('SELECT * FROM reports');
    const mappedEvents = events.map(evt => {
      const report = reports.find(r => r.eventId === evt.id);
      return {
        ...evt,
        // Match frontend boolean model
        reminderSent: evt.reminderSent === 1,
        reportPromptSent: evt.reportPromptSent === 1,
        isUpdated: evt.isUpdated === 1,
        report: report ? {
          ...report,
          connectedToRashbi: report.connectedToRashbi === 1,
          formsVerified: report.formsVerified === 1
        } : null
      };
    });

    await db.close();
    res.json(mappedEvents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשליפת אירועים' });
  }
});

// Secretary Create event
app.post('/api/events', authenticateToken, async (req, res) => {
  if (req.user.role !== 'secretary') {
    return res.status(403).json({ error: 'פעולה זו מורשית למזכירות בלבד' });
  }

  const { title, date, time, rabbiId, location, clientName, clientPhone, description } = req.body;
  if (!title || !date || !time || !rabbiId || !location || !clientName || !clientPhone) {
    return res.status(400).json({ error: 'נא להזין את כל שדות החובה' });
  }

  // Validate that event is not in the past relative to simulatedTime
  const eventStart = new Date(date + 'T' + time);
  if (eventStart < simulatedTime) {
    return res.status(400).json({ error: 'לא ניתן לקבוע אירוע בתאריך ושעה שעברו' });
  }

  try {
    const db = await getDbConnection();
    const eventId = 'evt-' + Date.now();

    await db.run(`
      INSERT INTO events (id, title, date, time, rabbiId, location, clientName, clientPhone, description, status, reminderSent, reportPromptSent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "pending", 0, 0)
    `, [eventId, title, date, time, rabbiId, location, clientName, clientPhone, description]);

    // Send WhatsApp notification
    const rabbi = await db.get('SELECT * FROM rabbis WHERE id = ?', [rabbiId]);
    if (rabbi) {
      const msg = `שלום כבוד הרב ${rabbi.name},\nשובצת לאירוע חדש בארגון: "${title}" בתאריך ${date} בשעה ${time}.\nלפרטים ואישור האירוע: https://eventflow.co.il/approve/${eventId}`;
      await sendWhatsAppMessage(rabbi.phone, rabbi.name, msg, eventId);

      // Send HTML Email to the Rabbi with direct action buttons
      const emailBody = `שלום כבוד הרב ${rabbi.name},\nשובצת לאירוע חדש בארגון: "${title}" בתאריך ${date} בשעה ${time} ב-${location}.\nאנא כנס לאתר לאישור האירוע.`;
      
      const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
      const approveLink = `${BASE_URL}/api/events/public/${eventId}/approve`;
      const declineLink = `${BASE_URL}/api/events/public/${eventId}/decline`;

      const htmlContent = buildEmailTemplate(
        'שיבוץ חדש ממתין לאישורך',
        `<p>שלום כבוד הרב <strong>${rabbi.name}</strong>,</p>
         <p>שובצת לאירוע חדש במערכת ומזכירות הארגון ממתינה לאישורך:</p>
         <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); margin: 15px 0; color: #cbd5e1;">
           <div style="margin-bottom: 8px;"><strong>אירוע:</strong> ${title}</div>
           <div style="margin-bottom: 8px;"><strong>תאריך:</strong> ${date}</div>
           <div style="margin-bottom: 8px;"><strong>שעה:</strong> ${time}</div>
           <div style="margin-bottom: 8px;"><strong>מיקום:</strong> ${location}</div>
           ${description ? `<div style="margin-bottom: 8px;"><strong>דגשים נוספים:</strong> ${description}</div>` : ''}
         </div>
         <p>נא אשר או דחה את ההזמנה באמצעות הכפתורים הבאים:</p>`,
        approveLink,
        '✓ אשר אירוע',
        declineLink,
        '✕ דחה אירוע'
      );

      await sendEmailMessage(rabbi.name, rabbi.email, emailBody, eventId, htmlContent);
    }

    await db.close();
    res.status(201).json({ message: 'אירוע שובץ בהצלחה', eventId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשיבוץ אירוע' });
  }
});

// Secretary Update event details (Reset status to pending and re-notify Rabbi)
app.put('/api/events/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'secretary') {
    return res.status(403).json({ error: 'פעולה זו מורשית למזכירות בלבד' });
  }

  const { id } = req.params;
  const { title, date, time, rabbiId, location, clientName, clientPhone, description } = req.body;

  if (!title || !date || !time || !rabbiId || !location || !clientName || !clientPhone) {
    return res.status(400).json({ error: 'נא להזין את כל שדות החובה' });
  }

  try {
    const db = await getDbConnection();
    const existing = await db.get('SELECT * FROM events WHERE id = ?', [id]);
    if (!existing) {
      await db.close();
      return res.status(404).json({ error: 'אירוע לא נמצא' });
    }

    // Update in database and reset status to pending
    await db.run(`
      UPDATE events 
      SET title = ?, date = ?, time = ?, rabbiId = ?, location = ?, clientName = ?, clientPhone = ?, description = ?, status = "pending", reminderSent = 0, reportPromptSent = 0, isUpdated = 1
      WHERE id = ?
    `, [title, date, time, rabbiId, location, clientName, clientPhone, description, id]);

    // Send notifications to the assigned Rabbi
    const rabbi = await db.get('SELECT * FROM rabbis WHERE id = ?', [rabbiId]);
    if (rabbi) {
      const msg = `שלום כבוד הרב ${rabbi.name},\nעודכנו פרטי האירוע "${title}" ליום ${date} בשעה ${time}.\nלפרטים ואישור האירוע המעודכן: https://eventflow.co.il/approve/${id}`;
      await sendWhatsAppMessage(rabbi.phone, rabbi.name, msg, id);

      const emailBody = `שלום כבוד הרב ${rabbi.name},\nעודכנו פרטי האירוע "${title}" ליום ${date} בשעה ${time} ב-${location}.\nאנא כנס לאשר את הפרטים החדשים.`;
      
      const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
      const approveLink = `${BASE_URL}/api/events/public/${id}/approve`;
      const declineLink = `${BASE_URL}/api/events/public/${id}/decline`;

      const htmlContent = buildEmailTemplate(
        'עודכנו פרטי האירוע שלך - נדרש אישור מחדש',
        `<p>שלום כבוד הרב <strong>${rabbi.name}</strong>,</p>
         <p>מזכירות הארגון עדכנה את פרטי האירוע המשויך אליך. נדרש אישורך מחדש לפרטים המעודכנים:</p>
         <div style="background: rgba(15, 23, 42, 0.05); padding: 15px; border-radius: 4px; border: 1px solid #E2E8F0; margin: 15px 0; color: #1E293B;">
           <div style="margin-bottom: 8px;"><strong>אירוע:</strong> ${title}</div>
           <div style="margin-bottom: 8px;"><strong>תאריך מעודכן:</strong> ${date}</div>
           <div style="margin-bottom: 8px;"><strong>שעה מעודכנת:</strong> ${time}</div>
           <div style="margin-bottom: 8px;"><strong>מיקום מעודכן:</strong> ${location}</div>
           ${description ? `<div style="margin-bottom: 8px;"><strong>דגשים:</strong> ${description}</div>` : ''}
         </div>
         <p>נא אשר או דחה את השיבוץ המעודכן באמצעות הכפתורים הבאים:</p>`,
        approveLink,
        '✓ אשר פרטים מעודכנים',
        declineLink,
        '✕ דחה שיבוץ'
      );

      await sendEmailMessage(rabbi.name, rabbi.email, emailBody, id, htmlContent);
    }

    await db.close();
    res.json({ message: 'האירוע עודכן בהצלחה והודעה נשלחה לרב' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בעדכון האירוע' });
  }
});

// Secretary Cancel event (Set status to canceled_pending and notify Rabbi)
app.put('/api/events/:id/cancel', authenticateToken, async (req, res) => {
  if (req.user.role !== 'secretary') {
    return res.status(403).json({ error: 'פעולה זו מורשית למזכירות בלבד' });
  }

  const { id } = req.params;

  try {
    const db = await getDbConnection();
    const event = await db.get('SELECT * FROM events WHERE id = ?', [id]);
    if (!event) {
      await db.close();
      return res.status(404).json({ error: 'אירוע לא נמצא' });
    }

    // Update status to canceled_pending
    await db.run('UPDATE events SET status = "canceled_pending" WHERE id = ?', [id]);

    // Send notifications to the assigned Rabbi
    const rabbi = await db.get('SELECT * FROM rabbis WHERE id = ?', [event.rabbiId]);
    if (rabbi) {
      const msg = `שלום כבוד הרב ${rabbi.name},\nהאירוע "${event.title}" שהיה מתוכנן ליום ${event.date} בשעה ${event.time} בוטל על ידי המזכירות.\nאנא כנס לאשר את קבלת הודעת הביטול: https://eventflow.co.il/confirm-cancel/${id}`;
      await sendWhatsAppMessage(rabbi.phone, rabbi.name, msg, id);

      const emailBody = `שלום כבוד הרב ${rabbi.name},\nהאירוע "${event.title}" שהיה מתוכנן ליום ${event.date} בשעה ${event.time} בוטל על ידי המזכירות.\nאנא אשר את קבלת הודעת הביטול.`;
      
      const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
      const confirmCancelLink = `${BASE_URL}/api/events/public/${id}/confirm-cancel`;

      const htmlContent = buildEmailTemplate(
        'הודעת ביטול אירוע - נדרש אישור קבלה',
        `<p>שלום כבוד הרב <strong>${rabbi.name}</strong>,</p>
         <p>מזכירות הארגון מבקשת להודיעך כי האירוע הבא בוטל:</p>
         <div style="background: rgba(220, 38, 38, 0.05); padding: 15px; border-radius: 4px; border: 1px solid #FCA5A5; margin: 15px 0; color: #991B1B;">
           <div style="margin-bottom: 8px;"><strong>אירוע:</strong> ${event.title}</div>
           <div style="margin-bottom: 8px;"><strong>תאריך מתוכנן:</strong> ${event.date}</div>
           <div style="margin-bottom: 8px;"><strong>שעה מתוכננת:</strong> ${event.time}</div>
           <div style="margin-bottom: 8px;"><strong>מיקום מתוכנן:</strong> ${event.location}</div>
         </div>
         <p>נא אשר את קבלת הודעת הביטול באמצעות הכפתור הבא:</p>`,
        confirmCancelLink,
        '✓ אשר קבלת הודעת ביטול'
      );

      await sendEmailMessage(rabbi.name, rabbi.email, emailBody, id, htmlContent);
    }

    await db.close();
    res.json({ message: 'האירוע בוטל בהצלחה והודעת ביטול נשלחה לרב' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בביטול האירוע' });
  }
});

// Public direct event cancel confirmation endpoint (without token, for email action buttons)
app.get('/api/events/public/:id/confirm-cancel', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDbConnection();
    const event = await db.get('SELECT * FROM events WHERE id = ?', [id]);
    if (!event) {
      await db.close();
      return res.status(404).send(renderResponsePage('שגיאה', 'האירוע לא נמצא במערכת.', false));
    }

    if (event.status !== 'canceled_pending') {
      await db.close();
      return res.send(renderResponsePage('הביטול כבר אושר', `האירוע נמצא כעת בסטטוס: ${translateStatusHeb(event.status)}`, true));
    }

    await db.run('UPDATE events SET status = "canceled" WHERE id = ?', [id]);
    
    // Log notification update
    const rabbi = await db.get('SELECT * FROM rabbis WHERE id = ?', [event.rabbiId]);
    if (rabbi) {
      const timestamp = new Date().toISOString();
      const notifId = 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      await db.run(
        'INSERT INTO notifications (id, timestamp, type, recipientName, recipientContact, message, eventId) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [notifId, timestamp, 'email', 'מזכירות הארגון', process.env.OFFICE_EMAIL || 'office@eventflow.co.il', `אישור ביטול במייל: הרב ${rabbi.name} אישר את קבלת הודעת הביטול של האירוע "${event.title}".`, id]
      );
    }
    
    await db.close();
    res.send(renderResponsePage('קבלת הביטול אושרה', `אישרת בהצלחה את קבלת הודעת הביטול עבור האירוע "${event.title}". תודה רבה!`, true));
  } catch (err) {
    console.error(err);
    res.status(500).send(renderResponsePage('שגיאה', 'שגיאת שרת פנימית.', false));
  }
});

// Update event status (Approve / Decline)
app.put('/api/events/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'approved' && status !== 'declined' && status !== 'canceled') {
    return res.status(400).json({ error: 'סטטוס שגוי' });
  }

  try {
    const db = await getDbConnection();
    const evt = await db.get('SELECT * FROM events WHERE id = ?', [id]);
    if (!evt) {
      await db.close();
      return res.status(404).json({ error: 'אירוע לא נמצא' });
    }

    // Security validation
    if (req.user.role === 'rabbi' && evt.rabbiId !== req.user.id) {
      await db.close();
      return res.status(403).json({ error: 'אין לך הרשאה לערוך אירוע זה' });
    }

    await db.run('UPDATE events SET status = ?, isUpdated = 0 WHERE id = ?', [status, id]);
    
    // Notify secretary by email log
    const rabbi = await db.get('SELECT * FROM rabbis WHERE id = ?', [evt.rabbiId]);
    if (rabbi) {
      let statusText = '';
      if (status === 'approved') statusText = 'אישר';
      else if (status === 'declined') statusText = 'דחה';
      else if (status === 'canceled') statusText = 'אישר קבלת ביטול';
      
      const msg = `עדכון למזכירות: כבוד הרב ${rabbi.name} ${statusText} את האירוע "${evt.title}" (${evt.date}).`;
      await sendEmailMessage('מזכירות הארגון', 'office@eventflow.co.il', msg, id);
    }

    await db.close();
    res.json({ message: 'סטטוס אירוע עודכן בהצלחה' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בעדכון האירוע' });
  }
});

// Fetch simulated time
app.get('/api/time', (req, res) => {
  res.json({ simulatedTime: simulatedTime.toISOString() });
});

// Fetch notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const db = await getDbConnection();
    const list = await db.all('SELECT * FROM notifications ORDER BY timestamp DESC');
    await db.close();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשליפת התראות' });
  }
});

// Submit event report
app.post('/api/events/:id/report', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    participantsCount,
    connectedToRashbi,
    validFoldersCount,
    incompleteFoldersCount,
    prayerFormsCount,
    interestedInEventsCount,
    formsVerified,
    recurringDonationsTotal,
    comments
  } = req.body;

  try {
    const db = await getDbConnection();
    
    // Verify event exists
    const evt = await db.get('SELECT * FROM events WHERE id = ?', [id]);
    if (!evt) {
      await db.close();
      return res.status(404).json({ error: 'אירוע לא נמצא' });
    }

    // If rabbi, verify this is their event
    if (req.user.role === 'rabbi' && evt.rabbiId !== req.user.id) {
      await db.close();
      return res.status(403).json({ error: 'אין לך הרשאה להגיש דוח לאירוע זה' });
    }

    // Check if report already exists
    const existingReport = await db.get('SELECT * FROM reports WHERE eventId = ?', [id]);
    if (existingReport) {
      await db.close();
      return res.status(400).json({ error: 'כבר הוגש דוח עבור אירוע זה' });
    }

    // Insert report
    await db.run(`
      INSERT INTO reports (
        eventId, participantsCount, connectedToRashbi, validFoldersCount, 
        incompleteFoldersCount, prayerFormsCount, interestedInEventsCount, 
        formsVerified, recurringDonationsTotal, comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      participantsCount,
      connectedToRashbi ? 1 : 0,
      validFoldersCount,
      incompleteFoldersCount,
      prayerFormsCount,
      interestedInEventsCount,
      formsVerified ? 1 : 0,
      recurringDonationsTotal,
      comments || null
    ]);

    // Update event status to 'reported'
    await db.run('UPDATE events SET status = "reported" WHERE id = ?', [id]);

    // Fetch Rabbi name for notification message
    const rabbi = await db.get('SELECT * FROM rabbis WHERE id = ?', [evt.rabbiId]);
    if (rabbi) {
      const msg = `עדכון למזכירות: כבוד הרב ${rabbi.name} הגיש דוח סיכום עבור האירוע "${evt.title}".`;
      await sendEmailMessage('מזכירות הארגון', 'office@eventflow.co.il', msg, id);
    }

    await db.close();
    res.status(201).json({ message: 'דוח סיכום הוגש בהצלחה' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בהגשת דוח' });
  }
});

// Advance simulated time
app.post('/api/time/advance', async (req, res) => {
  const { amount, unit } = req.body;
  if (!amount || !unit) {
    return res.status(400).json({ error: 'חסרים פרטים לקידום הזמן' });
  }

  let next = new Date(simulatedTime);
  if (unit === 'hours') {
    next.setHours(next.getHours() + amount);
  }

  if (unit === 'days') {
    next.setDate(next.getDate() + amount);
  }
  simulatedTime = next;

  // Process triggers
  try {
    const db = await getDbConnection();
    await runAutoTriggers(db, simulatedTime);
    await db.close();
  } catch (err) {
    console.error('Error running automated triggers:', err);
  }

  res.json({ simulatedTime: simulatedTime.toISOString() });
});

// Reset database
app.post('/api/time/reset', async (req, res) => {
  try {
    const db = await getDbConnection();
    // Drop all tables
    await db.exec('DROP TABLE IF EXISTS reports');
    await db.exec('DROP TABLE IF EXISTS notifications');
    await db.exec('DROP TABLE IF EXISTS events');
    await db.exec('DROP TABLE IF EXISTS rabbis');
    await db.close();

    // Re-initialize and seed
    await initDb();
    simulatedTime = new Date();
    
    res.json({ message: 'מערכת אותחלה מחדש בהצלחה' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה באתחול המערכת' });
  }
});


// Fetch SMTP settings (Secretary only)
app.get('/api/settings/smtp', authenticateToken, async (req, res) => {
  if (req.user.role !== 'secretary') {
    return res.status(403).json({ error: 'פעולה זו מורשית למזכירות בלבד' });
  }

  try {
    const db = await getDbConnection();
    const smtp = await getSmtpSettings(db);
    await db.close();

    res.json({
      smtp_host: smtp.host || '',
      smtp_port: smtp.port || 587,
      smtp_secure: smtp.secure,
      smtp_user: smtp.user || '',
      smtp_from: smtp.from || '',
      is_password_set: !!smtp.pass
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשליפת הגדרות דואר' });
  }
});

// Update SMTP settings (Secretary only)
app.post('/api/settings/smtp', authenticateToken, async (req, res) => {
  if (req.user.role !== 'secretary') {
    return res.status(403).json({ error: 'פעולה זו מורשית למזכירות בלבד' });
  }

  const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from } = req.body;

  try {
    const db = await getDbConnection();
    
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES ("smtp_host", ?)', [smtp_host || '']);
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES ("smtp_port", ?)', [String(smtp_port || 587)]);
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES ("smtp_secure", ?)', [smtp_secure ? 'true' : 'false']);
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES ("smtp_user", ?)', [smtp_user || '']);
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES ("smtp_from", ?)', [smtp_from || '']);
    
    if (smtp_pass) {
      await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES ("smtp_pass", ?)', [smtp_pass]);
    }

    await db.close();
    res.json({ message: 'הגדרות דואר עודכנו בהצלחה' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בעדכון הגדרות דואר' });
  }
});

// Public direct event approval endpoint (without token, for email action buttons)
app.get('/api/events/public/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDbConnection();
    const event = await db.get('SELECT * FROM events WHERE id = ?', [id]);
    if (!event) {
      await db.close();
      return res.status(404).send(renderResponsePage('שגיאה', 'האירוע לא נמצא במערכת.', false));
    }

    if (event.status !== 'pending') {
      await db.close();
      return res.send(renderResponsePage('אירוע כבר עודכן', `האירוע נמצא כעת בסטטוס: ${translateStatusHeb(event.status)}`, true));
    }

    await db.run('UPDATE events SET status = "approved" WHERE id = ?', [id]);
    
    // Log notification update
    const rabbi = await db.get('SELECT * FROM rabbis WHERE id = ?', [event.rabbiId]);
    if (rabbi) {
      const timestamp = new Date().toISOString();
      const notifId = 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      await db.run(
        'INSERT INTO notifications (id, timestamp, type, recipientName, recipientContact, message, eventId) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [notifId, timestamp, 'email', 'מזכירות הארגון', process.env.OFFICE_EMAIL || 'office@eventflow.co.il', `אישור במייל: הרב ${rabbi.name} אישר את האירוע "${event.title}".`, id]
      );
    }
    
    await db.close();
    res.send(renderResponsePage('אירוע אושר בהצלחה!', `האירוע "${event.title}" אושר בהצלחה ועודכן ביומן. תודה רבה!`, true));
  } catch (err) {
    console.error(err);
    res.status(500).send(renderResponsePage('שגיאה', 'שגיאת שרת פנימית.', false));
  }
});

// Public direct event decline endpoint (without token, for email action buttons)
app.get('/api/events/public/:id/decline', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDbConnection();
    const event = await db.get('SELECT * FROM events WHERE id = ?', [id]);
    if (!event) {
      await db.close();
      return res.status(404).send(renderResponsePage('שגיאה', 'האירוע לא נמצא במערכת.', false));
    }

    if (event.status !== 'pending') {
      await db.close();
      return res.send(renderResponsePage('אירוע כבר עודכן', `האירוע נמצא כעת בסטטוס: ${translateStatusHeb(event.status)}`, true));
    }

    await db.run('UPDATE events SET status = "declined" WHERE id = ?', [id]);
    
    // Log notification update
    const rabbi = await db.get('SELECT * FROM rabbis WHERE id = ?', [event.rabbiId]);
    if (rabbi) {
      const timestamp = new Date().toISOString();
      const notifId = 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      await db.run(
        'INSERT INTO notifications (id, timestamp, type, recipientName, recipientContact, message, eventId) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [notifId, timestamp, 'email', 'מזכירות הארגון', process.env.OFFICE_EMAIL || 'office@eventflow.co.il', `דחייה במייל: הרב ${rabbi.name} דחה את האירוע "${event.title}".`, id]
      );
    }
    
    await db.close();
    res.send(renderResponsePage('אירוע נדחה', `האירוע "${event.title}" נדחה ועודכן במערכת. המזכירות קיבלה עדכון.`, true));
  } catch (err) {
    console.error(err);
    res.status(500).send(renderResponsePage('שגיאה', 'שגיאת שרת פנימית.', false));
  }
});

function translateStatusHeb(status) {
  switch (status) {
    case 'pending': return 'ממתין לאישור';
    case 'approved': return 'מאושר';
    case 'declined': return 'נדחה';
    case 'completed': return 'הסתיים';
    case 'reported': return 'דוח מולא';
    case 'canceled_pending': return 'בוטל וממתין לאישור הרב';
    case 'canceled': return 'בוטל ואושר';
    default: return status;
  }
}

// Function to render a beautiful HTML feedback page
function renderResponsePage(title, message, isSuccess) {
  return `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #0b0f19 0%, #1e293b 100%);
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
        }
        .card {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          padding: 40px;
          border-radius: 16px;
          text-align: center;
          max-width: 480px;
          width: 90%;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        h1 {
          color: ${isSuccess ? '#34d399' : '#f87171'};
          font-size: 24px;
          margin-bottom: 16px;
        }
        p {
          font-size: 16px;
          line-height: 1.6;
          color: #cbd5e1;
          margin-bottom: 24px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #3b82f6;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">✨ ניהול ארועים</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div style="font-size: 12px; color: #64748b;">ניתן לסגור את החלונית הזו כעת.</div>
      </div>
    </body>
    </html>
  `;
}

// Catch-all route to serve the React application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

startServer();
