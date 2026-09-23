import { ImageOff, QrCode } from 'lucide-react';
import type { Video } from '../types';

interface VideoCardProps {
  video: Video;
  onGenerateQr: (video: Video) => void;
  isGenerating: boolean;
}

export function VideoCard({ video, onGenerateQr, isGenerating }: VideoCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-40 w-full items-center justify-center bg-slate-100">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={`Thumbnail for ${video.name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageOff className="text-slate-300" size={32} aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900">{video.name}</h3>
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
            {video.video_code}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">
          {video.description || 'No description provided.'}
        </p>
        <button
          type="button"
          onClick={() => onGenerateQr(video)}
          disabled={isGenerating}
          className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <QrCode size={16} aria-hidden="true" />
          {isGenerating ? 'Generating...' : 'Generate QR Code'}
        </button>
      </div>
    </div>
  );
}
