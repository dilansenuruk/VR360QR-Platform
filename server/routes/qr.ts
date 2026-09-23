import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { db, newId } from '../db.ts';
import { requireAuth, type AuthedRequest } from '../middleware.ts';
import type { QrGenerationRow, VideoRow } from '../types.ts';

export const qrRouter = Router();

// Unambiguous charset (no 0/O, 1/I) for tracking IDs that may be read by a human.
const TRACKING_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TRACKING_ID_LENGTH = 8;
const MAX_INSERT_ATTEMPTS = 10;

function randomTrackingId(): string {
  const bytes = randomBytes(TRACKING_ID_LENGTH);
  let id = '';
  for (let i = 0; i < TRACKING_ID_LENGTH; i++) {
    id += TRACKING_CHARSET[bytes[i] % TRACKING_CHARSET.length];
  }
  return id;
}

interface HistoryRow extends QrGenerationRow {
  video_name: string;
  generated_by_username: string;
}

function serializeHistoryRow(row: HistoryRow) {
  return {
    id: row.id,
    video_id: row.video_id,
    video_code: row.video_code,
    tracking_id: row.tracking_id,
    payload: row.payload,
    generated_by: row.generated_by,
    generated_at: row.generated_at,
    last_accessed_at: row.last_accessed_at,
    video_name: row.video_name,
    generated_by_username: row.generated_by_username,
  };
}

/**
 * Generates a new QR code for a video. The tracking ID is cryptographically
 * random; because node:sqlite is synchronous, the "does this ID already
 * exist" check and the insert cannot be interleaved by another request, but
 * we still retry on a UNIQUE constraint violation as a hard backstop, so
 * duplicates are structurally impossible even if this logic ever changes.
 */
qrRouter.post('/qr/generate', requireAuth, (req: AuthedRequest, res) => {
  const { videoId } = req.body as { videoId?: string };
  if (!videoId) return res.status(400).json({ error: 'videoId is required.' });

  const video = db.prepare('SELECT * FROM videos WHERE id = ? AND is_deleted = 0').get(videoId) as
    | VideoRow
    | undefined;
  if (!video) {
    return res.status(404).json({ error: 'Video not found or has been removed.' });
  }

  const insert = db.prepare(
    `INSERT INTO qr_generations (id, video_id, video_code, tracking_id, payload, generated_by, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt++) {
    const trackingId = randomTrackingId();
    const payload = `${video.video_code}-${trackingId}`;
    const id = newId();
    const generatedAt = new Date().toISOString();

    try {
      insert.run(id, video.id, video.video_code, trackingId, payload, req.profile!.id, generatedAt);
      return res.status(201).json({
        id,
        video_id: video.id,
        video_code: video.video_code,
        tracking_id: trackingId,
        payload,
        generated_by: req.profile!.id,
        generated_at: generatedAt,
        last_accessed_at: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('UNIQUE constraint failed')) {
        console.error('QR generation failed:', err);
        return res.status(500).json({ error: 'Unable to generate QR code. Please try again.' });
      }
      // Extremely unlikely tracking_id collision -- loop and try a new one.
    }
  }

  res.status(500).json({ error: 'Unable to generate QR code. Please try again.' });
});

/**
 * QR generation history. Regular users are always scoped to their own
 * generations server-side (the `all` scope is silently ignored for them) --
 * this is enforced here, not just by what the frontend chooses to request.
 */
qrRouter.get('/qr/history', requireAuth, (req: AuthedRequest, res) => {
  const isAdmin = req.profile!.role === 'admin';
  const { search, dateFrom, dateTo, userId, sort, mine } = req.query as Record<string, string | undefined>;

  const conditions: string[] = [];
  const params: unknown[] = [];

  // `mine=true` (used by the "My QR Generations" page) always scopes to the
  // logged-in user, even for an admin -- this is enforced here, not left to
  // the client's choice, so it can't be bypassed by omitting the parameter.
  if (!isAdmin || mine === 'true') {
    conditions.push('g.generated_by = ?');
    params.push(req.profile!.id);
  } else if (userId) {
    conditions.push('g.generated_by = ?');
    params.push(userId);
  }

  if (dateFrom) {
    conditions.push('g.generated_at >= ?');
    params.push(`${dateFrom}T00:00:00.000Z`);
  }
  if (dateTo) {
    conditions.push('g.generated_at <= ?');
    params.push(`${dateTo}T23:59:59.999Z`);
  }
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push('(g.payload LIKE ? OR g.tracking_id LIKE ? OR g.video_code LIKE ? OR v.name LIKE ?)');
    params.push(term, term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const order = sort === 'asc' ? 'ASC' : 'DESC';

  const rows = db
    .prepare(
      `SELECT g.*, v.name AS video_name, p.username AS generated_by_username
       FROM qr_generations g
       JOIN videos v ON v.id = g.video_id
       JOIN profiles p ON p.id = g.generated_by
       ${whereClause}
       ORDER BY g.generated_at ${order}`
    )
    .all(...params) as HistoryRow[];

  res.json(rows.map(serializeHistoryRow));
});
