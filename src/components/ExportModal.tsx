import React, { useState } from 'react';
import { AppController } from '../controllers/AppController';
import { PhotoManager } from '../services/PhotoManager';

export const ExportModal: React.FC = () => {
  const controller = AppController.getInstance();
  const photoManager = PhotoManager.getInstance();

  const [format, setFormat] = useState<'DNG' | 'JPG' | 'TIFF'>('DNG');
  const [embedXmp, setEmbedXmp] = useState<boolean>(true);
  const [namingPreset, setNamingPreset] = useState<string>('Original_Sequenced');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const keptPhotos = photoManager.getPhotos().filter((p) => p.status === 'kept');

  const handleStartExport = () => {
    setIsExporting(true);
    setExportProgress(0);

    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          setIsFinished(true);
          return 100;
        }
        return prev + 20;
      });
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-lg rounded-2xl bg-surface-container-low border border-outline-variant/50 p-6 shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">file_download</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Exportar Selecciones Marcadas
              </h2>
              <p className="text-body-sm text-on-surface-variant">
                Exporta {keptPhotos.length} archivos RAW maestros seleccionados para procesamiento.
              </p>
            </div>
          </div>

          <button
            onClick={() => controller.toggleExportModal()}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {isFinished ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">task_alt</span>
            </div>
            <h3 className="font-headline-sm text-on-surface">¡Exportación Completa!</h3>
            <p className="text-body-sm text-on-surface-variant max-w-xs">
              {keptPhotos.length} fotos marcadas exportadas junto con archivos XMP al directorio de salida.
            </p>
            <button
              onClick={() => {
                setIsFinished(false);
                controller.toggleExportModal();
              }}
              className="mt-2 px-5 py-2 rounded-xl bg-primary text-on-primary font-semibold text-label-md shadow-md"
            >
              Hecho
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Format Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-label-md font-medium text-on-surface">Formato de Destino</label>
              <div className="grid grid-cols-3 gap-2">
                {(['DNG', 'JPG', 'TIFF'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`py-2 px-3 rounded-xl border text-label-md font-medium transition-all ${
                      format === fmt
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-outline-variant/50 bg-surface-container text-on-surface-variant hover:text-on-surface'
                    }`}
                    type="button"
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Naming Template */}
            <div className="flex flex-col gap-1.5">
              <label className="text-label-md font-medium text-on-surface">Nomenclatura de Archivos</label>
              <select
                value={namingPreset}
                onChange={(e) => setNamingPreset(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="Original_Sequenced">Nombre Original + Secuencia</option>
                <option value="Iceland2024_Picks">Iceland2024_Seleccion_###</option>
                <option value="Shoot_Date_Sequence">AAAAMMDD_Nombre</option>
              </select>
            </div>

            {/* Sidecar Options */}
            <label className="flex items-center gap-2.5 cursor-pointer text-body-sm text-on-surface">
              <input
                type="checkbox"
                checked={embedXmp}
                onChange={(e) => setEmbedXmp(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-0 bg-surface-container-highest border-outline-variant"
              />
              <span>Generar archivos XMP (incluye estrellas y estado de clasificación)</span>
            </label>

            {/* Export Progress Bar */}
            {isExporting && (
              <div className="flex flex-col gap-1 mt-2">
                <div className="flex justify-between text-label-sm text-on-surface-variant">
                  <span>Empaquetando maestros RAW...</span>
                  <span className="font-mono text-primary">{exportProgress}%</span>
                </div>
                <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-200"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
              <button
                onClick={() => controller.toggleExportModal()}
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md transition-colors"
                type="button"
                disabled={isExporting}
              >
                Cancelar
              </button>

              <button
                onClick={handleStartExport}
                disabled={isExporting || keptPhotos.length === 0}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-md font-semibold transition-all shadow-md disabled:opacity-50"
                type="button"
              >
                {isExporting ? 'Exportando...' : `Exportar ${keptPhotos.length} Selecciones`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
