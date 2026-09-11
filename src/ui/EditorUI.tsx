import React, { useEffect, useState } from 'react';
import { PhotoManager } from '../services/PhotoManager';
import { Photo } from '../types';

export const EditorUI: React.FC = () => {
  const photoManager = PhotoManager.getInstance();

  const [allPhotos, setAllPhotos] = useState<Photo[]>(photoManager.getPhotos());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(photoManager.getSelectedIds());
  
  const [activeIndex, setActiveIndex] = useState<number>(0);
  
  // Local state for the form
  const [editName, setEditName] = useState<string>('');
  const [editStarRating, setEditStarRating] = useState<number>(0);

  useEffect(() => {
    return photoManager.subscribe(() => {
      setAllPhotos(photoManager.getPhotos());
      setSelectedIds(new Set(photoManager.getSelectedIds()));
    });
  }, [photoManager]);

  // Determine which photos to show in the editor
  const photosToEdit = selectedIds.size > 0 
    ? allPhotos.filter(p => selectedIds.has(p.id)) 
    : allPhotos;

  // Ensure active index is within bounds
  const safeIndex = Math.min(activeIndex, Math.max(0, photosToEdit.length - 1));
  const currentPhoto = photosToEdit[safeIndex];

  // Initialize form when current photo changes
  useEffect(() => {
    if (currentPhoto) {
      setEditName(currentPhoto.name);
      setEditStarRating(currentPhoto.starRating);
    }
  }, [currentPhoto]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPhoto) return;
    
    await photoManager.updatePhotoDetails(currentPhoto.id, {
      name: editName,
      starRating: editStarRating,
    });
    
    // Optional: show a small success indication or auto-advance
    alert('Cambios guardados con éxito.');
  };

  if (photosToEdit.length === 0) {
    return (
      <div className="flex-1 min-h-screen pl-64 pt-14 pb-16 bg-surface text-on-surface flex items-center justify-center">
        <div className="text-center p-8 bg-surface-container-low rounded-2xl border border-outline-variant/30 shadow-xl">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/50 mb-4">
            imagesmode
          </span>
          <h2 className="font-headline-md text-on-surface mb-2">No hay fotos para editar</h2>
          <p className="text-on-surface-variant max-w-sm mx-auto">
            Por favor, importa fotos o selecciona algunas desde la Galería para editarlas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen pl-64 pt-14 flex flex-col md:flex-row bg-surface text-on-surface overflow-hidden">
      
      {/* Left Sidebar: Photo List Thumbnail Scrubber */}
      <div className="w-full md:w-80 h-full border-r border-outline-variant/30 bg-surface-container-low/95 backdrop-blur-sm flex flex-col">
        <div className="p-space-sm border-b border-outline-variant/30 bg-surface-container/50">
          <h2 className="font-headline-sm font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">photo_library</span>
            {selectedIds.size > 0 ? `Selección (${photosToEdit.length})` : `Todas (${photosToEdit.length})`}
          </h2>
          <p className="text-label-sm text-on-surface-variant mt-1">
            Selecciona una imagen para editar sus detalles.
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-space-xs flex flex-col gap-1.5 scrollbar-thin">
          {photosToEdit.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => setActiveIndex(index)}
              className={`flex items-center gap-3 p-2 rounded-xl border transition-all text-left ${
                safeIndex === index
                  ? 'bg-primary/10 border-primary ring-1 ring-primary shadow-sm'
                  : 'bg-surface-container-lowest border-outline-variant/30 hover:border-outline hover:shadow-sm'
              }`}
            >
              <img 
                src={photo.url} 
                alt={photo.name} 
                referrerPolicy="no-referrer"
                className="w-16 h-12 object-cover rounded-md bg-black/10"
              />
              <div className="flex-1 min-w-0">
                <p className="font-label-md font-medium truncate text-on-surface">{photo.name}</p>
                <div className="flex items-center gap-1 text-[10px] text-primary mt-0.5">
                  {photo.starRating > 0 ? (
                    Array.from({ length: photo.starRating }).map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-[12px] font-variation-fill">star</span>
                    ))
                  ) : (
                    <span className="text-on-surface-variant font-medium bg-surface-container px-1.5 rounded-sm">Sin calificar</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Area: Editor Form & Preview */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-space-lg bg-surface-container-lowest relative">
        {currentPhoto && (
          <div className="max-w-4xl mx-auto w-full flex flex-col gap-space-lg">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
              <div>
                <h1 className="font-headline-md font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[28px]">tune</span>
                  Edición de Metadatos
                </h1>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  Modifica las propiedades de la foto seleccionada.
                </p>
              </div>
              <span className="font-mono text-label-sm text-primary font-semibold bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 shadow-sm">
                Foto {safeIndex + 1} de {photosToEdit.length}
              </span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg">
              {/* Left Column: Image Preview */}
              <div className="bg-surface-container-low border border-outline-variant/40 p-3 rounded-3xl shadow-xl flex flex-col gap-3 group">
                <div className="relative w-full aspect-[3/2] overflow-hidden rounded-2xl bg-black/5">
                  <img 
                    src={currentPhoto.url} 
                    alt={currentPhoto.name}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]" 
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                     <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-md font-mono border border-white/10 shadow-md">
                        {currentPhoto.format}
                     </span>
                  </div>
                </div>
                
                <div className="p-2 grid grid-cols-2 gap-2 text-[11px] font-mono text-on-surface-variant">
                  <div className="flex items-center gap-2 bg-surface-container px-3 py-2 rounded-xl">
                    <span className="material-symbols-outlined text-[14px]">sd_card</span>
                    <span className="text-on-surface truncate">{currentPhoto.sizeFormatted}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-surface-container px-3 py-2 rounded-xl">
                    <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                    <span className="text-on-surface truncate" title={currentPhoto.exif.camera}>
                      {currentPhoto.exif.camera}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-surface-container px-3 py-2 rounded-xl">
                    <span className="material-symbols-outlined text-[14px]">iso</span>
                    <span className="text-on-surface">{currentPhoto.exif.iso}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-surface-container px-3 py-2 rounded-xl">
                    <span className="material-symbols-outlined text-[14px]">camera</span>
                    <span className="text-on-surface truncate" title={currentPhoto.exif.lens}>
                      {currentPhoto.exif.lens}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Editor Form */}
              <div className="bg-surface-container-low border border-outline-variant/30 p-space-md rounded-3xl shadow-lg h-fit">
                <form onSubmit={handleSave} className="flex flex-col gap-6">
                  
                  {/* Name Input */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="photoName" className="font-label-md font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant">title</span>
                      Nombre de Archivo
                    </label>
                    <input 
                      id="photoName"
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-surface-container-highest border border-outline-variant/40 rounded-xl px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all text-on-surface font-mono shadow-inner"
                      placeholder="Ej: Paisaje_01.jpg"
                    />
                  </div>

                  {/* Star Rating Scrubber */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant">stars</span>
                      Calificación por Estrellas
                    </label>
                    <div className="flex items-center gap-1 bg-surface-container-highest border border-outline-variant/30 rounded-xl p-2.5 w-fit shadow-inner">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setEditStarRating(star === editStarRating ? 0 : star)}
                          className="p-1 rounded-lg transition-all hover:bg-black/10 focus:outline-none hover:scale-110"
                        >
                          <span className={`material-symbols-outlined text-[32px] transition-colors ${
                            star <= editStarRating 
                              ? 'text-amber-400 font-variation-fill drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]' 
                              : 'text-on-surface-variant/40 hover:text-on-surface-variant'
                          }`}>
                            star
                          </span>
                        </button>
                      ))}
                      <div className="h-8 w-px bg-outline-variant/30 mx-2" />
                      <span className="font-mono text-label-lg font-bold text-on-surface px-2">
                        {editStarRating}<span className="text-on-surface-variant/50">/5</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-2 pt-5 border-t border-outline-variant/30 flex items-center justify-between">
                    <button 
                      type="button"
                      onClick={() => {
                        setEditName(currentPhoto.name);
                        setEditStarRating(currentPhoto.starRating);
                      }}
                      className="px-5 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors font-label-md font-medium border border-transparent hover:border-outline-variant/30"
                    >
                      Deshacer
                    </button>

                    <button 
                      type="submit"
                      className="flex items-center gap-2 px-7 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:scale-[1.02] active:scale-95 transition-all font-label-md font-bold shadow-[0_4px_14px_rgba(78,222,163,0.3)] hover:shadow-[0_6px_20px_rgba(78,222,163,0.4)]"
                    >
                      <span className="material-symbols-outlined text-[20px]">save</span>
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
