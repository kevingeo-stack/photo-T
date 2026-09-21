import React, { useEffect, useState } from 'react';
import { PhotoManager } from '../services/PhotoManager';
import { AppController } from '../controllers/AppController';
import { Photo } from '../types';

export const HistoryTrashUI: React.FC = () => {
  const photoManager = PhotoManager.getInstance();
  const controller = AppController.getInstance();

  const [allPhotos, setAllPhotos] = useState<Photo[]>(photoManager.getPhotos());

  useEffect(() => {
    return photoManager.subscribe(() => {
      setAllPhotos(photoManager.getPhotos());
    });
  }, [photoManager]);

  const rejectedPhotos = allPhotos.filter((p) => p.status === 'rejected');
  const keptPhotos = allPhotos.filter((p) => p.status === 'kept');

  const handleRestore = async (photoId: string) => {
    await photoManager.setStatus(photoId, 'kept');
  };

  const handleDeletePermanent = async (photoId: string) => {
    if (confirm('¿Purgar permanentemente esta exposición RAW del almacenamiento local y en la nube?')) {
      await photoManager.deletePhoto(photoId);
    }
  };

  const handleEmptyTrash = async () => {
    if (confirm(`¿Vaciar la papelera y eliminar permanentemente las ${rejectedPhotos.length} fotos rechazadas?`)) {
      for (const p of rejectedPhotos) {
        await photoManager.deletePhoto(p.id);
      }
    }
  };

  return (
    <div className="flex-1 min-h-screen pl-64 pt-14 pb-16 bg-surface text-on-surface">
      <div className="p-space-lg max-w-[1400px] mx-auto flex flex-col gap-space-lg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">
              Historial y Papelera
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Revisa los candidatos rechazados antes de purgarlos del disco, o inspecciona las acciones recientes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => controller.setMode('gallery')}
              className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-label-md"
              type="button"
            >
              Volver a la Galería
            </button>
            {rejectedPhotos.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-error text-on-error hover:bg-error-container text-label-md font-semibold transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                <span>Vaciar Papelera ({rejectedPhotos.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Rejected Photos Queue */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-error">delete</span>
              <span>Pendientes de Eliminación ({rejectedPhotos.length})</span>
            </span>
          </div>

          {rejectedPhotos.length === 0 ? (
            <div className="p-12 rounded-xl bg-surface-container-low border border-outline-variant/30 text-center">
              <span className="material-symbols-outlined text-[40px] text-on-surface-variant/40 mb-2">
                check_circle
              </span>
              <p className="font-body-md text-body-md text-on-surface">La papelera está vacía</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Cualquier foto marcada para Descartar [X] aparecerá aquí para su confirmación final.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
              {rejectedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40"
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    referrerPolicy="no-referrer"
                    className="w-20 h-14 object-cover rounded-lg bg-surface-container-lowest"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-body-md font-medium text-on-surface truncate">
                      {photo.name}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {photo.sizeFormatted} · {photo.exif.camera}
                    </p>
                    {photo.aiFlag && (
                      <span className="text-[10px] text-error font-medium">{photo.aiFlag}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRestore(photo.id)}
                      className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface"
                      type="button"
                      title="Restaurar a Sin Calificar"
                    >
                      <span className="material-symbols-outlined text-[16px]">restore</span>
                    </button>
                    <button
                      onClick={() => handleDeletePermanent(photo.id)}
                      className="p-1.5 rounded-lg bg-surface-container hover:bg-error/30 text-error"
                      type="button"
                      title="Purgar permanentemente"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Picked Audit Trail */}
        <div className="flex flex-col gap-3 mt-4">
          <span className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">verified</span>
            <span>Selecciones Marcadas ({keptPhotos.length})</span>
          </span>

          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-wrap gap-2">
            {keptPhotos.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant/30"
              >
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-mono text-body-sm text-on-surface truncate max-w-[160px]">
                  {p.name}
                </span>
                <span className="font-mono text-label-sm text-secondary">
                  {p.sharpnessScore}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
