import React, { useEffect, useState } from 'react';
import { AppController } from '../controllers/AppController';
import { PhotoManager } from '../services/PhotoManager';
import { usePhotoThumbnail } from '../hooks/usePhotoThumbnail';
import { ImageExporter } from '../utils/ImageExporter';
import { Photo } from '../types';

// Helper component to render thumbnails without keeping global URLs
const ExportThumbnail: React.FC<{ photoId: string; name: string }> = ({ photoId, name }) => {
  const { url, isLoading } = usePhotoThumbnail(photoId);
  if (isLoading) return <div className="w-full h-full bg-surface-container-highest animate-pulse"></div>;
  if (!url) return <div className="w-full h-full bg-surface-container-highest flex items-center justify-center text-white/30"><span className="material-symbols-outlined text-[24px]">broken_image</span></div>;
  return <img src={url} alt={name} className="w-full h-full object-cover" />;
};

export const ExportUI: React.FC = () => {
  const controller = AppController.getInstance();
  const photoManager = PhotoManager.getInstance();

  const finalSelectionIds = controller.getFinalSelection();
  const allPhotos = finalSelectionIds.map(id => photoManager.getPhotos().find(p => p.id === id)).filter((p): p is Photo => !!p);

  const [selectedIds, setSelectedIds] = useState<string[]>(finalSelectionIds);
  const [format, setFormat] = useState<'original' | 'image/jpeg' | 'image/png' | 'image/webp'>('original');
  const [quality, setQuality] = useState<number>(0.92);
  const [supportsWebP, setSupportsWebP] = useState<boolean>(true);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportIndex, setExportIndex] = useState<number>(0);
  const [exportedCount, setExportedCount] = useState<number>(0);
  const [failedNames, setFailedNames] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  useEffect(() => {
    // Check WebP support
    const canvas = document.createElement('canvas');
    if (canvas.toDataURL) {
      setSupportsWebP(canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0);
    } else {
      setSupportsWebP(false);
    }
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === finalSelectionIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds([...finalSelectionIds]);
    }
  };

  const handleStartExport = async () => {
    if (selectedIds.length === 0) return;

    // Validation: RAW + Edits + Original Format
    if (format === 'original') {
      const rawEdited = selectedIds
        .map(id => photoManager.getPhotos().find(p => p.id === id))
        .find(p => p && p.editState && !['JPG','JPEG','PNG','WEBP'].includes((p.format || '').toUpperCase()));
      
      if (rawEdited) {
        alert(`Esta foto RAW (${rawEdited.name}) tiene cambios. Para exportar la edición, elige JPEG, PNG o WebP.`);
        return;
      }
    }

    setIsExporting(true);
    setExportIndex(0);
    setExportedCount(0);
    setFailedNames([]);
    setIsFinished(false);

    for (let i = 0; i < selectedIds.length; i++) {
      const id = selectedIds[i];
      setExportIndex(i);
      const photo = photoManager.getPhotos().find(p => p.id === id);
      
      try {
        if (!photo) throw new Error("Foto no encontrada en PhotoManager");
        const blob = await photoManager.getPhotoBlob(id);
        if (!blob) throw new Error("No se pudo cargar el archivo Blob");

        let outBlob = blob;
        let filename = photo.name;

        if (format === 'original') {
          // If it is raster and has edits, bake them in (conserving format)
          const isRaster = ['JPG','JPEG','PNG','WEBP'].includes((photo.format || '').toUpperCase());
          if (isRaster && photo.editState) {
            let mime = 'image/jpeg';
            if ((photo.format || '').toUpperCase() === 'PNG') mime = 'image/png';
            if ((photo.format || '').toUpperCase() === 'WEBP') mime = 'image/webp';
            
            const rendered = await ImageExporter.renderEdited(blob, photo.editState, mime, quality);
            if (!rendered) throw new Error("Fallo en renderEdited");
            outBlob = rendered;
          }
        } else {
          // Format change requested
          const rendered = await ImageExporter.renderEdited(
            blob, 
            photo.editState || { brightness: 100, contrast: 100, saturation: 100 }, 
            format, 
            quality
          );
          if (!rendered) throw new Error("Fallo en renderEdited");
          outBlob = rendered;
          filename = ImageExporter.replaceExtension(photo.name, format);
        }

        ImageExporter.downloadBlob(outBlob, filename);
        setExportedCount(prev => prev + 1);
        
        // Wait briefly for the browser to process the download click
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.error(`[ExportUI] Error exportando ${photo?.name}:`, err);
        setFailedNames(prev => [...prev, photo?.name || 'Archivo desconocido']);
      }
    }

    setIsExporting(false);
    setIsFinished(true);
  };

  if (finalSelectionIds.length === 0) {
    return (
      <div className="flex-1 min-h-screen pt-14 pb-16 bg-[#0e0e11] flex items-center justify-center">
        <div className="text-center p-8 bg-surface-container-low border border-white/5 rounded-2xl">
          <span className="material-symbols-outlined text-[48px] text-white/20 mb-4 block">file_download_off</span>
          <h2 className="text-lg font-semibold text-white mb-2">No hay fotos finales</h2>
          <p className="text-sm text-white/50 mb-6">Selecciona al menos una foto para exportar.</p>
          <button
            onClick={() => controller.setMode('finalists')}
            className="px-5 py-2.5 bg-surface text-on-surface rounded-xl font-medium hover:bg-surface-variant transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-[#0e0e11] text-white flex flex-col md:pl-64 pt-14 pb-16 font-inter select-none">
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">output</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Exportar fotos</h1>
              <p className="text-sm text-white/50">{finalSelectionIds.length} fotos en selección final</p>
            </div>
          </div>
          <button
            onClick={() => controller.setMode('finalists')}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors text-sm font-medium flex items-center gap-2"
            type="button"
            disabled={isExporting}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Volver
          </button>
        </div>

        {isFinished ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white/5 rounded-3xl border border-white/10 animate-in fade-in duration-300">
            <span className="material-symbols-outlined text-[64px] text-primary mb-4 block">check_circle</span>
            <h2 className="text-2xl font-bold text-white mb-2">
              {exportedCount} fotos exportadas
            </h2>
            <p className="text-white/60 mb-8 max-w-md">Revisa tu carpeta de descargas del navegador para encontrar los archivos generados.</p>
            
            {failedNames.length > 0 && (
              <div className="mb-8 p-4 bg-error/10 border border-error/30 rounded-xl max-w-md w-full text-left">
                <p className="text-sm text-error font-semibold mb-2">{failedNames.length} fotos no pudieron exportarse:</p>
                <ul className="text-xs text-error/80 list-disc list-inside">
                  {failedNames.map((name, idx) => (
                    <li key={idx}>{name}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex gap-4">
              <button
                onClick={() => controller.setMode('finalists')}
                className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
              >
                Volver a la selección
              </button>
              <button
                onClick={() => { setIsFinished(false); setSelectedIds([...finalSelectionIds]); }}
                className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold shadow-lg hover:bg-primary/90 transition-transform active:scale-95"
              >
                Exportar de nuevo
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left: Photos Grid */}
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white/80">Selecciona qué fotos exportar</p>
                <button 
                  onClick={handleSelectAll}
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  disabled={isExporting}
                >
                  {selectedIds.length === finalSelectionIds.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                {allPhotos.map(photo => {
                  const isSelected = selectedIds.includes(photo.id);
                  return (
                    <div 
                      key={photo.id}
                      onClick={() => !isExporting && handleToggleSelect(photo.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all border-2 ${isSelected ? 'border-primary' : 'border-transparent hover:border-white/20'}`}
                    >
                      <ExportThumbnail photoId={photo.id} name={photo.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none flex flex-col justify-end p-3">
                        <p className="text-xs font-medium text-white truncate drop-shadow-md" title={photo.name}>{photo.name}</p>
                        <p className="text-[10px] text-white/60 font-mono drop-shadow-md">{photo.format}</p>
                      </div>
                      <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'bg-black/60 border-white/40'}`}>
                        {isSelected && <span className="material-symbols-outlined text-[14px] text-on-primary">check</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Export Settings */}
            <div className="w-full lg:w-80 flex flex-col gap-6">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 flex flex-col gap-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ajustes de Exportación</h3>
                
                {/* Format Options */}
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-semibold text-white/60 uppercase">Formato</label>
                  <div className="flex flex-col gap-2">
                    {[
                      { val: 'original', label: 'Formato original' },
                      { val: 'image/jpeg', label: 'JPEG' },
                      { val: 'image/png', label: 'PNG' },
                      { val: 'image/webp', label: 'WebP', disabled: !supportsWebP }
                    ].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => setFormat(opt.val as any)}
                        disabled={isExporting || opt.disabled}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${
                          format === opt.val 
                            ? 'bg-primary/20 border border-primary text-primary font-medium shadow-sm' 
                            : 'bg-black/40 border border-white/5 text-white/80 hover:bg-white/10 hover:border-white/20'
                        } ${opt.disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        <span>{opt.label}</span>
                        {opt.disabled && <span className="text-[10px] text-white/30">No disponible</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality Slider (only for JPEG and WebP) */}
                {(format === 'image/jpeg' || format === 'image/webp') && (
                  <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white/60 uppercase">Calidad</label>
                      <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md">{Math.round(quality * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" max="1" step="0.01" 
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      disabled={isExporting}
                      className="w-full accent-primary"
                    />
                  </div>
                )}
                
                {/* Info block */}
                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">info</span>
                  <p className="text-xs text-primary/80 leading-relaxed">
                    El navegador puede solicitar permiso si exportas múltiples archivos. Las fotos se descargarán secuencialmente.
                  </p>
                </div>
              </div>

              {/* Progress and Action */}
              <div className="flex flex-col gap-3">
                {isExporting ? (
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl flex flex-col gap-3 shadow-inner">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white">Exportando {exportIndex + 1} de {selectedIds.length}...</span>
                      <span className="material-symbols-outlined text-[18px] text-primary animate-spin">sync</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${((exportIndex) / selectedIds.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleStartExport}
                    disabled={selectedIds.length === 0}
                    data-testid="export-start-btn"
                    className="w-full py-4 rounded-2xl bg-primary text-on-primary text-lg font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">download</span>
                    Exportar {selectedIds.length} {selectedIds.length === 1 ? 'foto' : 'fotos'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
