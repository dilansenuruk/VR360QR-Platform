import pg from 'pg';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    'Missing DATABASE_URL. Create a free Postgres database at https://neon.tech, copy its connection ' +
      'string, and set it as DATABASE_URL in your .env file (see .env.example).'
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export function newId(): string {
  return randomUUID();
}

/**
 * Atomically assigns the next video code (00001, 00002, ...) using a single
 * UPDATE ... RETURNING statement. This is safe under real concurrency
 * (including multiple simultaneous serverless function invocations) because
 * Postgres executes the UPDATE as one indivisible, row-locked operation --
 * two concurrent callers cannot both read the same `next_value`.
 */
export async function nextVideoCode(): Promise<string> {
  const result = await pool.query<{ assigned: number }>(
    `UPDATE video_code_counter SET next_value = next_value + 1 WHERE id = 1 RETURNING next_value - 1 AS assigned`
  );
  return String(result.rows[0].assigned).padStart(5, '0');
}

async function createSchema() {
  await pool.query(`
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
      thumbnail_data BYTEA,
      thumbnail_mime TEXT,
      video_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_deleted BOOLEAN NOT NULL DEFAULT false
    );

    CREATE INDEX IF NOT EXISTS idx_videos_is_deleted ON videos (is_deleted);

    -- Backs the atomic, gap-free video code sequence (00001, 00002, ...).
    CREATE TABLE IF NOT EXISTS video_code_counter (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      next_value INTEGER NOT NULL
    );
    INSERT INTO video_code_counter (id, next_value) VALUES (1, 1) ON CONFLICT (id) DO NOTHING;

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
}

// ---------------------------------------------------------------------------
// Seed the two initial accounts (admin/admin, user/user) the first time the
// app runs. Passwords are hashed with bcrypt -- never stored in plain text.
// ---------------------------------------------------------------------------
async function seedInitialAccounts() {
  const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM profiles');
  if (Number(rows[0].count) > 0) return;

  const now = new Date().toISOString();
  await pool.query(
    'INSERT INTO profiles (id, username, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5)',
    [newId(), 'admin', bcrypt.hashSync('admin', 10), 'admin', now]
  );
  await pool.query(
    'INSERT INTO profiles (id, username, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5)',
    [newId(), 'user', bcrypt.hashSync('user', 10), 'user', now]
  );
  console.log('Seeded initial accounts: admin/admin (role: admin), user/user (role: user)');
}

// ---------------------------------------------------------------------------
// Schema creation + seeding runs once per cold start (in a serverless
// deployment) or once at startup (running locally). Subsequent calls reuse
// the same cached promise instead of re-running the setup queries.
// ---------------------------------------------------------------------------
let initPromise: Promise<void> | null = null;

export function ensureDbInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await createSchema();
      await seedInitialAccounts();
    })().catch((err) => {
      initPromise = null; // allow retrying on the next request if setup failed
      throw err;
    });
  }
  return initPromise;
}
