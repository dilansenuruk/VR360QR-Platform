import QRCode from 'qrcode';

/**
 * Renders a QR payload to a high-resolution PNG data URL. 512px with a
 * quiet margin and 'H' error correction keeps the code scannable even when
 * printed small or on imperfect surfaces.
 */
export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Opens a minimal print-friendly window containing just the QR image and key details. */
export function printQrImage(dataUrl: string, title: string, subtitle: string): void {
  const printWindow = window.open('', '_blank', 'width=480,height=600');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, sans-serif; text-align: center; padding: 24px; }
          img { width: 320px; height: 320px; }
          h1 { font-size: 18px; margin: 16px 0 4px; }
          p { font-size: 13px; color: #555; margin: 0; }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" alt="QR code" />
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
