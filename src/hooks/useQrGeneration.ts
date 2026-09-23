import { useState } from 'react';
import toast from 'react-hot-toast';
import { generateQrCode } from '../services/qrService';
import { toFriendlyError } from '../utils/errors';
import type { QrGeneration, Video } from '../types';

/**
 * Encapsulates the "click Generate QR" flow used on both the user videos
 * page and the admin videos page. `generatingVideoId` is used to disable
 * the button for the specific card being generated, preventing duplicate
 * submissions from rapid clicks.
 */
export function useQrGeneration() {
  const [generatingVideoId, setGeneratingVideoId] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<{ video: Video; qr: QrGeneration } | null>(null);

  async function generate(video: Video) {
    if (generatingVideoId) return; // guard against double-clicks / concurrent generations
    setGeneratingVideoId(video.id);
    try {
      const qr = await generateQrCode(video.id);
      setActiveResult({ video, qr });
      toast.success('QR code generated successfully.');
    } catch (err) {
      toast.error(toFriendlyError(err, 'Unable to generate QR code. Please try again.'));
    } finally {
      setGeneratingVideoId(null);
    }
  }

  function closeResult() {
    setActiveResult(null);
  }

  return { generate, generatingVideoId, activeResult, closeResult };
}
