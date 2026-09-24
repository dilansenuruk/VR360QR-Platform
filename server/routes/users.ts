import { Router } from 'express';
import { pool } from '../db.ts';
import { requireAdmin, requireAuth } from '../middleware.ts';
import { toPublicProfile, type ProfileRow } from '../types.ts';

export const usersRouter = Router();

/** Admin only: list of accounts, used to populate the "filter by user" dropdown in QR history. */
usersRouter.get('/admin/users', requireAuth, requireAdmin, async (_req, res) => {
  const { rows } = await pool.query<ProfileRow>('SELECT * FROM profiles ORDER BY username');
  res.json(rows.map(toPublicProfile));
});
