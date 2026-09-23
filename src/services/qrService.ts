import { apiGet, apiPost } from '../lib/api';
import type { QrGeneration } from '../types';

/**
 * Calls POST /api/qr/generate, which atomically looks up the video, generates
 * a cryptographically random 8-character tracking ID, retries on the rare
 * chance of a collision, and inserts the record with generated_by taken from
 * the server-side session -- never from anything the client sends.
 */
export async function generateQrCode(videoId: string): Promise<QrGeneration> {
  return apiPost<QrGeneration>('/api/qr/generate', { videoId });
}

export interface QrHistoryFilters {
  search?: string;
  dateFrom?: string; // yyyy-MM-dd
  dateTo?: string;
  userId?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Fetches QR generation history with optional filters. Regular users are
 * always scoped to their own generations by the server, regardless of what
 * is requested here -- `filters.userId` only has an effect for admins.
 * Pass `mine: true` (used by "My QR Generations") to force scoping to the
 * logged-in user even for an admin account.
 */
export async function fetchQrHistory(
  filters: QrHistoryFilters = {},
  options: { mine?: boolean } = {}
): Promise<QrGeneration[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.sortOrder) params.set('sort', filters.sortOrder);
  if (options.mine) params.set('mine', 'true');

  const query = params.toString();
  return apiGet<QrGeneration[]>(`/api/qr/history${query ? `?${query}` : ''}`);
}
