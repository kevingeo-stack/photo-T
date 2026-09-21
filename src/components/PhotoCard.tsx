import React, { useRef, useState } from 'react';
import { Photo } from '../types';
import { usePhotoThumbnail } from '../hooks/usePhotoThumbnail';

interface PhotoCardProps {
  photo: Photo;
  isSelected: boolean;
  onToggleSelect: (photoId: string) => void;
  onSetStatus: (photoId: string, status: 'kept' | 'rejected') => void;
  onSendToCompare: (photo: Photo) => void;
  onOpenLoupe: (photo: Photo) => void;
  onSetStarRating: (photoId: string, rating: number) => void;
  onDelete?: (photo: Photo) => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  isSelected,
  onToggleSelect,
  onSetStatus,
  onSendToCompare,
  onOpenLoupe,
  onSetStarRating,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { url, isLoading, error } = usePhotoThumbnail(photo.id);

  const handleCardClick = () => {
    onToggleSelect(photo.id);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect(photo.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col rounded-xl overflow-hidden bg-surface-container-low transition-all duration-200 border cursor-pointer ${
        isSelected
          ? 'border-primary shadow-[0_0_12px_rgba(78,222,163,0.3)] ring-1 ring-primary'
          : 'border-outline-variant/40 hover:border-outline hover:shadow-lg'
      }`}
    >
      {/* Media Viewport Container (3:2 Aspect Ratio) */}
      <div className="relative aspect-[3/2] w-full bg-surface-container-lowest overflow-hidden flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-on-surface-variant/50">
            <span className="material-symbols-outlined text-[32px] animate-pulse">image</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-error/60">
            <span className="material-symbols-outlined text-[32px]">broken_image</span>
            <span className="text-[11px] mt-1 font-mono">Error</span>
          </div>
        ) : (
          <img
            src={url}
            alt={photo.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        )}

        {/* Top Left Selection Checkbox */}
        <button
          onClick={handleCheckboxClick}
          className="absolute top-3 left-3 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          type="button"
          aria-label={isSelected ? "Deseleccionar foto" : "Seleccionar foto"}
        >
          {isSelected ? (
            <div className="w-full h-full rounded-full bg-primary flex items-center justify-center shadow-lg border border-primary/20">
              <span className="material-symbols-outlined text-on-primary text-[18px] font-bold">
                check
              </span>
            </div>
          ) : (
            <div className="w-full h-full rounded-full border-2 border-white/70 bg-black/30 backdrop-blur-sm group-hover:border-white transition-colors shadow-sm" />
          )}
        </button>

        {/* Top Right Badges: Format & AI Metric Pin */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          {photo.aiFlag && (
            <span
              className={`font-label-sm text-label-sm px-2 py-0.5 rounded-full backdrop-blur-md font-medium shadow-sm ${
                photo.aiFlag.includes('Blur') || photo.aiFlag.includes('Over')
                  ? 'bg-error/80 text-on-error'
                  : photo.aiFlag.includes('Eye-AF') || Number(photo.aiFlag) > 90
                  ? 'bg-primary/90 text-on-primary font-semibold'
                  : 'bg-black/60 text-on-surface'
              }`}
            >
              {photo.aiFlag}
            </span>
          )}

          <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-black/70 text-on-surface backdrop-blur-md font-mono">
            {photo.format}
          </span>
        </div>

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 text-center pointer-events-auto">
            <span className="material-symbols-outlined text-error text-[32px] mb-2">delete</span>
            <p className="text-sm font-semibold text-white mb-1">¿Eliminar esta foto?</p>
            <p className="text-xs text-white/50 mb-4 leading-tight">Esta acción quitará la foto de PhotoT.</p>
            <div className="flex gap-2 w-full justify-center">
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                className="px-3 py-1.5 rounded-lg bg-surface text-on-surface text-xs font-medium hover:bg-surface-variant transition-colors"
                type="button"
                data-testid="cancel-delete-btn"
              >
                Cancelar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                  if (onDelete) onDelete(photo);
                }}
                className="px-3 py-1.5 rounded-lg bg-error text-on-error text-xs font-medium hover:bg-error/80 transition-colors"
                type="button"
                data-testid="confirm-delete-btn"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        {/* Hover Ribbon Overlay with Quick Actions */}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5 pointer-events-none">
          <div className="flex items-center justify-between gap-1 pointer-events-auto">
            {/* Quick Triage Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetStatus(photo.id, 'kept');
                }}
                className={`p-1.5 rounded-lg backdrop-blur-md transition-colors ${
                  photo.status === 'kept'
                    ? 'bg-primary text-on-primary'
                    : 'bg-black/60 text-on-surface hover:bg-primary/80 hover:text-on-primary'
                }`}
                type="button"
                title="Keep [P]"
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetStatus(photo.id, 'rejected');
                }}
                className={`p-1.5 rounded-lg backdrop-blur-md transition-colors ${
                  photo.status === 'rejected'
                    ? 'bg-error text-on-error'
                    : 'bg-black/60 text-on-surface hover:bg-error/80 hover:text-on-error'
                }`}
                type="button"
                title="Discard [X]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSendToCompare(photo);
                }}
                className="p-1.5 rounded-lg bg-black/60 text-secondary hover:bg-secondary/80 hover:text-on-secondary backdrop-blur-md transition-colors"
                type="button"
                title="Enviar a ronda de comparación [C]"
              >
                <span className="material-symbols-outlined text-[18px]">compare</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              {/* Loupe full inspection */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLoupe(photo);
                }}
                className="p-1.5 rounded-lg bg-black/60 text-on-surface hover:bg-white/30 backdrop-blur-md transition-colors"
                type="button"
                title="100% Loupe Inspector"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>
              
              {/* Delete */}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className="p-1.5 rounded-lg bg-black/60 text-error hover:bg-error hover:text-on-error backdrop-blur-md transition-colors"
                  type="button"
                  title="Eliminar foto"
                  data-testid="delete-photo-card-btn"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Photo EXIF & Details Footer Tray */}
      <div className="p-3 bg-surface-container-low flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center justify-between">
          <span className="font-body-md text-body-md font-medium text-on-surface truncate" title={photo.name}>
            {photo.name}
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant font-mono whitespace-nowrap ml-2">
            {photo.sizeFormatted}
          </span>
        </div>

        {/* Simplified EXIF line */}
        <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
          <div className="flex items-center gap-1.5 truncate">
            {photo.exif.shutter && <span>{photo.exif.shutter}</span>}
            {photo.exif.shutter && photo.exif.aperture && <span>·</span>}
            {photo.exif.aperture && <span>{photo.exif.aperture}</span>}
            {photo.exif.aperture && photo.exif.iso && <span>·</span>}
            {photo.exif.iso && <span>ISO {photo.exif.iso}</span>}
          </div>
          {photo.exif.focalLength && (
            <span className="font-mono text-secondary ml-2">{photo.exif.focalLength}</span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-outline-variant/30 text-[11px] text-on-surface-variant pointer-events-auto">
          <span className="truncate pointer-events-none">{photo.exif.camera}</span>
          {/* Star Rating Scrubber */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={(e) => {
                  e.stopPropagation();
                  onSetStarRating(photo.id, star === photo.starRating ? 0 : star);
                }}
                className="text-on-surface-variant hover:text-amber-400 focus:outline-none"
                type="button"
              >
                <span className={`material-symbols-outlined text-[14px] ${star <= photo.starRating ? 'text-amber-400 font-variation-fill' : 'opacity-40'}`}>
                  star
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
