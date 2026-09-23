import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ImageOff, QrCode, RotateCcw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/Modal';
import { VideoForm } from '../../components/VideoForm';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { QRModal } from '../../components/QRModal';
import { TableRowSkeleton } from '../../components/Skeletons';
import {
  fetchAllVideosWithCounts,
  createVideo,
  updateVideo,
  softDeleteVideo,
  restoreVideo,
  type VideoInput,
} from '../../services/videoService';
import { useQrGeneration } from '../../hooks/useQrGeneration';
import { toFriendlyError } from '../../utils/errors';
import type { Video } from '../../types';

type ModalState = { type: 'add' } | { type: 'edit'; video: Video } | { type: 'delete'; video: Video } | null;

export function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { generate, generatingVideoId, activeResult, closeResult } = useQrGeneration();
  const navigate = useNavigate();

  async function loadVideos() {
    try {
      const data = await fetchAllVideosWithCounts();
      setVideos(data);
    } catch (err) {
      setError(toFriendlyError(err, 'Unable to load videos.'));
    }
  }

  useEffect(() => {
    loadVideos();
  }, []);

  const filteredVideos = useMemo(() => {
    if (!videos) return [];
    const term = search.trim().toLowerCase();
    if (!term) return videos;
    return videos.filter(
      (v) => v.name.toLowerCase().includes(term) || v.video_code.toLowerCase().includes(term)
    );
  }, [videos, search]);

  async function handleCreate(input: VideoInput, thumbnailFile: File | null) {
    await createVideo(input, thumbnailFile);
    toast.success('Video added successfully.');
    setModal(null);
    await loadVideos();
  }

  async function handleUpdate(id: string, input: VideoInput, thumbnailFile: File | null) {
    await updateVideo(id, input, thumbnailFile);
    toast.success('Video updated successfully.');
    setModal(null);
    await loadVideos();
  }

  async function handleDelete(video: Video) {
    setIsDeleting(true);
    try {
      await softDeleteVideo(video.id);
      toast.success('Video deleted.');
      setModal(null);
      await loadVideos();
    } catch (err) {
      toast.error(toFriendlyError(err, 'Unable to delete video.'));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleRestore(video: Video) {
    try {
      await restoreVideo(video.id);
      toast.success('Video restored.');
      await loadVideos();
    } catch (err) {
      toast.error(toFriendlyError(err, 'Unable to restore video.'));
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Videos</h1>
          <p className="mt-1 text-sm text-slate-500">Manage the video library and its automatically assigned codes.</p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ type: 'add' })}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus size={16} aria-hidden="true" />
          Add Video
        </button>
      </div>

      <div className="relative mb-4 w-full sm:w-72">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or code..."
          aria-label="Search videos"
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-600">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Thumbnail</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">QR Codes</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!videos && (
              <>
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
              </>
            )}
            {videos &&
              filteredVideos.map((video) => (
                <tr key={video.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex h-12 w-16 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageOff size={16} className="text-slate-300" aria-hidden="true" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{video.name}</p>
                    <p className="line-clamp-1 max-w-xs text-xs text-slate-400">{video.description}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">{video.video_code}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/qr-history?search=${video.video_code}`)}
                      className="font-medium text-brand-600 hover:underline"
                      title="View QR generation history for this video"
                    >
                      {video.qr_count ?? 0}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {video.is_deleted ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Deleted
                      </span>
                    ) : (
                      <span className="rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {!video.is_deleted && (
                        <button
                          type="button"
                          onClick={() => generate(video)}
                          disabled={generatingVideoId === video.id}
                          aria-label={`Generate QR code for ${video.name}`}
                          title="Generate QR code"
                          className="rounded-lg p-2 text-brand-600 hover:bg-brand-50 disabled:opacity-50"
                        >
                          <QrCode size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setModal({ type: 'edit', video })}
                        aria-label={`Edit ${video.name}`}
                        title="Edit"
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                      >
                        <Pencil size={16} />
                      </button>
                      {video.is_deleted ? (
                        <button
                          type="button"
                          onClick={() => handleRestore(video)}
                          aria-label={`Restore ${video.name}`}
                          title="Restore"
                          className="rounded-lg p-2 text-success-600 hover:bg-success-50"
                        >
                          <RotateCcw size={16} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setModal({ type: 'delete', video })}
                          aria-label={`Delete ${video.name}`}
                          title="Delete"
                          className="rounded-lg p-2 text-danger-600 hover:bg-danger-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {videos && filteredVideos.length === 0 && (
          <div className="p-2">
            <EmptyState title={search ? 'No videos match your search.' : 'No videos have been added yet.'} />
          </div>
        )}
      </div>

      {modal?.type === 'add' && (
        <Modal title="Add Video" onClose={() => setModal(null)}>
          <VideoForm onSubmit={handleCreate} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title="Edit Video" onClose={() => setModal(null)}>
          <VideoForm
            initialVideo={modal.video}
            onSubmit={(input, file) => handleUpdate(modal.video.id, input, file)}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.type === 'delete' && (
        <ConfirmDialog
          title="Delete Video"
          message={`Are you sure you want to delete "${modal.video.name}" (${modal.video.video_code})? It will be hidden from users, but its QR generation history will be preserved.`}
          confirmLabel="Delete"
          danger
          isBusy={isDeleting}
          onConfirm={() => handleDelete(modal.video)}
          onCancel={() => setModal(null)}
        />
      )}

      {activeResult && (
        <QRModal video={activeResult.video} qrGeneration={activeResult.qr} onClose={closeResult} />
      )}
    </div>
  );
}
