import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { VideoGrid } from '../../components/VideoGrid';
import { VideoGridSkeleton } from '../../components/Skeletons';
import { QRModal } from '../../components/QRModal';
import { EmptyState } from '../../components/EmptyState';
import { fetchActiveVideos } from '../../services/videoService';
import { useQrGeneration } from '../../hooks/useQrGeneration';
import { toFriendlyError } from '../../utils/errors';
import type { Video } from '../../types';

export function VideosPage() {
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { generate, generatingVideoId, activeResult, closeResult } = useQrGeneration();

  useEffect(() => {
    let isMounted = true;
    fetchActiveVideos()
      .then((data) => isMounted && setVideos(data))
      .catch((err) => isMounted && setLoadError(toFriendlyError(err, 'Unable to load videos.')));
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredVideos = useMemo(() => {
    if (!videos) return [];
    const term = search.trim().toLowerCase();
    if (!term) return videos;
    return videos.filter(
      (v) => v.name.toLowerCase().includes(term) || v.video_code.toLowerCase().includes(term)
    );
  }, [videos, search]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Videos</h1>
          <p className="mt-1 text-sm text-slate-500">Browse available VR videos and generate a QR code.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            aria-label="Search videos"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {loadError && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {loadError}
        </p>
      )}

      {!videos && !loadError && <VideoGridSkeleton />}

      {videos && videos.length === 0 && (
        <EmptyState title="No videos have been added yet." description="Check back soon." />
      )}

      {videos && videos.length > 0 && filteredVideos.length === 0 && (
        <EmptyState title="No videos match your search." />
      )}

      {videos && filteredVideos.length > 0 && (
        <VideoGrid
          videos={filteredVideos}
          onGenerateQr={generate}
          generatingVideoId={generatingVideoId}
        />
      )}

      {activeResult && (
        <QRModal video={activeResult.video} qrGeneration={activeResult.qr} onClose={closeResult} />
      )}
    </div>
  );
}
