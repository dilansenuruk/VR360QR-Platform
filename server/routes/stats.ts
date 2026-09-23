import { Router } from 'express';
import { db } from '../db.ts';
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

statsRouter.get('/admin/stats', (_req, res) => {
  const totalVideos = (
    db.prepare('SELECT COUNT(*) AS n FROM videos WHERE is_deleted = 0').get() as { n: number }
  ).n;
  const totalQrCodes = (db.prepare('SELECT COUNT(*) AS n FROM qr_generations').get() as { n: number }).n;
  const qrCodesToday = (
    db.prepare('SELECT COUNT(*) AS n FROM qr_generations WHERE generated_at >= ?').get(startOfTodayUtcIso()) as {
      n: number;
    }
  ).n;
  const qrCodesThisMonth = (
    db.prepare('SELECT COUNT(*) AS n FROM qr_generations WHERE generated_at >= ?').get(startOfMonthUtcIso()) as {
      n: number;
    }
  ).n;

  res.json({ totalVideos, totalQrCodes, qrCodesToday, qrCodesThisMonth });
});

statsRouter.get('/admin/stats/qr-per-video', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT v.id AS video_id, v.video_code, v.name AS video_name, COUNT(g.id) AS qr_count
       FROM videos v
       LEFT JOIN qr_generations g ON g.video_id = v.id
       WHERE v.is_deleted = 0
       GROUP BY v.id
       ORDER BY qr_count DESC`
    )
    .all();
  res.json(rows);
});

statsRouter.get('/admin/stats/daily-activity', (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 14));

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  const rows = db
    .prepare('SELECT generated_at FROM qr_generations WHERE generated_at >= ?')
    .all(since.toISOString()) as { generated_at: string }[];

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
