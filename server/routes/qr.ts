import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { pool, newId } from '../db.ts';
import { requireAuth, type AuthedRequest } from '../middleware.ts';
import type { QrGenerationRow, VideoRow } from '../types.ts';

export const qrRouter = Router();

// Unambiguous charset (no 0/O, 1/I) for tracking IDs that may be read by a human.
const TRACKING_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TRACKING_ID_LENGTH = 8;
const MAX_INSERT_ATTEMPTS = 10;
const POSTGRES_UNIQUE_VIOLATION = '23505';

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
 * random. Postgres' UNIQUE constraint on tracking_id/payload is the real
 * backstop against duplicates -- if an insert ever collides (astronomically
 * unlikely), we catch the unique_violation error and retry with a fresh ID,
 * so duplicates are structurally impossible even under concurrent requests.
 */
qrRouter.post('/qr/generate', requireAuth, async (req: AuthedRequest, res) => {
  const { videoId } = req.body as { videoId?: string };
  if (!videoId) return res.status(400).json({ error: 'videoId is required.' });

  const { rows: videoRows } = await pool.query<VideoRow>(
    'SELECT * FROM videos WHERE id = $1 AND is_deleted = false',
    [videoId]
  );
  const video = videoRows[0];
  if (!video) {
    return res.status(404).json({ error: 'Video not found or has been removed.' });
  }

  for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt++) {
    const trackingId = randomTrackingId();
    const payload = `${video.video_code}-${trackingId}`;
    const id = newId();
    const generatedAt = new Date().toISOString();

    try {
      await pool.query(
        `INSERT INTO qr_generations (id, video_id, video_code, tracking_id, payload, generated_by, generated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, video.id, video.video_code, trackingId, payload, req.profile!.id, generatedAt]
      );
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
      const code = (err as { code?: string }).code;
      if (code !== POSTGRES_UNIQUE_VIOLATION) {
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
qrRouter.get('/qr/history', requireAuth, async (req: AuthedRequest, res) => {
  const isAdmin = req.profile!.role === 'admin';
  const { search, dateFrom, dateTo, userId, sort, mine } = req.query as Record<string, string | undefined>;

  const conditions: string[] = [];
  const params: unknown[] = [];
  function addParam(value: unknown): string {
    params.push(value);
    return `$${params.length}`;
  }

  // `mine=true` (used by the "My QR Generations" page) always scopes to the
  // logged-in user, even for an admin -- this is enforced here, not left to
  // the client's choice, so it can't be bypassed by omitting the parameter.
  if (!isAdmin || mine === 'true') {
    conditions.push(`g.generated_by = ${addParam(req.profile!.id)}`);
  } else if (userId) {
    conditions.push(`g.generated_by = ${addParam(userId)}`);
  }

  if (dateFrom) {
    conditions.push(`g.generated_at >= ${addParam(`${dateFrom}T00:00:00.000Z`)}`);
  }
  if (dateTo) {
    conditions.push(`g.generated_at <= ${addParam(`${dateTo}T23:59:59.999Z`)}`);
  }
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    const p1 = addParam(term);
    const p2 = addParam(term);
    const p3 = addParam(term);
    const p4 = addParam(term);
    conditions.push(`(g.payload ILIKE ${p1} OR g.tracking_id ILIKE ${p2} OR g.video_code ILIKE ${p3} OR v.name ILIKE ${p4})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const order = sort === 'asc' ? 'ASC' : 'DESC';

  const { rows } = await pool.query<HistoryRow>(
    `SELECT g.*, v.name AS video_name, p.username AS generated_by_username
     FROM qr_generations g
     JOIN videos v ON v.id = g.video_id
     JOIN profiles p ON p.id = g.generated_by
     ${whereClause}
     ORDER BY g.generated_at ${order}`,
    params
  );

  res.json(rows.map(serializeHistoryRow));
});
