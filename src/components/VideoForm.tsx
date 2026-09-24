import { useState, type FormEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import { validateThumbnailFile } from '../services/videoService';
import type { Video } from '../types';

interface VideoFormProps {
  initialVideo?: Video;
  onSubmit: (input: { name: string; description: string }, thumbnailFile: File | null) => Promise<void>;
  onCancel: () => void;
}

export function VideoForm({ initialVideo, onSubmit, onCancel }: VideoFormProps) {
  const [name, setName] = useState(initialVideo?.name ?? '');
  const [description, setDescription] = useState(initialVideo?.description ?? '');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialVideo?.thumbnail_url ?? null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setThumbnailFile(null);
      return;
    }
    const validationError = validateThumbnailFile(file);
    if (validationError) {
      setFileError(validationError);
      setThumbnailFile(null);
      return;
    }
    setFileError(null);
    setThumbnailFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), description: description.trim() }, thumbnailFile);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to save video. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="video-name" className="mb-1 block text-sm font-medium text-slate-700">
          Video Name
        </label>
        <input
          id="video-name"
          type="text"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label htmlFor="video-description" className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="video-description"
          rows={3}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label htmlFor="video-thumbnail" className="mb-1 block text-sm font-medium text-slate-700">
          Thumbnail Image
        </label>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {previewUrl ? (
              <img src={previewUrl} alt="Thumbnail preview" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="text-slate-300" size={24} aria-hidden="true" />
            )}
          </div>
          <input
            id="video-thumbnail"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
          />
        </div>
        <p className="mt-1 text-xs text-slate-400">JPG, PNG, or WEBP. Max 4 MB.</p>
        {fileError && <p className="mt-1 text-xs text-danger-600">{fileError}</p>}
      </div>

      {initialVideo && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Video Code <span className="font-mono font-semibold text-slate-700">{initialVideo.video_code}</span>{' '}
          cannot be changed.
        </p>
      )}

      {submitError && (
        <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">
          {submitError}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : initialVideo ? 'Save Changes' : 'Add Video'}
        </button>
      </div>
    </form>
  );
}
