import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool, ensureDbInitialized } from './db.ts';
import type { ProfileRow } from './types.ts';

export const AUTH_COOKIE_NAME = 'vr360_token';
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';

if (!process.env.JWT_SECRET) {
  console.warn(
    'Warning: JWT_SECRET is not set. Using a development-only default. ' +
      'Set a long random JWT_SECRET before deploying this anywhere other than your own machine.'
  );
}

export interface AuthedRequest extends Request {
  profile?: ProfileRow;
}

/** Runs the (idempotent, cached) database setup before handling the first request. */
export async function requireDb(_req: Request, res: Response, next: NextFunction) {
  try {
    await ensureDbInitialized();
    next();
  } catch (err) {
    console.error('Database initialization failed:', err);
    res.status(500).json({ error: 'Server is not ready. Please try again shortly.' });
  }
}

/**
 * Verifies the JWT in the httpOnly session cookie and loads the
 * corresponding profile. This -- not the frontend route guards -- is the
 * real authorization boundary: every protected route checks `req.profile`
 * here, so no request can act on behalf of a role it doesn't have,
 * regardless of what the client sends.
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  let userId: string;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  const { rows } = await pool.query<ProfileRow>('SELECT * FROM profiles WHERE id = $1', [userId]);
  if (!rows[0]) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  req.profile = rows[0];
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Admins only.' });
  }
  next();
}
