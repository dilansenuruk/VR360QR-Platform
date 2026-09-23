import { Router } from 'express';
import { db } from '../db.ts';
import { requireAdmin, requireAuth } from '../middleware.ts';
import { toPublicProfile, type ProfileRow } from '../types.ts';

export const usersRouter = Router();

/** Admin only: list of accounts, used to populate the "filter by user" dropdown in QR history. */
usersRouter.get('/admin/users', requireAuth, requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM profiles ORDER BY username').all() as ProfileRow[];
  res.json(rows.map(toPublicProfile));
});
