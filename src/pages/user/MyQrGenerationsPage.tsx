import { useEffect, useState } from 'react';
import { QRHistoryTable } from '../../components/QRHistoryTable';
import { QRHistoryFilterBar } from '../../components/QRHistoryFilterBar';
import { TableRowSkeleton } from '../../components/Skeletons';
import { fetchQrHistory, type QrHistoryFilters } from '../../services/qrService';
import { useAuth } from '../../hooks/useAuth';
import { toFriendlyError } from '../../utils/errors';
import type { QrGeneration } from '../../types';

export function MyQrGenerationsPage() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<QrGeneration[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<QrHistoryFilters>({ sortOrder: 'desc' });

  useEffect(() => {
    if (!profile) return;
    let isMounted = true;
    setRows(null);
    setError(null);

    const timeout = setTimeout(() => {
      fetchQrHistory(filters, { mine: true })
        .then((data) => isMounted && setRows(data))
        .catch((err) => isMounted && setError(toFriendlyError(err, 'Unable to load QR history.')));
    }, 250); // debounce search typing

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [profile, filters]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My QR Generations</h1>
        <p className="mt-1 text-sm text-slate-500">Every QR code you have generated, with the ability to re-download it.</p>
      </div>

      <div className="mb-4">
        <QRHistoryFilterBar filters={filters} onChange={setFilters} />
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
              <TableRowSkeleton columns={5} />
              <TableRowSkeleton columns={5} />
              <TableRowSkeleton columns={5} />
            </tbody>
          </table>
        </div>
      )}

      {rows && (
        <QRHistoryTable
          rows={rows}
          emptyMessage={
            filters.search || filters.dateFrom || filters.dateTo
              ? 'No QR codes match your filters.'
              : 'No QR codes have been generated yet.'
          }
        />
      )}
    </div>
  );
}
