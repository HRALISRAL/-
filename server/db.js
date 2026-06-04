import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Client } = pg;

const isPostgres = !!process.env.DATABASE_URL;

function convertSqlPlaceholders(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

class PgDbWrapper {
  constructor(client) {
    this.client = client;
  }

  async get(sql, params = []) {
    const pgSql = convertSqlPlaceholders(sql);
    const res = await this.client.query(pgSql, params);
    return res.rows[0] || null;
  }

  async all(sql, params = []) {
    const pgSql = convertSqlPlaceholders(sql);
    const res = await this.client.query(pgSql, params);
    return res.rows;
  }

  async run(sql, params = []) {
    const pgSql = convertSqlPlaceholders(sql);
    const res = await this.client.query(pgSql, params);
    return {
      lastID: null,
      changes: res.rowCount
    };
  }

  async exec(sql) {
    await this.client.query(sql);
  }

  async close() {
    await this.client.end();
  }
}

export async function getDbConnection() {
  if (isPostgres) {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    await client.connect();
    return new PgDbWrapper(client);
  } else {
    return open({
      filename: './database.db',
      driver: sqlite3.Database
    });
  }
}

export async function initDb() {
  const db = await getDbConnection();

  // Create Rabbis Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS rabbis (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      address TEXT,
      password_plain TEXT,
      avatar TEXT,
      password TEXT NOT NULL
    )
  `);

  try {
    await db.exec('ALTER TABLE rabbis ADD COLUMN address TEXT');
  } catch (e) {
    // Ignore error if column already exists
  }
  try {
    await db.exec('ALTER TABLE rabbis ADD COLUMN password_plain TEXT');
  } catch (e) {
    // Ignore error if column already exists
  }

  // Update existing seeded rabbis with defaults if null
  try {
    await db.run("UPDATE rabbis SET password_plain = '123456' WHERE password_plain IS NULL");
    await db.run("UPDATE rabbis SET address = 'רחוב רשב\"י 12, בני ברק' WHERE id = '1' AND (address IS NULL OR address = '')");
    await db.run("UPDATE rabbis SET address = 'רחוב חזון איש 4, ירושלים' WHERE id = '2' AND (address IS NULL OR address = '')");
    await db.run("UPDATE rabbis SET address = 'רחוב רבי עקיבא 45, בני ברק' WHERE id = '3' AND (address IS NULL OR address = '')");
    await db.run("UPDATE rabbis SET address = 'רחוב הנביאים 8, ירושלים' WHERE id = '4' AND (address IS NULL OR address = '')");
  } catch (e) {
    console.error('Migration error while updating rabbis:', e);
  }

  // Create Events Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      rabbiId TEXT NOT NULL,
      location TEXT NOT NULL,
      clientName TEXT NOT NULL,
      clientPhone TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reminderSent INTEGER DEFAULT 0,
      reportPromptSent INTEGER DEFAULT 0,
      isUpdated INTEGER DEFAULT 0,
      FOREIGN KEY (rabbiId) REFERENCES rabbis (id)
    )
  `);

  try {
    await db.exec('ALTER TABLE events ADD COLUMN isUpdated INTEGER DEFAULT 0');
  } catch (e) {
    // Ignore error if column already exists
  }

  // Create Reports Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      eventId TEXT PRIMARY KEY,
      participantsCount INTEGER NOT NULL,
      connectedToRashbi INTEGER NOT NULL,
      validFoldersCount INTEGER NOT NULL,
      incompleteFoldersCount INTEGER NOT NULL,
      prayerFormsCount INTEGER NOT NULL,
      interestedInEventsCount INTEGER NOT NULL,
      formsVerified INTEGER NOT NULL,
      recurringDonationsTotal REAL NOT NULL,
      comments TEXT,
      FOREIGN KEY (eventId) REFERENCES events (id)
    )
  `);

  // Create Notifications Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      recipientName TEXT NOT NULL,
      recipientContact TEXT NOT NULL,
      message TEXT NOT NULL,
      eventId TEXT,
      FOREIGN KEY (eventId) REFERENCES events (id)
    )
  `);

  // Create Settings Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Auto-seed default Rabbis if none exist in the system (for clean database start)
  try {
    const countRes = await db.get('SELECT COUNT(*) as count FROM rabbis');
    if (!countRes || countRes.count === 0) {
      const defaultRabbis = [
        { id: '1', name: 'הרב אברהם כהן', email: 'rabbi.avraham@gmail.com', phone: '050-1234567', address: 'רחוב רשב"י 12, בני ברק', password_plain: '123456', password_hash: bcrypt.hashSync('123456', 10), avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80' },
        { id: '2', name: 'הרב יצחק לוי', email: 'rabbi.yitzhak@gmail.com', phone: '052-7654321', address: 'רחוב חזון איש 4, ירושלים', password_plain: '123456', password_hash: bcrypt.hashSync('123456', 10), avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80' },
        { id: '3', name: 'הרב חיים יוסף', email: 'rabbi.chaim@gmail.com', phone: '054-1112223', address: 'רחוב רבי עקיבא 45, בני ברק', password_plain: '123456', password_hash: bcrypt.hashSync('123456', 10), avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80' },
        { id: '4', name: 'הרב דוד מזרחי', email: 'rabbi.david@gmail.com', phone: '053-9998887', address: 'רחוב הנביאים 8, ירושלים', password_plain: '123456', password_hash: bcrypt.hashSync('123456', 10), avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80' }
      ];

      for (const r of defaultRabbis) {
        await db.run(
          'INSERT INTO rabbis (id, name, email, phone, address, password_plain, avatar, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [r.id, r.name, r.email, r.phone, r.address, r.password_plain, r.avatar, r.password_hash]
        );
      }
      console.log('Seeded default rabbis into empty database.');
    }
  } catch (e) {
    console.error('Error auto-seeding rabbis:', e);
  }

  await db.close();
}
