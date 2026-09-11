import React, { useState } from 'react';
import { Photo } from '../types';
import { PhotoManager } from '../services/PhotoManager';

interface LoupeModalProps {
  photo: Photo | null;
  onClose: () => void;
}

export const LoupeModal: React.FC<LoupeModalProps> = ({ photo, onClose }) => {
  const photoManager = PhotoManager.getInstance();
  const [zoom, setZoom] = useState<number>(1.5);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isPanning, setIsPanning] = useState<boolean>(false);

  if (!photo) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setPosition({ x, y });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md select-none">
      {/* Top Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-surface-container-lowest/80">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <div>
            <span className="font-headline-sm text-on-surface font-semibold">{photo.name}</span>
            <span className="ml-2 font-mono text-xs text-on-surface-variant">
              {photo.exif.dimensions} · {photo.exif.megapixels}
            </span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface-container p-1 rounded-lg gap-1 text-label-sm">
            {[1.0, 1.5, 2.5, 4.0].map((scale) => (
              <button
                key={scale}
                onClick={() => setZoom(scale)}
                className={`px-2.5 py-1 rounded transition-all font-mono ${
                  zoom === scale
                    ? 'bg-primary text-on-primary font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {Math.round(scale * 100)}%
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-white/20" />

          {/* Keep / Discard in Loupe */}
          <button
            onClick={() => photoManager.setStatus(photo.id, 'kept')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-label-md transition-colors ${
              photo.status === 'kept'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container hover:bg-primary/30 text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">check</span>
            <span>Mantener [P]</span>
          </button>

          <button
            onClick={() => photoManager.setStatus(photo.id, 'rejected')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-label-md transition-colors ${
              photo.status === 'rejected'
                ? 'bg-error text-on-error'
                : 'bg-surface-container hover:bg-error/30 text-error'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
            <span>Descartar [X]</span>
          </button>
        </div>
      </div>

      {/* Main High-Resolution Canvas with 1:1 Loupe */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center cursor-crosshair"
        onMouseDown={() => setIsPanning(true)}
        onMouseUp={() => setIsPanning(false)}
        onMouseLeave={() => setIsPanning(false)}
        onMouseMove={handleMouseMove}
      >
        <img
          src={photo.url}
          alt={photo.name}
          referrerPolicy="no-referrer"
          className="max-w-none transition-transform duration-75"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: `${position.x}% ${position.y}%`
          }}
        />

        {/* Floating EXIF HUD */}
        <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 font-mono text-xs text-on-surface flex items-center gap-3 pointer-events-none">
          <span>{photo.exif.shutter}</span>
          <span>·</span>
          <span>{photo.exif.aperture}</span>
          <span>·</span>
          <span>ISO {photo.exif.iso}</span>
          <span>·</span>
          <span>{photo.exif.lens}</span>
          <span>·</span>
          <span className="text-primary font-bold">Nitidez {photo.sharpnessScore}%</span>
        </div>
      </div>
    </div>
  );
};
