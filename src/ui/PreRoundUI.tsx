import React, { useState, useMemo } from 'react';
import { ComparisonManager } from '../services/ComparisonManager';
import { AppController } from '../controllers/AppController';
import { PhotoManager } from '../services/PhotoManager';
import { PhotoCard } from '../components/PhotoCard';
import { Photo } from '../types';

export const PreRoundUI: React.FC = () => {
  const compManager = ComparisonManager.getInstance();
  const controller = AppController.getInstance();
  const photoManager = PhotoManager.getInstance();

  // Inicializar la selección con los IDs que el controller envió a pre-round
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(controller.getPreRoundSelection());
  });

  const photosToReview = useMemo(() => {
    const allPhotos = photoManager.getPhotos();
    const preRoundIds = new Set(controller.getPreRoundSelection());
    return allPhotos.filter(p => preRoundIds.has(p.id));
  }, [photoManager, controller]);

  const handleToggleSelect = (photoId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const handleStartRound = () => {
    if (selectedIds.size < 2) return;
    const ids: string[] = Array.from(selectedIds);
    controller.startComparisonFromSelection(ids);
  };

  const handleCancel = () => {
    controller.cancelSelectionView();
  };

  const handleOpenEditor = () => {
    if (selectedIds.size === 0) return;
    const ids: string[] = Array.from(selectedIds);
    controller.openEditorWithSelection(ids);
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="flex-1 min-h-screen pl-64 pt-14 pb-20 bg-surface text-on-surface">
      <div className="p-space-lg max-w-[1920px] mx-auto">
        <div className="flex flex-col gap-2 mb-space-lg">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[32px] text-primary">fact_check</span>
            <h1 className="font-display-sm text-on-surface">Tu selección</h1>
          </div>
          <p className="font-body-lg text-on-surface-variant max-w-2xl">
            {selectedCount} fotos seleccionadas
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-sm mb-space-xl">
          {photosToReview.map(photo => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              isSelected={selectedIds.has(photo.id)}
              onToggleSelect={() => handleToggleSelect(photo.id)}
            />
          ))}
        </div>
      </div>

      {/* Action Bar Flotante */}
      <div className="fixed bottom-0 left-64 right-0 bg-surface-container-low/95 backdrop-blur-md border-t border-outline-variant/30 p-space-md z-40 shadow-2xl transform transition-transform">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between">
          <button
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-xl font-label-lg transition-colors text-on-surface hover:bg-surface-container-high focus-visible:ring-4 focus-visible:ring-on-surface/20 focus:outline-none flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Volver
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenEditor}
              disabled={selectedCount === 0}
              className={`px-4 py-2 rounded-lg font-label-md transition-colors border flex items-center gap-2 ${
                selectedCount > 0
                  ? 'border-surface-container-highest bg-surface hover:bg-surface-container-low text-on-surface'
                  : 'border-transparent bg-surface-container text-on-surface-variant/40 cursor-not-allowed'
              }`}
            >
              Seleccionar finales
            </button>
            <button
              onClick={handleOpenEditor}
              disabled={selectedCount === 0}
              className={`px-4 py-2 rounded-lg font-label-md transition-colors border flex items-center gap-2 ${
                selectedCount > 0
                  ? 'border-surface-container-highest bg-surface hover:bg-surface-container-low text-on-surface'
                  : 'border-transparent bg-surface-container text-on-surface-variant/40 cursor-not-allowed'
              }`}
            >
              Pasar al editor
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center justify-center bg-surface-container-highest rounded-full px-4 py-1.5 text-label-md font-medium text-on-surface-variant">
              <span>{selectedCount} fotos seleccionadas</span>
            </div>
            
            <button
              onClick={handleStartRound}
              disabled={selectedCount < 2}
              className={`px-6 py-2.5 rounded-xl font-label-lg font-bold transition-all shadow-md focus-visible:ring-4 focus:outline-none flex items-center gap-2 ${
                selectedCount >= 2
                  ? 'bg-primary text-on-primary hover:bg-primary/90 hover:shadow-lg focus-visible:ring-primary/50'
                  : 'bg-surface-container text-on-surface-variant/40 shadow-none cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">play_arrow</span>
              Comparar seleccionadas ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
