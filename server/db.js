const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'linka.db');
const db = new DatabaseSync(dbPath);

// Initialize Tables & Schema
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      color TEXT DEFAULT 'linear-gradient(135deg,#1e3a8a,#2563eb)',
      public_key TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_username TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      target_id TEXT NOT NULL,
      text TEXT DEFAULT '',
      type TEXT DEFAULT 'text',
      media_url TEXT DEFAULT '',
      file_name TEXT DEFAULT '',
      file_size TEXT DEFAULT '',
      duration TEXT DEFAULT '',
      timestamp INTEGER NOT NULL,
      encrypted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      text TEXT NOT NULL,
      image TEXT DEFAULT '',
      likes INTEGER DEFAULT 0,
      archived INTEGER DEFAULT 0,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      contact_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      username TEXT NOT NULL,
      color TEXT DEFAULT 'linear-gradient(135deg,#7c3aed,#4f46e5)',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_seq (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    );
  `);

  // Ensure sequence counter exists
  const row = db.prepare('SELECT value FROM app_seq WHERE key = ?').get('user_seq');
  if (!row) {
    db.prepare('INSERT INTO app_seq (key, value) VALUES (?, ?)').run('user_seq', 1);
  }
}

// Helpers
function getNextUserId() {
  db.exec('BEGIN TRANSACTION');
  try {
    const row = db.prepare('SELECT value FROM app_seq WHERE key = ?').get('user_seq');
    const nextVal = row ? row.value : 1;
    db.prepare('UPDATE app_seq SET value = ? WHERE key = ?').run(nextVal + 1, 'user_seq');
    db.exec('COMMIT');
    return String(nextVal).padStart(7, '0');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Password hashing with native PBKDF2 (Zero-dependency & High Security)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(testHash, 'hex'));
}

// JWT Implementation with Native Crypto
function createToken(payload, secret = process.env.JWT_SECRET || 'linka_secret_key', expiresInSec = 86400 * 30) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token, secret = process.env.JWT_SECRET || 'linka_secret_key') {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (expectedSig !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

initDb();

module.exports = {
  db,
  getNextUserId,
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken
};
