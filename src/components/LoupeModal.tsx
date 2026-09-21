import React, { useEffect, useState } from 'react';
import { Photo } from '../types';
import { usePhotoOriginal } from '../hooks/usePhotoOriginal';
import { usePhotoThumbnail } from '../hooks/usePhotoThumbnail';

interface LoupeModalProps {
  photo: Photo | null;
  onClose: () => void;
}

// Inner component that loads the image — rendered only when photo is set
const LoupeContent: React.FC<{ photo: Photo; onClose: () => void }> = ({ photo, onClose }) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Determine if this is a web-displayable format
  const webFormats = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'BMP'];
  const isWebFormat = webFormats.includes((photo.format || '').toUpperCase());

  // Load full original for web formats; thumbnail for RAW/unsupported
  const { url: originalUrl, isLoading: originalLoading } = usePhotoOriginal(isWebFormat ? photo.id : undefined);
  const { url: thumbUrl, isLoading: thumbLoading } = usePhotoThumbnail(!isWebFormat ? photo.id : undefined);

  const imageUrl = isWebFormat ? originalUrl : thumbUrl;
  const isLoading = isWebFormat ? originalLoading : thumbLoading;

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // If zoom is 1, track mouse so we zoom into the correct spot.
    // If dragging, track mouse to pan.
    if (zoom <= 1 || isDragging) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setPosition({ x, y });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // We cannot preventDefault here reliably due to passive listeners in React,
    // but body overflow:hidden prevents page scroll anyway.
    const delta = e.deltaY;
    setZoom((prev) => {
      // Zoom step: 15%
      let next = delta < 0 ? prev * 1.15 : prev / 1.15;
      return Math.max(0.25, Math.min(8.0, next));
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/96 select-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa de ${photo.name}`}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 h-14 px-4 flex items-center justify-between border-b border-white/10 bg-[#0e0e11]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 rounded-lg bg-white/8 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
            type="button"
            title="Cerrar (Escape)"
            data-testid="loupe-close-btn"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-[400px]">{photo.name}</p>
            <p className="text-[11px] text-white/40 font-mono">
              {photo.format} · {photo.sizeFormatted}
              {photo.exif?.dimensions && ` · ${photo.exif.dimensions}`}
            </p>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center bg-white/8 rounded-lg p-1 gap-0.5">
          {[1.0, 1.5, 2.5, 4.0].map((scale) => (
            <button
              key={scale}
              onClick={() => setZoom(scale)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                zoom === scale
                  ? 'bg-primary text-on-primary font-bold'
                  : 'text-white/50 hover:text-white'
              }`}
              type="button"
            >
              {Math.round(scale * 100)}%
            </button>
          ))}
        </div>
      </div>

      {/* ── Image area ─────────────────────────────────────────────────────── */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center"
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        onMouseDown={() => zoom > 1 && setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        data-testid="loupe-image-area"
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[40px] text-white/30 animate-pulse">image</span>
            <p className="text-sm text-white/40">Cargando imagen…</p>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={photo.name}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-full object-contain transition-transform duration-100"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: zoom > 1 ? `${position.x}% ${position.y}%` : 'center center'
            }}
            onClick={(e) => e.stopPropagation()} // don't close when clicking the image
            draggable={false}
            data-testid="loupe-image"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-center px-8">
            <span className="material-symbols-outlined text-[48px] text-white/20">broken_image</span>
            <p className="text-sm text-white/50">No se pudo cargar la imagen</p>
            {!isWebFormat && (
              <p className="text-xs text-white/30 max-w-xs">
                Los archivos {photo.format} no se pueden previsualizar directamente en el navegador. Se intentó usar el thumbnail generado.
              </p>
            )}
          </div>
        )}

        {/* EXIF HUD */}
        {imageUrl && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 font-mono text-xs text-white/70 flex items-center gap-3 pointer-events-none whitespace-nowrap">
            {photo.exif?.shutter && <span>{photo.exif.shutter}</span>}
            {photo.exif?.aperture && <><span className="text-white/30">·</span><span>{photo.exif.aperture}</span></>}
            {photo.exif?.iso && <><span className="text-white/30">·</span><span>ISO {photo.exif.iso}</span></>}
            {photo.exif?.lens && <><span className="text-white/30">·</span><span className="hidden sm:inline">{photo.exif.lens}</span></>}
          </div>
        )}
      </div>
    </div>
  );
};

export const LoupeModal: React.FC<LoupeModalProps> = ({ photo, onClose }) => {
  if (!photo) return null;
  return <LoupeContent photo={photo} onClose={onClose} />;
};
