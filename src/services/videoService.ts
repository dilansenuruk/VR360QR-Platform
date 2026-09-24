import { apiDelete, apiGet, apiPost, apiPostForm, apiPutForm } from '../lib/api';
import type { Video } from '../types';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
// Kept under 4 MB to stay comfortably within Vercel Serverless Functions'
// ~4.5 MB request body limit (thumbnails are uploaded as part of the
// multipart form body). See server/routes/videos.ts for the matching check.
export const MAX_THUMBNAIL_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB

export interface VideoInput {
  name: string;
  description: string;
}

export function validateThumbnailFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Please upload a JPG, PNG, or WEBP image.';
  }
  if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
    return 'Image must be smaller than 4 MB.';
  }
  return null;
}

/** Fetches all active (non-deleted) videos, newest first. */
export async function fetchActiveVideos(): Promise<Video[]> {
  return apiGet<Video[]>('/api/videos');
}

/** Admin-only: fetches all videos including soft-deleted ones, with QR counts. */
export async function fetchAllVideosWithCounts(): Promise<Video[]> {
  return apiGet<Video[]>('/api/admin/videos');
}

function buildFormData(input: VideoInput, thumbnailFile: File | null): FormData {
  const formData = new FormData();
  formData.set('name', input.name);
  formData.set('description', input.description);
  if (thumbnailFile) {
    const validationError = validateThumbnailFile(thumbnailFile);
    if (validationError) throw new Error(validationError);
    formData.set('thumbnail', thumbnailFile);
  }
  return formData;
}

export async function createVideo(input: VideoInput, thumbnailFile: File | null): Promise<Video> {
  return apiPostForm<Video>('/api/admin/videos', buildFormData(input, thumbnailFile));
}

export async function updateVideo(
  id: string,
  input: VideoInput,
  thumbnailFile: File | null
): Promise<Video> {
  return apiPutForm<Video>(`/api/admin/videos/${id}`, buildFormData(input, thumbnailFile));
}

/** Soft-deletes a video. QR generation history for it is preserved. */
export async function softDeleteVideo(id: string): Promise<void> {
  await apiDelete(`/api/admin/videos/${id}`);
}

export async function restoreVideo(id: string): Promise<void> {
  await apiPost(`/api/admin/videos/${id}/restore`);
}
