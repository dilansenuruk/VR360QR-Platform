import { apiGet } from '../lib/api';
import type { DashboardStats, VideoQrCount } from '../types';

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiGet<DashboardStats>('/api/admin/stats');
}

/** QR code count per active video, for the "QR codes per video" bar chart. */
export async function fetchQrCountsByVideo(): Promise<VideoQrCount[]> {
  return apiGet<VideoQrCount[]>('/api/admin/stats/qr-per-video');
}

export interface DailyActivityPoint {
  date: string; // yyyy-MM-dd (UTC day)
  count: number;
}

/** QR generations bucketed by UTC day for the last `days` days, oldest first. */
export async function fetchDailyActivity(days = 14): Promise<DailyActivityPoint[]> {
  return apiGet<DailyActivityPoint[]>(`/api/admin/stats/daily-activity?days=${days}`);
}
