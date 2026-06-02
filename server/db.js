import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';

export async function getDbConnection() {
  return open({
    filename: './database.db',
    driver: sqlite3.Database
  });
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

  // Migrate table structure if database already exists
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
      FOREIGN KEY (rabbiId) REFERENCES rabbis (id)
    )
  `);

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
      type TEXT NOT NULL, -- 'whatsapp' | 'email'
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

  // No mock data seeded for production ready clean state.
  await db.close();
}
