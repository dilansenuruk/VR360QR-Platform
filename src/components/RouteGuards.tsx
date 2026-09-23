import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FullPageLoader } from './FullPageLoader';

/**
 * Frontend route guards improve UX (no flash of the wrong page), but they
 * are NOT the real security boundary -- that's enforced by the requireAuth /
 * requireAdmin middleware on the Express API (see server/middleware.ts).
 * Even if a user bypassed these guards entirely, the server would still
 * refuse any admin-only read/write for a non-admin account.
 */

export function RequireAuth({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) return <FullPageLoader label="Loading your session..." />;
  if (!profile) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) return <FullPageLoader label="Loading your session..." />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
