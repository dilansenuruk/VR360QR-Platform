import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoQrBarChart } from '../../components/VideoQrBarChart';
import { EmptyState } from '../../components/EmptyState';
import { TableRowSkeleton } from '../../components/Skeletons';
import { fetchQrCountsByVideo } from '../../services/statsService';
import { toFriendlyError } from '../../utils/errors';
import type { VideoQrCount } from '../../types';

export function AdminStatisticsPage() {
  const [counts, setCounts] = useState<VideoQrCount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQrCountsByVideo()
      .then(setCounts)
      .catch((err) => setError(toFriendlyError(err, 'Unable to load statistics.')));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">QR Statistics</h1>
        <p className="mt-1 text-sm text-slate-500">QR code generation counts broken down by video.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">QR Codes per Video</h2>
        {counts && <VideoQrBarChart data={counts} />}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Video</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium text-right">QR Codes Generated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!counts && (
              <>
                <TableRowSkeleton columns={3} />
                <TableRowSkeleton columns={3} />
                <TableRowSkeleton columns={3} />
              </>
            )}
            {counts?.map((row) => (
              <tr
                key={row.video_id}
                onClick={() => navigate(`/admin/qr-history?search=${row.video_code}`)}
                className="cursor-pointer hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-medium text-slate-900">{row.video_name}</td>
                <td className="px-4 py-3 font-mono text-slate-600">{row.video_code}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">{row.qr_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {counts && counts.length === 0 && (
          <div className="p-2">
            <EmptyState title="No videos have been added yet." />
          </div>
        )}
      </div>
    </div>
  );
}
