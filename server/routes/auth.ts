import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.ts';
import { requireAuth, type AuthedRequest } from '../middleware.ts';
import { toPublicProfile, type ProfileRow } from '../types.ts';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body ?? {};

  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ error: 'Invalid login credentials' });
  }

  const profile = db
    .prepare('SELECT * FROM profiles WHERE lower(username) = lower(?)')
    .get(username.trim()) as ProfileRow | undefined;

  // Same generic message whether the username doesn't exist or the password
  // is wrong -- this avoids leaking which usernames are valid accounts.
  if (!profile || !bcrypt.compareSync(password, profile.password_hash)) {
    return res.status(401).json({ error: 'Invalid login credentials' });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Unable to log in. Please try again.' });
    req.session.userId = profile.id;
    res.json(toPublicProfile(profile));
  });
});

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('vr360.sid');
    res.json({ ok: true });
  });
});

authRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json(toPublicProfile(req.profile!));
});
