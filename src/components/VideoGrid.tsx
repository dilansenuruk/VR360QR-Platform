import type { Video } from '../types';
import { VideoCard } from './VideoCard';
import { EmptyState } from './EmptyState';

interface VideoGridProps {
  videos: Video[];
  onGenerateQr: (video: Video) => void;
  generatingVideoId: string | null;
  emptyMessage?: string;
}

export function VideoGrid({ videos, onGenerateQr, generatingVideoId, emptyMessage }: VideoGridProps) {
  if (videos.length === 0) {
    return <EmptyState title={emptyMessage ?? 'No videos available yet.'} />;
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onGenerateQr={onGenerateQr}
          isGenerating={generatingVideoId === video.id}
        />
      ))}
    </div>
  );
}
