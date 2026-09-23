import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Modal } from './Modal';
import { generateQrDataUrl, downloadDataUrl, printQrImage } from '../utils/qrImage';
import { formatDateTime } from '../utils/format';
import type { QrGeneration, Video } from '../types';

interface QRModalProps {
  video: Video;
  qrGeneration: QrGeneration;
  onClose: () => void;
}

export function QRModal({ video, qrGeneration, onClose }: QRModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    generateQrDataUrl(qrGeneration.payload).then((url) => {
      if (isMounted) setDataUrl(url);
    });
    return () => {
      isMounted = false;
    };
  }, [qrGeneration.payload]);

  const subtitle = `${video.name} (${video.video_code}) - Tracking ID: ${qrGeneration.tracking_id}`;

  return (
    <Modal title="QR Code Generated" onClose={onClose} widthClassName="max-w-sm">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-64 w-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
          {dataUrl ? (
            <img src={dataUrl} alt={`QR code for ${qrGeneration.payload}`} className="h-56 w-56" />
          ) : (
            <div className="skeleton h-56 w-56 rounded-lg" />
          )}
        </div>

        <dl className="mt-4 w-full space-y-1.5 text-left text-sm">
          <Row label="Video Name" value={video.name} />
          <Row label="Video Code" value={video.video_code} />
          <Row label="QR Tracking ID" value={qrGeneration.tracking_id} mono />
          <Row label="Full Payload" value={qrGeneration.payload} mono />
          <Row label="Generated At" value={formatDateTime(qrGeneration.generated_at)} />
        </dl>

        <div className="mt-6 grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!dataUrl}
            onClick={() => dataUrl && downloadDataUrl(dataUrl, `qr-${qrGeneration.payload}.png`)}
            className="flex items-center justify-center gap-2 rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white hover:bg-success-700 disabled:opacity-50"
          >
            <Download size={16} aria-hidden="true" />
            Download
          </button>
          <button
            type="button"
            disabled={!dataUrl}
            onClick={() => dataUrl && printQrImage(dataUrl, video.name, subtitle)}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Printer size={16} aria-hidden="true" />
            Print
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
