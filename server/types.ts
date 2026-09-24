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
  thumbnail_data: Buffer | null;
  thumbnail_mime: string | null;
  video_path: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
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

/** Videos are never sent to the client with their raw thumbnail bytes -- just a URL to fetch them from. */
export function toPublicVideo(row: VideoRow & { qr_count?: number }) {
  return {
    id: row.id,
    video_code: row.video_code,
    name: row.name,
    description: row.description,
    thumbnail_url: row.thumbnail_mime ? `/api/thumbnails/${row.id}` : null,
    video_path: row.video_path,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_deleted: row.is_deleted,
    ...(row.qr_count !== undefined ? { qr_count: row.qr_count } : {}),
  };
}
