import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';
import type { ProfileRow } from './types.ts';

export interface AuthedRequest extends Request {
  profile?: ProfileRow;
}

/**
 * Loads the logged-in user's profile from their session and attaches it to
 * the request. This -- not the frontend route guards -- is the real
 * authorization boundary: every protected route checks `req.profile` here,
 * so no request can act on behalf of a role it doesn't have, regardless of
 * what the client sends.
 */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(userId) as ProfileRow | undefined;
  if (!profile) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  req.profile = profile;
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Admins only.' });
  }
  next();
}
