import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export type UserRole = 'user' | 'admin';

export interface ProfileRow {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export interface VideoRow {
  id: string;
  video_code: string;
  name: string;
  description: string;
  thumbnail_url: string | null;
  video_path: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: number;
}

export interface QrGenerationRow {
  id: string;
  video_id: string;
  video_code: string;
  tracking_id: string;
  payload: string;
  generated_by: string;
  generated_at: string;
  last_accessed_at: string | null;
}

export function toPublicProfile(row: ProfileRow) {
  return { id: row.id, username: row.username, role: row.role, created_at: row.created_at };
}
