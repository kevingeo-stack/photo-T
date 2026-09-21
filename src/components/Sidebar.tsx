import React, { useEffect, useState } from 'react';
import { PhotoManager } from '../services/PhotoManager';
import { AppController } from '../controllers/AppController';
import { TriageFolder } from '../types';

export const Sidebar: React.FC = () => {
  const photoManager = PhotoManager.getInstance();
  const controller = AppController.getInstance();

  const [activeFolder, setActiveFolder] = useState<TriageFolder>(photoManager.getActiveFolder());
  const [counts, setCounts] = useState(photoManager.getCounts());

  useEffect(() => {
    return photoManager.subscribe(() => {
      setActiveFolder(photoManager.getActiveFolder());
      setCounts(photoManager.getCounts());
    });
  }, [photoManager]);

  const handleSelectFolder = (folder: TriageFolder) => {
    photoManager.setFolder(folder);
    controller.setMode('gallery');
  };

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-64 bg-surface-container-low/95 backdrop-blur-md z-40 flex flex-col justify-between p-space-md border-r border-outline-variant/30 select-none">
      <div className="flex flex-col gap-space-md overflow-y-auto">
        {/* Header: Folders */}
        <div className="flex items-center justify-between px-space-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Carpetas de Clasificación
          </span>
          <span
            className="material-symbols-outlined text-[16px] text-on-surface-variant cursor-pointer hover:text-on-surface"
            title="Crear Colección Virtual"
          >
            folder_special
          </span>
        </div>

        {/* Folder List Items */}
        <nav className="flex flex-col gap-1">
          {/* All Photos */}
          <button
            onClick={() => handleSelectFolder('all')}
            className={`flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors text-left ${
              activeFolder === 'all' && controller.getMode() === 'gallery'
                ? 'bg-surface-container-high text-on-surface font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
            type="button"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[18px]">collections</span>
              <span className="font-body-md text-body-md">Todas las Fotos</span>
            </div>
            <span className="font-label-sm text-label-sm bg-surface-container px-1.5 py-0.5 rounded text-on-surface">
              {counts.all}
            </span>
          </button>

          {/* Flagged / Picked */}
          <button
            onClick={() => handleSelectFolder('flagged')}
            className={`flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors text-left ${
              activeFolder === 'flagged' && controller.getMode() === 'gallery'
                ? 'bg-surface-container-high text-primary font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
            type="button"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[18px] text-primary">
                check_circle
              </span>
              <span className="font-body-md text-body-md">Marcadas / Seleccionadas</span>
            </div>
            <span className="font-label-sm text-label-sm bg-surface-container px-1.5 py-0.5 rounded text-primary font-semibold">
              {counts.flagged}
            </span>
          </button>

          {/* Rejected */}
          <button
            onClick={() => handleSelectFolder('rejected')}
            className={`flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors text-left ${
              activeFolder === 'rejected' && controller.getMode() === 'gallery'
                ? 'bg-surface-container-high text-error font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
            type="button"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[18px] text-error">cancel</span>
              <span className="font-body-md text-body-md">Rechazadas</span>
            </div>
            <span className="font-label-sm text-label-sm bg-surface-container px-1.5 py-0.5 rounded text-error font-semibold">
              {counts.rejected}
            </span>
          </button>



        </nav>

        <div className="h-px bg-outline-variant/40 my-1"></div>

        {/* Batch Operations */}
        <div className="flex flex-col gap-space-sm">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider px-space-xs">
            Operaciones por Lotes
          </span>
          <button
            onClick={() => photoManager.selectFlagged()}
            className="flex items-center justify-between w-full px-space-sm py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors text-left"
            type="button"
          >
            <span className="font-body-sm text-body-sm">Seleccionar Marcadas</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">[Cmd+A]</span>
          </button>

          <button
            onClick={() => photoManager.clearInactiveFlags()}
            className="flex items-center justify-between w-full px-space-sm py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors text-left"
            type="button"
          >
            <span className="font-body-sm text-body-sm">Limpiar Marcas Inactivas</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">[U]</span>
          </button>
        </div>

        <div className="h-px bg-outline-variant/40 my-1"></div>

        {/* Edition Mode */}
        <div className="flex flex-col gap-space-sm">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider px-space-xs">
            Edición Avanzada
          </span>
          <button
            onClick={() => controller.setMode('editor')}
            className={`flex items-center gap-space-sm w-full px-space-sm py-2 rounded-lg transition-colors text-left ${
              controller.getMode() === 'editor'
                ? 'bg-surface-container-high text-primary font-semibold'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span className="font-body-sm text-body-sm">Editor de Fotos</span>
          </button>
        </div>
      </div>

      {/* Footer Output Tray */}
      <div className="flex flex-col gap-space-sm pt-space-md border-t border-outline-variant/30">
        <div className="flex items-center justify-between px-space-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Salida
          </span>
          <span className="font-label-sm text-label-sm text-secondary font-medium">
            DNG + JPG
          </span>
        </div>

        <button
          onClick={() => controller.openExportView()}
          className="flex items-center justify-center gap-space-xs w-full py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-lg text-label-lg transition-all shadow-[0_2px_8px_rgba(78,222,163,0.2)] hover:shadow-[0_4px_12px_rgba(78,222,163,0.3)]"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">file_download</span>
          <span>Exportar Selección</span>
        </button>
      </div>
    </aside>
  );
};
