import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const QRCodeVisual = ({
  value,
  size = 120,
  className = '',
  includeDownload = false,
  fileName = 'SMP_QRCode'
}) => {
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!value) {
      setDataUrl('');
      return;
    }

    QRCode.toDataURL(
      String(value),
      {
        width: size * 2, // 2x for sharp rendering on retina screens
        margin: 1.5,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      },
      (err, url) => {
        if (err) {
          console.error('QR code generation error:', err);
          setError('Failed to render QR');
        } else {
          setError(null);
          setDataUrl(url);
        }
      }
    );
  }, [value, size]);

  if (!value) {
    return <span className="text-muted small fst-italic">No QR payload</span>;
  }

  if (error) {
    return <span className="text-danger small">{error}</span>;
  }

  return (
    <div className={`d-inline-flex flex-column align-items-center ${className}`}>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="QR Code"
          style={{ width: `${size}px`, height: `${size}px`, borderRadius: '6px' }}
          className="bg-white p-1 shadow-sm border border-secondary"
        />
      ) : (
        <div
          style={{ width: `${size}px`, height: `${size}px` }}
          className="d-flex align-items-center justify-content-center bg-secondary rounded"
        >
          <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
        </div>
      )}
      {includeDownload && dataUrl && (
        <a
          href={dataUrl}
          download={`${fileName}.png`}
          className="btn btn-sm btn-outline-primary mt-2 py-0 px-2"
          style={{ fontSize: '11px' }}
        >
          <i className="bi bi-download me-1"></i> Download PNG
        </a>
      )}
    </div>
  );
};

export default QRCodeVisual;
