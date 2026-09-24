import { Router } from 'express';
import { pool } from '../db.ts';
import { requireAdmin, requireAuth } from '../middleware.ts';

export const statsRouter = Router();

statsRouter.use(requireAuth, requireAdmin);

function startOfTodayUtcIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function startOfMonthUtcIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

statsRouter.get('/admin/stats', async (_req, res) => {
  const { rows } = await pool.query<{
    total_videos: string;
    total_qr_codes: string;
    qr_codes_today: string;
    qr_codes_this_month: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM videos WHERE is_deleted = false) AS total_videos,
       (SELECT COUNT(*) FROM qr_generations) AS total_qr_codes,
       (SELECT COUNT(*) FROM qr_generations WHERE generated_at >= $1) AS qr_codes_today,
       (SELECT COUNT(*) FROM qr_generations WHERE generated_at >= $2) AS qr_codes_this_month`,
    [startOfTodayUtcIso(), startOfMonthUtcIso()]
  );

  res.json({
    totalVideos: Number(rows[0].total_videos),
    totalQrCodes: Number(rows[0].total_qr_codes),
    qrCodesToday: Number(rows[0].qr_codes_today),
    qrCodesThisMonth: Number(rows[0].qr_codes_this_month),
  });
});

statsRouter.get('/admin/stats/qr-per-video', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT v.id AS video_id, v.video_code, v.name AS video_name, COUNT(g.id) AS qr_count
     FROM videos v
     LEFT JOIN qr_generations g ON g.video_id = v.id
     WHERE v.is_deleted = false
     GROUP BY v.id
     ORDER BY COUNT(g.id) DESC`
  );
  res.json(rows.map((r) => ({ ...r, qr_count: Number(r.qr_count) })));
});

statsRouter.get('/admin/stats/daily-activity', async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 14));

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  const { rows } = await pool.query<{ generated_at: string }>(
    'SELECT generated_at FROM qr_generations WHERE generated_at >= $1',
    [since.toISOString()]
  );

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    const day = row.generated_at.slice(0, 10);
    buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }

  res.json(Array.from(buckets.entries()).map(([date, count]) => ({ date, count })));
});
