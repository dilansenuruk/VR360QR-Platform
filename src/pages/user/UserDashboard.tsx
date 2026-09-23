import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { VideoGrid } from '../../components/VideoGrid';
import { VideoGridSkeleton } from '../../components/Skeletons';
import { QRHistoryTable } from '../../components/QRHistoryTable';
import { QRModal } from '../../components/QRModal';
import { fetchActiveVideos } from '../../services/videoService';
import { fetchQrHistory } from '../../services/qrService';
import { useAuth } from '../../hooks/useAuth';
import { useQrGeneration } from '../../hooks/useQrGeneration';
import { toFriendlyError } from '../../utils/errors';
import type { QrGeneration, Video } from '../../types';

export function UserDashboard() {
  const { profile } = useAuth();
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [recentQr, setRecentQr] = useState<QrGeneration[] | null>(null);
  const { generate, generatingVideoId, activeResult, closeResult } = useQrGeneration();

  useEffect(() => {
    if (!profile) return;
    fetchActiveVideos().then(setVideos).catch((err) => console.error(toFriendlyError(err)));
    fetchQrHistory({ sortOrder: 'desc' }, { mine: true })
      .then((rows) => setRecentQr(rows.slice(0, 5)))
      .catch((err) => console.error(toFriendlyError(err)));
  }, [profile]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {profile?.username}</h1>
        <p className="mt-1 text-sm text-slate-500">Here's what's available to scan for the VR experience.</p>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Available Videos</h2>
          <Link to="/videos" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
            View all <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        {!videos ? (
          <VideoGridSkeleton count={4} />
        ) : (
          <VideoGrid
            videos={videos.slice(0, 4)}
            onGenerateQr={generate}
            generatingVideoId={generatingVideoId}
          />
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recently Generated QR Codes</h2>
          <Link
            to="/my-qr-generations"
            className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View all <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        {recentQr && <QRHistoryTable rows={recentQr} />}
      </section>

      {activeResult && (
        <QRModal video={activeResult.video} qrGeneration={activeResult.qr} onClose={closeResult} />
      )}
    </div>
  );
}
