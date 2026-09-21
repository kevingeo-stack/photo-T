import React, { useEffect, useRef, useState } from 'react';
import { PhotoManager } from '../services/PhotoManager';
import { AppController } from '../controllers/AppController';
import { ComparisonManager } from '../services/ComparisonManager';
import { ThemeManager } from '../services/ThemeManager';
import { Photo, SortMode, TriageFolder } from '../types';
import { PhotoCard } from '../components/PhotoCard';

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
    // Phase 2.2B: Single photo compare is disabled in King of the Hill mode.
    // Use multi-selection instead.
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
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all cursor-pointer p-6 sm:p-8 flex flex-col md:flex-row items-center justify-center gap-6 text-center ${
            isDragOver
              ? 'border-primary bg-primary/10 shadow-[0_0_24px_rgba(78,222,163,0.25)]'
              : 'border-outline-variant/40 bg-surface-container-low/50 hover:border-outline/80 hover:bg-surface-container-low'
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

          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center text-primary shadow-inner">
              <span className="material-symbols-outlined text-[32px]">
                {isDragOver ? 'file_download' : 'add_photo_alternate'}
              </span>
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md text-on-surface font-semibold mb-2">
                Selecciona tus mejores fotos
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto">
                Arrastra tus fotos RAW o JPG aquí, o haz clic para seleccionarlas y comenzar.
              </p>
            </div>
          </div>
        </div>

        {/* Live Ingestion Pipeline Banner (from Stitch design) */}
        {ingestion.active && (
          <div className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-space-md shadow-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md w-full md:w-auto">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${ingestion.percentage === 100 ? 'bg-primary/20 text-primary' : 'bg-surface-container text-secondary'}`}>
                <span className={`material-symbols-outlined text-[20px] ${ingestion.percentage === 100 ? '' : 'animate-spin'}`}>
                  {ingestion.percentage === 100 ? 'check' : 'sync'}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-label-lg text-label-lg text-on-surface">
                    {ingestion.percentage === 100 
                      ? 'Importación completada' 
                      : `Importando ${ingestion.totalFiles} fotos`}
                  </span>
                  {ingestion.percentage < 100 && (
                    <span className="font-label-sm text-label-sm text-primary font-semibold">
                      {ingestion.percentage}%
                    </span>
                  )}
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {ingestion.percentage === 100 
                    ? `${ingestion.processedFiles} de ${ingestion.totalFiles} fotos`
                    : `Procesadas ${ingestion.processedFiles} de ${ingestion.totalFiles}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-space-md w-full md:w-48">
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(78,222,163,0.5)]"
                  style={{ width: `${ingestion.percentage}%` }}
                ></div>
              </div>
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

            {/* Compare Rounds Button */}
            <button
              onClick={() => controller.startComparisonWithSelection()}
              className="flex items-center gap-1.5 px-space-sm py-1.5 rounded-lg bg-surface-container hover:bg-secondary/20 text-secondary transition-colors text-label-md font-medium shadow-sm"
              type="button"
              title="Comparar fotos seleccionadas [C]"
            >
              <span className="material-symbols-outlined text-[16px]">fact_check</span>
              <span>Revisar selección ({selectedIds.size})</span>
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
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                isSelected={selectedIds.has(photo.id)}
                onToggleSelect={() => photoManager.toggleSelect(photo.id)}
                onSetStatus={(id, status) => photoManager.setStatus(id, status)}
                onSendToCompare={handleSendToCompare}
                onOpenLoupe={onOpenLoupe || (() => {})}
                onSetStarRating={(id, rating) => photoManager.setStarRating(id, rating)}
                onDelete={(photo) => photoManager.deletePhoto(photo.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Compare FAB for Multi-Selection */}
      {selectedIds.size > 1 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-surface-container-highest/95 backdrop-blur-md rounded-full shadow-2xl border border-outline/30 px-6 py-3 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-300">
          <span className="font-label-lg font-medium text-on-surface">
            {selectedIds.size} fotos seleccionadas
          </span>
          <div className="w-[1px] h-6 bg-outline-variant/50"></div>
          <button
            onClick={() => {
              controller.startComparisonWithSelection();
            }}
            className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-label-lg font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95 focus-visible:ring-4 focus-visible:ring-primary/50 focus:outline-none"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">fact_check</span>
            Revisar selección ({selectedIds.size})
          </button>
        </div>
      )}
    </div>
  );
};
