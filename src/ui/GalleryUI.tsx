import React, { useEffect, useRef, useState } from 'react';
import { PhotoManager } from '../services/PhotoManager';
import { AppController } from '../controllers/AppController';
import { ComparisonManager } from '../services/ComparisonManager';
import { ThemeManager } from '../services/ThemeManager';
import { Photo, SortMode, TriageFolder } from '../types';

interface GalleryUIProps {
  onOpenLoupe?: (photo: Photo) => void;
}

export const GalleryUI: React.FC<GalleryUIProps> = ({ onOpenLoupe }) => {
  const photoManager = PhotoManager.getInstance();
  const controller = AppController.getInstance();
  const comparisonManager = ComparisonManager.getInstance();
  const themeManager = ThemeManager.getInstance();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>(photoManager.getFilteredPhotos());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(photoManager.getSelectedIds()));
  const [activeFolder, setActiveFolder] = useState<TriageFolder>(photoManager.getActiveFolder());
  const [sortMode, setSortMode] = useState<SortMode>(photoManager.getSortMode());
  const [density, setDensity] = useState<number>(themeManager.getDensity());
  const [ingestion, setIngestion] = useState(photoManager.getIngestionProgress());
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const unsubPhotos = photoManager.subscribe(() => {
      setPhotos(photoManager.getFilteredPhotos());
      setSelectedIds(new Set(photoManager.getSelectedIds()));
      setActiveFolder(photoManager.getActiveFolder());
      setSortMode(photoManager.getSortMode());
      setIngestion(photoManager.getIngestionProgress());
    });

    const unsubTheme = themeManager.subscribe(() => {
      setDensity(themeManager.getDensity());
    });

    return () => {
      unsubPhotos();
      unsubTheme();
    };
  }, [photoManager, themeManager]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await photoManager.importFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await photoManager.importFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleSendToCompare = (photo: Photo) => {
    comparisonManager.setCandidateB(photo.id);
    controller.setMode('compare');
  };

  const getGridColsClass = () => {
    if (density === 1) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
    if (density === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  };

  const allSelected = photos.length > 0 && photos.every((p) => selectedIds.has(p.id));

  return (
    <div className="flex-1 min-h-screen pl-64 pt-14 pb-16 bg-surface text-on-surface">
      <div className="p-space-lg max-w-[1920px] mx-auto flex flex-col gap-space-md">
        {/* Ingestion & Drag-and-Drop Dropzone Header */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-all cursor-pointer p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 ${
            isDragOver
              ? 'border-primary bg-primary/10 shadow-[0_0_24px_rgba(78,222,163,0.25)]'
              : 'border-outline-variant/60 bg-surface-container-low/70 hover:border-outline hover:bg-surface-container-low'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            multiple
            accept=".cr3,.arw,.nef,.dng,.jpg,.jpeg,.png,.tiff"
            className="hidden"
          />

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary shadow-inner">
              <span className="material-symbols-outlined text-[28px]">
                {isDragOver ? 'file_download' : 'add_photo_alternate'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-on-surface">
                  Zona de Carga de Alta Velocidad
                </span>
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-high text-secondary">
                  E/S Directa
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Arrastra y suelta tarjetas RAW o haz clic para importar. Almacenado en IndexedDB con sincronización en la nube.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="font-label-sm text-label-sm px-2 py-1 rounded bg-surface-container text-on-surface-variant">
              .CR3
            </span>
            <span className="font-label-sm text-label-sm px-2 py-1 rounded bg-surface-container text-on-surface-variant">
              .ARW
            </span>
            <span className="font-label-sm text-label-sm px-2 py-1 rounded bg-surface-container text-on-surface-variant">
              .NEF
            </span>
            <span className="font-label-sm text-label-sm px-2 py-1 rounded bg-surface-container text-on-surface-variant">
              .DNG
            </span>
            <span className="font-label-sm text-label-sm px-2 py-1 rounded bg-surface-container text-on-surface-variant">
              .JPG
            </span>
          </div>
        </div>

        {/* Live Ingestion Pipeline Banner (from Stitch design) */}
        {ingestion.active && (
          <div className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-space-md shadow-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md w-full md:w-auto">
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[20px] animate-spin">
                  sync
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-label-lg text-label-lg text-on-surface">
                    Importando {ingestion.totalFiles} archivos de {ingestion.source}
                  </span>
                  <span className="font-label-sm text-label-sm text-primary font-semibold">
                    {ingestion.percentage}%
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Procesados {ingestion.processedFiles} de {ingestion.totalFiles} fotos RAW · {ingestion.speedMBs} MB/s
                </span>
              </div>
            </div>

            <div className="flex items-center gap-space-md w-full md:w-72">
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(78,222,163,0.5)]"
                  style={{ width: `${ingestion.percentage}%` }}
                ></div>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">
                1.2 / 1.5 GB
              </span>
            </div>
          </div>
        )}

        {/* Sticky Workspace Controller Bar */}
        <div className="sticky top-14 z-30 bg-surface-container-low/95 backdrop-blur-md p-space-sm rounded-xl border border-outline-variant/40 shadow-md flex flex-wrap items-center justify-between gap-space-sm">
          {/* Left Actions */}
          <div className="flex items-center gap-space-sm">
            <label className="flex items-center gap-2 px-space-sm py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high cursor-pointer transition-colors text-label-md">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => photoManager.selectAll(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-0 focus:ring-offset-0 bg-surface-container-highest border-outline-variant"
              />
              <span className="text-on-surface">Seleccionar Todo</span>
            </label>

            <button
              onClick={() => photoManager.batchKeep()}
              className="flex items-center gap-1.5 px-space-sm py-1.5 rounded-lg bg-surface-container hover:bg-primary/20 text-primary transition-colors text-label-md font-medium"
              type="button"
              title="Batch Keep [P]"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Mantener (Lote) [P]</span>
            </button>

            <button
              onClick={() => photoManager.batchDiscard()}
              className="flex items-center gap-1.5 px-space-sm py-1.5 rounded-lg bg-surface-container hover:bg-error/20 text-error transition-colors text-label-md font-medium"
              type="button"
              title="Batch Discard [X]"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              <span>Descartar (Lote) [X]</span>
            </button>
          </div>

          {/* Center: Quick Triage Filters */}
          <div className="flex items-center bg-surface-container-lowest p-1 rounded-lg gap-1 border border-outline-variant/30">
            <button
              onClick={() => photoManager.setFolder('all')}
              className={`px-3 py-1 rounded text-label-sm font-label-sm transition-all ${
                activeFolder === 'all'
                  ? 'bg-surface-container-highest text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => photoManager.setFolder('unrated')}
              className={`px-3 py-1 rounded text-label-sm font-label-sm transition-all ${
                activeFolder === 'unrated'
                  ? 'bg-surface-container-highest text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sin Calificar
            </button>
            <button
              onClick={() => photoManager.setFolder('flagged')}
              className={`px-3 py-1 rounded text-label-sm font-label-sm transition-all ${
                activeFolder === 'flagged'
                  ? 'bg-surface-container-highest text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Marcadas
            </button>
            <button
              onClick={() => photoManager.setFolder('rejected')}
              className={`px-3 py-1 rounded text-label-sm font-label-sm transition-all ${
                activeFolder === 'rejected'
                  ? 'bg-surface-container-highest text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Rechazadas
            </button>
          </div>

          {/* Right: Sort, Density, Compare Switch */}
          <div className="flex items-center gap-space-sm">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-surface-container px-space-sm py-1.5 rounded-lg text-label-sm">
              <span className="material-symbols-outlined text-[15px] text-on-surface-variant">
                sort
              </span>
              <select
                value={sortMode}
                onChange={(e) => photoManager.setSortMode(e.target.value as SortMode)}
                aria-label="Sort photos by"
                className="bg-transparent text-on-surface focus:outline-none cursor-pointer"
              >
                <option value="capture-desc" className="bg-surface-container">Hora de Captura (Más nuevas)</option>
                <option value="capture-asc" className="bg-surface-container">Hora de Captura (Más viejas)</option>
                <option value="sharpness" className="bg-surface-container">Puntuación AI de Nitidez</option>
                <option value="iso" className="bg-surface-container">Velocidad ISO</option>
                <option value="filesize" className="bg-surface-container">Tamaño de Archivo</option>
              </select>
            </div>

            {/* Density buttons */}
            <div className="hidden sm:flex items-center bg-surface-container p-1 rounded-lg gap-1">
              <button
                onClick={() => themeManager.setDensity(1)}
                className={`p-1 rounded ${density === 1 ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant'}`}
                title="Dense View"
              >
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
              </button>
              <button
                onClick={() => themeManager.setDensity(2)}
                className={`p-1 rounded ${density === 2 ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant'}`}
                title="Standard View"
              >
                <span className="material-symbols-outlined text-[16px]">view_module</span>
              </button>
              <button
                onClick={() => themeManager.setDensity(3)}
                className={`p-1 rounded ${density === 3 ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant'}`}
                title="Large View"
              >
                <span className="material-symbols-outlined text-[16px]">view_agenda</span>
              </button>
            </div>

            {/* 2-Up HUD Compare Button */}
            <button
              onClick={() => controller.setMode('compare')}
              className="flex items-center gap-1.5 px-space-sm py-1.5 rounded-lg bg-surface-container hover:bg-secondary/20 text-secondary transition-colors text-label-md font-medium shadow-sm"
              type="button"
              title="Compare 2-Up [C]"
            >
              <span className="material-symbols-outlined text-[16px]">compare</span>
              <span>Comparar 2-Up [C]</span>
            </button>
          </div>
        </div>

        {/* Contact Sheet Grid Matrix */}
        {photos.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 mb-3">
              photo_library
            </span>
            <p className="font-headline-sm text-headline-sm text-on-surface mb-1">
              No se encontraron fotos en esta vista
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
              Intenta cambiar tu filtro o arrastra nuevas fotos RAW al área de carga de arriba.
            </p>
          </div>
        ) : (
          <div className={`grid ${getGridColsClass()} gap-space-md`}>
            {photos.map((photo) => {
              const isSelected = selectedIds.has(photo.id);

              return (
                <div
                  key={photo.id}
                  className={`group relative flex flex-col rounded-xl overflow-hidden bg-surface-container-low transition-all duration-200 border ${
                    isSelected
                      ? 'border-primary shadow-[0_0_12px_rgba(78,222,163,0.3)] ring-1 ring-primary'
                      : 'border-outline-variant/40 hover:border-outline hover:shadow-lg'
                  }`}
                >
                  {/* Media Viewport Container (3:2 Aspect Ratio) */}
                  <div className="relative aspect-[3/2] w-full bg-surface-container-lowest overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />

                    {/* Top Left Selection Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        photoManager.toggleSelect(photo.id);
                      }}
                      className="absolute top-2.5 left-2.5 z-20 w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-md transition-transform active:scale-95"
                      type="button"
                    >
                      {isSelected ? (
                        <span className="material-symbols-outlined text-primary text-[22px] drop-shadow-md">
                          check_circle
                        </span>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-white/60 bg-black/40 hover:border-white transition-colors" />
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

                    {/* Status Pill on Bottom Left of Image */}
                    <div className="absolute bottom-2.5 left-2.5 z-20">
                      {photo.status === 'kept' && (
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-primary/90 text-on-primary font-semibold shadow-sm backdrop-blur-sm">
                          <span className="material-symbols-outlined text-[12px]">check</span>
                          Marcada
                        </span>
                      )}
                      {photo.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-error/90 text-on-error font-semibold shadow-sm backdrop-blur-sm">
                          <span className="material-symbols-outlined text-[12px]">close</span>
                          Rechazada
                        </span>
                      )}
                      {photo.status === 'unrated' && (
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high/80 text-on-surface-variant font-medium shadow-sm backdrop-blur-sm">
                          Sin Calificar
                        </span>
                      )}
                    </div>

                    {/* Hover Ribbon Overlay with Quick Actions */}
                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                      <div className="flex items-center justify-between gap-1">
                        {/* Quick Triage Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              photoManager.setStatus(photo.id, 'kept');
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
                              photoManager.setStatus(photo.id, 'rejected');
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
                              handleSendToCompare(photo);
                            }}
                            className="p-1.5 rounded-lg bg-black/60 text-secondary hover:bg-secondary/80 hover:text-on-secondary backdrop-blur-md transition-colors"
                            type="button"
                            title="Compare 2-Up [C]"
                          >
                            <span className="material-symbols-outlined text-[18px]">compare</span>
                          </button>
                        </div>

                        {/* Loupe full inspection */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenLoupe) onOpenLoupe(photo);
                          }}
                          className="p-1.5 rounded-lg bg-black/60 text-on-surface hover:bg-white/30 backdrop-blur-md transition-colors"
                          type="button"
                          title="100% Loupe Inspector"
                        >
                          <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Photo EXIF & Details Footer Tray */}
                  <div className="p-3 bg-surface-container-low flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-body-md text-body-md font-medium text-on-surface truncate" title={photo.name}>
                        {photo.name}
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-mono whitespace-nowrap ml-2">
                        {photo.sizeFormatted}
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                      <div className="flex items-center gap-1.5 truncate">
                        <span>{photo.exif.shutter}</span>
                        <span>·</span>
                        <span>{photo.exif.aperture}</span>
                        <span>·</span>
                        <span>ISO {photo.exif.iso}</span>
                      </div>
                      <span className="font-mono text-secondary ml-1">{photo.exif.focalLength}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-outline-variant/30 text-[11px] text-on-surface-variant">
                      <span className="truncate">{photo.exif.camera}</span>
                      {/* Star Rating Scrubber */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => photoManager.setStarRating(photo.id, star === photo.starRating ? 0 : star)}
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
            })}
          </div>
        )}
      </div>
    </div>
  );
};
