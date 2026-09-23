import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRHistoryTable } from '../../components/QRHistoryTable';
import { QRHistoryFilterBar } from '../../components/QRHistoryFilterBar';
import { TableRowSkeleton } from '../../components/Skeletons';
import { fetchQrHistory, type QrHistoryFilters } from '../../services/qrService';
import { fetchAllUsers } from '../../services/authService';
import { toFriendlyError } from '../../utils/errors';
import type { Profile, QrGeneration } from '../../types';

export function AdminQrHistoryPage() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<QrHistoryFilters>({
    sortOrder: 'desc',
    search: searchParams.get('search') ?? '',
  });
  const [rows, setRows] = useState<QrGeneration[] | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllUsers().then(setUsers);
  }, []);

  useEffect(() => {
    setRows(null);
    setError(null);
    const timeout = setTimeout(() => {
      fetchQrHistory(filters)
        .then(setRows)
        .catch((err) => setError(toFriendlyError(err, 'Unable to load QR history.')));
    }, 250);
    return () => clearTimeout(timeout);
  }, [filters]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">QR Generation History</h1>
        <p className="mt-1 text-sm text-slate-500">Complete, auditable record of every QR code ever generated.</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <QRHistoryFilterBar filters={filters} onChange={setFilters} />
        </div>
        <select
          value={filters.userId ?? ''}
          onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })}
          aria-label="Filter by user"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {error}
        </p>
      )}

      {!rows && !error && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <tbody>
              <TableRowSkeleton columns={6} />
              <TableRowSkeleton columns={6} />
              <TableRowSkeleton columns={6} />
            </tbody>
          </table>
        </div>
      )}

      {rows && (
        <>
          <p className="mb-2 text-sm text-slate-500">{rows.length} result{rows.length === 1 ? '' : 's'}</p>
          <QRHistoryTable
            rows={rows}
            showGeneratedBy
            emptyMessage={
              filters.search || filters.dateFrom || filters.dateTo || filters.userId
                ? 'No QR codes match your filters.'
                : 'No QR codes have been generated yet.'
            }
          />
        </>
      )}
    </div>
  );
}
