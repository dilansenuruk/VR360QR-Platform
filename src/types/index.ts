export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
}

export interface Video {
  id: string;
  video_code: string;
  name: string;
  description: string;
  thumbnail_url: string | null;
  video_path: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  /** Populated client-side by joining/counting qr_generations; not a DB column. */
  qr_count?: number;
}

export interface QrGeneration {
  id: string;
  video_id: string;
  video_code: string;
  tracking_id: string;
  payload: string;
  generated_by: string;
  generated_at: string;
  last_accessed_at: string | null;
  /** Populated client-side via join. */
  video_name?: string;
  generated_by_username?: string;
}

export interface DashboardStats {
  totalVideos: number;
  totalQrCodes: number;
  qrCodesToday: number;
  qrCodesThisMonth: number;
}

export interface VideoQrCount {
  video_id: string;
  video_code: string;
  video_name: string;
  qr_count: number;
}
