/**
 * Converts raw API/network errors into short, friendly messages that are
 * safe to show to end users. The original error is always logged to the
 * console for debugging, but never shown directly to non-technical users.
 * Most API errors already arrive as friendly messages (see src/lib/api.ts),
 * this is a fallback for anything else (network failures, etc.).
 */
export function toFriendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  console.error(error);

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Invalid login credentials')) {
    return 'Invalid username or password.';
  }
  if (message.includes('Not authenticated')) {
    return 'Your session has expired. Please log in again.';
  }
  if (message.includes('UNIQUE constraint failed')) {
    return 'That value is already in use. Please try again.';
  }
  if (message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }

  return fallback;
}
