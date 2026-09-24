import { Router } from 'express';
import multer from 'multer';
import { pool, newId, nextVideoCode } from '../db.ts';
import { requireAdmin, requireAuth, type AuthedRequest } from '../middleware.ts';
import { toPublicVideo, type VideoRow } from '../types.ts';

export const videosRouter = Router();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
// Kept comfortably under Vercel Serverless Functions' ~4.5 MB request body limit.
const MAX_THUMBNAIL_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_THUMBNAIL_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error('Please upload a JPG, PNG, or WEBP image.'));
      return;
    }
    cb(null, true);
  },
});

/** Any authenticated user: active (non-deleted) videos only. */
videosRouter.get('/videos', requireAuth, async (_req, res) => {
  const { rows } = await pool.query<VideoRow>(
    'SELECT * FROM videos WHERE is_deleted = false ORDER BY created_at DESC'
  );
  res.json(rows.map((v) => toPublicVideo(v)));
});

/** Admin only: every video (including soft-deleted), with QR counts. */
videosRouter.get('/admin/videos', requireAuth, requireAdmin, async (_req, res) => {
  const { rows } = await pool.query<VideoRow & { qr_count: string }>(
    `SELECT v.*, COUNT(g.id) AS qr_count
     FROM videos v
     LEFT JOIN qr_generations g ON g.video_id = v.id
     GROUP BY v.id
     ORDER BY v.created_at DESC`
  );
  res.json(rows.map((v) => toPublicVideo({ ...v, qr_count: Number(v.qr_count) })));
});

/** Serves a video's thumbnail image straight out of the database. */
videosRouter.get('/thumbnails/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query<{ thumbnail_data: Buffer | null; thumbnail_mime: string | null }>(
    'SELECT thumbnail_data, thumbnail_mime FROM videos WHERE id = $1',
    [req.params.id]
  );
  const row = rows[0];
  if (!row?.thumbnail_data || !row.thumbnail_mime) {
    return res.status(404).end();
  }
  res.setHeader('Content-Type', row.thumbnail_mime);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.send(row.thumbnail_data);
});

videosRouter.post(
  '/admin/videos',
  requireAuth,
  requireAdmin,
  (req, res, next) => upload.single('thumbnail')(req, res, (err) => (err ? res.status(400).json({ error: err.message }) : next())),
  async (req: AuthedRequest, res) => {
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Video name is required.' });
    }

    const now = new Date().toISOString();
    const id = newId();
    const videoCode = await nextVideoCode();
    const thumbnailData = req.file?.buffer ?? null;
    const thumbnailMime = req.file?.mimetype ?? null;

    await pool.query(
      `INSERT INTO videos (id, video_code, name, description, thumbnail_data, thumbnail_mime, created_at, updated_at, is_deleted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
      [id, videoCode, name.trim(), (description ?? '').trim(), thumbnailData, thumbnailMime, now, now]
    );

    const { rows } = await pool.query<VideoRow>('SELECT * FROM videos WHERE id = $1', [id]);
    res.status(201).json(toPublicVideo({ ...rows[0], qr_count: 0 }));
  }
);

videosRouter.put(
  '/admin/videos/:id',
  requireAuth,
  requireAdmin,
  (req, res, next) => upload.single('thumbnail')(req, res, (err) => (err ? res.status(400).json({ error: err.message }) : next())),
  async (req: AuthedRequest, res) => {
    const { rows: existingRows } = await pool.query<VideoRow>('SELECT * FROM videos WHERE id = $1', [
      req.params.id,
    ]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'Video not found.' });

    const { name, description } = req.body as { name?: string; description?: string };
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Video name is required.' });
    }

    const now = new Date().toISOString();
    const thumbnailData = req.file ? req.file.buffer : existing.thumbnail_data;
    const thumbnailMime = req.file ? req.file.mimetype : existing.thumbnail_mime;

    // video_code is never changed here -- it must remain stable for the video's lifetime.
    await pool.query(
      'UPDATE videos SET name = $1, description = $2, thumbnail_data = $3, thumbnail_mime = $4, updated_at = $5 WHERE id = $6',
      [name.trim(), (description ?? '').trim(), thumbnailData, thumbnailMime, now, existing.id]
    );

    const { rows: qrCountRows } = await pool.query<{ qr_count: string }>(
      'SELECT COUNT(*) AS qr_count FROM qr_generations WHERE video_id = $1',
      [existing.id]
    );
    const { rows: updatedRows } = await pool.query<VideoRow>('SELECT * FROM videos WHERE id = $1', [
      existing.id,
    ]);
    res.json(toPublicVideo({ ...updatedRows[0], qr_count: Number(qrCountRows[0].qr_count) }));
  }
);

videosRouter.delete('/admin/videos/:id', requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query<VideoRow>('SELECT id FROM videos WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Video not found.' });

  // Soft delete only -- QR generation history referencing this video (video_id
  // foreign key) is preserved and remains fully auditable.
  await pool.query('UPDATE videos SET is_deleted = true, updated_at = $1 WHERE id = $2', [
    new Date().toISOString(),
    req.params.id,
  ]);
  res.json({ ok: true });
});

videosRouter.post('/admin/videos/:id/restore', requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query<VideoRow>('SELECT id FROM videos WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Video not found.' });

  await pool.query('UPDATE videos SET is_deleted = false, updated_at = $1 WHERE id = $2', [
    new Date().toISOString(),
    req.params.id,
  ]);
  res.json({ ok: true });
});
