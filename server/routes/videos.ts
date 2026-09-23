import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, newId, nextVideoCode } from '../db.ts';
import { requireAdmin, requireAuth, type AuthedRequest } from '../middleware.ts';
import type { VideoRow } from '../types.ts';

export const videosRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_THUMBNAIL_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${newId()}${ext}`);
    },
  }),
  limits: { fileSize: MAX_THUMBNAIL_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error('Please upload a JPG, PNG, or WEBP image.'));
      return;
    }
    cb(null, true);
  },
});

function withQrCount(video: VideoRow) {
  const { qr_count } = db
    .prepare('SELECT COUNT(*) AS qr_count FROM qr_generations WHERE video_id = ?')
    .get(video.id) as { qr_count: number };
  return { ...video, is_deleted: Boolean(video.is_deleted), qr_count };
}

/** Any authenticated user: active (non-deleted) videos only. */
videosRouter.get('/videos', requireAuth, (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM videos WHERE is_deleted = 0 ORDER BY created_at DESC')
    .all() as VideoRow[];
  res.json(rows.map((v) => ({ ...v, is_deleted: false })));
});

/** Admin only: every video (including soft-deleted), with QR counts. */
videosRouter.get('/admin/videos', requireAuth, requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM videos ORDER BY created_at DESC').all() as VideoRow[];
  res.json(rows.map(withQrCount));
});

videosRouter.post(
  '/admin/videos',
  requireAuth,
  requireAdmin,
  (req, res, next) => upload.single('thumbnail')(req, res, (err) => (err ? res.status(400).json({ error: err.message }) : next())),
  (req: AuthedRequest, res) => {
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Video name is required.' });
    }

    const now = new Date().toISOString();
    const id = newId();
    const videoCode = nextVideoCode();
    const thumbnailUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.prepare(
      `INSERT INTO videos (id, video_code, name, description, thumbnail_url, created_at, updated_at, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
    ).run(id, videoCode, name.trim(), (description ?? '').trim(), thumbnailUrl, now, now);

    const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(id) as VideoRow;
    res.status(201).json(withQrCount(video));
  }
);

videosRouter.put(
  '/admin/videos/:id',
  requireAuth,
  requireAdmin,
  (req, res, next) => upload.single('thumbnail')(req, res, (err) => (err ? res.status(400).json({ error: err.message }) : next())),
  (req: AuthedRequest, res) => {
    const existing = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id) as VideoRow | undefined;
    if (!existing) return res.status(404).json({ error: 'Video not found.' });

    const { name, description } = req.body as { name?: string; description?: string };
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Video name is required.' });
    }

    const thumbnailUrl = req.file ? `/uploads/${req.file.filename}` : existing.thumbnail_url;
    const now = new Date().toISOString();

    // video_code is never changed here -- it must remain stable for the video's lifetime.
    db.prepare(
      'UPDATE videos SET name = ?, description = ?, thumbnail_url = ?, updated_at = ? WHERE id = ?'
    ).run(name.trim(), (description ?? '').trim(), thumbnailUrl, now, existing.id);

    const updated = db.prepare('SELECT * FROM videos WHERE id = ?').get(existing.id) as VideoRow;
    res.json(withQrCount(updated));
  }
);

videosRouter.delete('/admin/videos/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id) as VideoRow | undefined;
  if (!existing) return res.status(404).json({ error: 'Video not found.' });

  // Soft delete only -- QR generation history referencing this video (video_id
  // foreign key) is preserved and remains fully auditable.
  db.prepare('UPDATE videos SET is_deleted = 1, updated_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    existing.id
  );
  res.json({ ok: true });
});

videosRouter.post('/admin/videos/:id/restore', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id) as VideoRow | undefined;
  if (!existing) return res.status(404).json({ error: 'Video not found.' });

  db.prepare('UPDATE videos SET is_deleted = 0, updated_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    existing.id
  );
  res.json({ ok: true });
});
