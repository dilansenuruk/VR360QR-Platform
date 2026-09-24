import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.ts';
import { AUTH_COOKIE_NAME, JWT_SECRET, requireAuth, type AuthedRequest } from '../middleware.ts';
import { toPublicProfile, type ProfileRow } from '../types.ts';

export const authRouter = Router();

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
  };
}

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};

  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ error: 'Invalid login credentials' });
  }

  const { rows } = await pool.query<ProfileRow>('SELECT * FROM profiles WHERE lower(username) = lower($1)', [
    username.trim(),
  ]);
  const profile = rows[0];

  // Same generic message whether the username doesn't exist or the password
  // is wrong -- this avoids leaking which usernames are valid accounts.
  if (!profile || !bcrypt.compareSync(password, profile.password_hash)) {
    return res.status(401).json({ error: 'Invalid login credentials' });
  }

  const token = jwt.sign({ sub: profile.id }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions());
  res.json(toPublicProfile(profile));
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json(toPublicProfile(req.profile!));
});
