import { useEffect, useState } from 'react';
import { Video, QrCode, CalendarDays, CalendarRange } from 'lucide-react';
import { StatCard } from '../../components/StatCard';
import { StatCardSkeleton } from '../../components/Skeletons';
import { VideoQrBarChart } from '../../components/VideoQrBarChart';
import { ActivityLineChart } from '../../components/ActivityLineChart';
import { QRHistoryTable } from '../../components/QRHistoryTable';
import {
  fetchDashboardStats,
  fetchQrCountsByVideo,
  fetchDailyActivity,
  type DailyActivityPoint,
} from '../../services/statsService';
import { fetchQrHistory } from '../../services/qrService';
import { toFriendlyError } from '../../utils/errors';
import type { DashboardStats, QrGeneration, VideoQrCount } from '../../types';

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [videoCounts, setVideoCounts] = useState<VideoQrCount[] | null>(null);
  const [activity, setActivity] = useState<DailyActivityPoint[] | null>(null);
  const [recent, setRecent] = useState<QrGeneration[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchDashboardStats(),
      fetchQrCountsByVideo(),
      fetchDailyActivity(14),
      fetchQrHistory({ sortOrder: 'desc' }),
    ])
      .then(([s, vc, act, hist]) => {
        setStats(s);
        setVideoCounts(vc);
        setActivity(act);
        setRecent(hist.slice(0, 8));
      })
      .catch((err) => setError(toFriendlyError(err, 'Unable to load dashboard statistics.')));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Overview of video and QR generation activity.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!stats ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Total Videos" value={stats.totalVideos} icon={Video} />
            <StatCard label="Total QR Codes Generated" value={stats.totalQrCodes} icon={QrCode} emphasize />
            <StatCard label="QR Codes Today" value={stats.qrCodesToday} icon={CalendarDays} />
            <StatCard label="QR Codes This Month" value={stats.qrCodesThisMonth} icon={CalendarRange} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-slate-900">QR Codes per Video</h2>
          <p className="mb-4 text-xs text-slate-400">Top 10 videos by number of QR codes generated.</p>
          {videoCounts && <VideoQrBarChart data={videoCounts} />}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-slate-900">QR Generation Activity</h2>
          <p className="mb-4 text-xs text-slate-400">Codes generated per day, last 14 days.</p>
          {activity && <ActivityLineChart data={activity} />}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-base font-semibold text-slate-900">Recent QR Generations</h2>
        {recent && <QRHistoryTable rows={recent} showGeneratedBy />}
      </div>
    </div>
  );
}
