import React, { useState, useMemo } from 'react';
import { ComparisonManager } from '../services/ComparisonManager';
import { AppController } from '../controllers/AppController';
import { PhotoManager } from '../services/PhotoManager';
import { PhotoCard } from '../components/PhotoCard';
import { Photo } from '../types';

export const FinalistsUI: React.FC = () => {
  const compManager = ComparisonManager.getInstance();
  const controller = AppController.getInstance();
  const photoManager = PhotoManager.getInstance();

  // Deduplicar finalistas para evitar React key errors o duplicados
  const uniqueFinalists = useMemo(() => {
    const winnerIds = compManager.getWinners();
    const allPhotos = photoManager.getPhotos();
    const map = new Map<string, Photo>();
    winnerIds.forEach(id => {
      const p = allPhotos.find(photo => photo.id === id);
      if (p) map.set(id, p);
    });
    return Array.from(map.values());
  }, [compManager, photoManager]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(uniqueFinalists.map(p => p.id));
  });

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

  const handleNextRound = () => {
    if (selectedIds.size < 2) return;
    const ids: string[] = Array.from(selectedIds) as string[];
    controller.openSelectionView(ids);
  };

  const handleFinish = () => {
    const selectedList = Array.from(selectedIds) as string[];
    if (selectedList.length === 0) return;
    controller.openEditorWithSelection(selectedList);
  };

  const handleExport = () => {
    const selectedList = Array.from(selectedIds) as string[];
    if (selectedList.length === 0) return;
    controller.setFinalSelection(selectedList);
    controller.openExportView();
  };

  const handleBackToCompare = () => {
    const session = compManager.getSession();
    if (session.history.length > 0) {
      compManager.undo();
    }
    controller.setMode('compare');
  };

  const handleCancel = () => {
    compManager.cancelSession();
    controller.clearFinalSelection();
    controller.setMode('gallery');
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="flex-1 min-h-screen pl-0 md:pl-64 pt-14 pb-20 bg-surface text-on-surface">
      <div className="p-space-sm md:p-space-lg max-w-[1920px] mx-auto flex flex-col gap-space-md">
        
        {/* Header */}
        <div className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-space-md shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[28px]" aria-hidden="true">workspace_premium</span>
            </div>
            <div>
              <h1 className="font-headline-md text-on-surface font-semibold">
                Resultado de la ronda
              </h1>
              <p className="font-body-md text-on-surface-variant mt-1">
                {uniqueFinalists.length} fotos continúan
              </p>
            </div>
          </div>

          <button
            onClick={handleBackToCompare}
            className="flex items-center gap-2 bg-surface-container hover:bg-surface-container-high text-on-surface px-4 py-2 rounded-lg font-label-md transition-colors focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
            aria-label="Volver a comparar y reabrir último duelo"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">history</span>
            Volver a comparar
          </button>
        </div>

        {/* Finalists Grid */}
        {uniqueFinalists.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 mb-3" aria-hidden="true">
              image_not_supported
            </span>
            <p className="font-headline-sm text-on-surface mb-1">
              No hay finalistas
            </p>
            <p className="font-body-md text-on-surface-variant">
              No completaste la sesión de comparación.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-space-md mt-4">
            {uniqueFinalists.map(photo => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                isSelected={selectedIds.has(photo.id)}
                onToggleSelect={handleToggleSelect}
                onSetStatus={() => {}}
                onSendToCompare={() => {}}
                onOpenLoupe={() => {}}
                onSetStarRating={() => {}}
              />
            ))}
          </div>
        )}

      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-surface-container-low/95 backdrop-blur-md border-t border-outline-variant/30 p-space-sm md:p-space-md z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-space-sm">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-on-surface-variant hover:text-error hover:bg-error/10 font-label-md rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-error focus:outline-none"
            aria-label="Cancelar sesión y descartar selección"
          >
            Cancelar
          </button>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center justify-center bg-surface-container-highest rounded-full px-4 py-1.5 text-label-md font-medium text-on-surface-variant">
              <span aria-live="polite">{selectedCount} seleccionadas</span>
            </div>
            


            <button
              onClick={handleExport}
              disabled={selectedCount === 0}
              className={`px-5 py-2.5 rounded-xl font-label-lg font-bold transition-all border-2 focus-visible:ring-4 focus:outline-none ${
                selectedCount > 0
                  ? 'border-surface-container-highest bg-surface hover:bg-surface-container-low text-on-surface shadow-sm focus-visible:ring-surface-container-highest/50'
                  : 'border-transparent bg-surface-container text-on-surface-variant/40 cursor-not-allowed'
              }`}
            >
              Exportar fotos
            </button>

            <button
              onClick={handleFinish}
              disabled={selectedCount === 0}
              className={`px-5 py-2.5 rounded-xl font-label-lg font-bold transition-all border-2 focus-visible:ring-4 focus:outline-none ${
                selectedCount > 0
                  ? 'border-surface-container-highest bg-surface hover:bg-surface-container-low text-on-surface shadow-sm focus-visible:ring-surface-container-highest/50'
                  : 'border-transparent bg-surface-container text-on-surface-variant/40 cursor-not-allowed'
              }`}
            >
              Seleccionar finales
            </button>

            <button
              onClick={handleNextRound}
              disabled={selectedCount < 2}
              className={`px-6 py-2.5 rounded-xl font-label-lg font-bold transition-all shadow-md focus-visible:ring-4 focus:outline-none flex items-center gap-2 ${
                selectedCount >= 2
                  ? 'bg-primary text-on-primary hover:bg-primary/90 hover:shadow-lg focus-visible:ring-primary/50'
                  : 'bg-surface-container text-on-surface-variant/40 shadow-none cursor-not-allowed hidden md:flex'
              }`}
              aria-label={`Revisar la selección de ${selectedCount} fotos`}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">fact_check</span>
              Revisar selección ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
