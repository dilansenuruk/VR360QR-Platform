import { apiGet, apiPost } from '../lib/api';
import type { Profile } from '../types';

export async function loginWithUsername(username: string, password: string): Promise<Profile> {
  return apiPost<Profile>('/api/auth/login', { username: username.trim(), password });
}

export async function logout(): Promise<void> {
  await apiPost<{ ok: true }>('/api/auth/logout');
}

export async function fetchCurrentProfile(): Promise<Profile | null> {
  try {
    return await apiGet<Profile>('/api/auth/me');
  } catch {
    return null;
  }
}

/** Admin only: list of accounts, used to populate the "filter by user" dropdown. */
export async function fetchAllUsers(): Promise<Profile[]> {
  return apiGet<Profile[]>('/api/admin/users');
}
