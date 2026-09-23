import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'app.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin')) DEFAULT 'user',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    video_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT,
    video_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_videos_is_deleted ON videos (is_deleted);

  -- Backs the atomic, gap-free video code sequence (00001, 00002, ...).
  CREATE TABLE IF NOT EXISTS video_code_counter (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    next_value INTEGER NOT NULL
  );
  INSERT OR IGNORE INTO video_code_counter (id, next_value) VALUES (1, 1);

  CREATE TABLE IF NOT EXISTS qr_generations (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL REFERENCES videos (id),
    video_code TEXT NOT NULL,
    tracking_id TEXT NOT NULL UNIQUE,
    payload TEXT NOT NULL UNIQUE,
    generated_by TEXT NOT NULL REFERENCES profiles (id),
    generated_at TEXT NOT NULL,
    last_accessed_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_qr_video_id ON qr_generations (video_id);
  CREATE INDEX IF NOT EXISTS idx_qr_generated_by ON qr_generations (generated_by);
  CREATE INDEX IF NOT EXISTS idx_qr_generated_at ON qr_generations (generated_at);
`);

/**
 * Atomically assigns the next video code (00001, 00002, ...) using a single
 * UPDATE ... RETURNING statement. Because node:sqlite is synchronous and
 * Node runs JavaScript single-threaded, no other request can interleave
 * between the read and the write of this counter -- there is no `await`
 * anywhere in this function.
 */
export function nextVideoCode(): string {
  const row = db
    .prepare(`UPDATE video_code_counter SET next_value = next_value + 1 WHERE id = 1 RETURNING next_value - 1 AS assigned`)
    .get() as { assigned: number };
  return String(row.assigned).padStart(5, '0');
}

export function newId(): string {
  return randomUUID();
}

// ---------------------------------------------------------------------------
// Seed the two initial accounts (admin/admin, user/user) the first time the
// app runs. Passwords are hashed with bcrypt -- never stored in plain text.
// ---------------------------------------------------------------------------
function seedInitialAccounts() {
  const count = (db.prepare('SELECT COUNT(*) AS count FROM profiles').get() as { count: number }).count;
  if (count > 0) return;

  const now = new Date().toISOString();
  const insert = db.prepare(
    'INSERT INTO profiles (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  insert.run(newId(), 'admin', bcrypt.hashSync('admin', 10), 'admin', now);
  insert.run(newId(), 'user', bcrypt.hashSync('user', 10), 'user', now);
  console.log('Seeded initial accounts: admin/admin (role: admin), user/user (role: user)');
}

seedInitialAccounts();
