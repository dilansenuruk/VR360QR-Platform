import { format, parseISO } from 'date-fns';

/**
 * Postgres timestamptz columns are stored/returned in UTC. JS Date parses
 * that ISO string and format() below renders it using the browser's local
 * timezone automatically — no manual offset math needed.
 */
export function formatDateTime(isoUtc: string): string {
  return format(parseISO(isoUtc), 'yyyy-MM-dd HH:mm:ss');
}

export function formatDate(isoUtc: string): string {
  return format(parseISO(isoUtc), 'yyyy-MM-dd');
}

export function formatRelativeShort(isoUtc: string): string {
  return format(parseISO(isoUtc), 'MMM d, yyyy \'at\' HH:mm');
}
