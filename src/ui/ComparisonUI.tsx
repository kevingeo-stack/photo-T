import React, { useEffect, useState } from 'react';
import { ComparisonManager } from '../services/ComparisonManager';
import { PhotoManager } from '../services/PhotoManager';
import { AppController } from '../controllers/AppController';
import { ComparisonState, Photo, BurstGroup } from '../types';

export const ComparisonUI: React.FC = () => {
  const compManager = ComparisonManager.getInstance();
  const photoManager = PhotoManager.getInstance();
  const controller = AppController.getInstance();

  const [state, setState] = useState<ComparisonState>(compManager.getState());
  const [photoA, setPhotoA] = useState<Photo | undefined>(compManager.getCandidateA());
  const [photoB, setPhotoB] = useState<Photo | undefined>(compManager.getCandidateB());
  const [burstPhotos, setBurstPhotos] = useState<Photo[]>(compManager.getBurstPhotos());
  const [burstGroup, setBurstGroup] = useState<BurstGroup | undefined>(compManager.getActiveBurstGroup());
  const [curtainPosition, setCurtainPosition] = useState<number>(50); // 0 to 100%
  const [activeTab, setActiveTab] = useState<'2-up' | 'n-up'>('2-up');
  const [allPhotos, setAllPhotos] = useState<Photo[]>(photoManager.getPhotos());

  useEffect(() => {
    const unsubComp = compManager.subscribe(() => {
      setState(compManager.getState());
      setPhotoA(compManager.getCandidateA());
      setPhotoB(compManager.getCandidateB());
      setBurstPhotos(compManager.getBurstPhotos());
      setBurstGroup(compManager.getActiveBurstGroup());
    });

    const unsubPhoto = photoManager.subscribe(() => {
      setPhotoA(compManager.getCandidateA());
      setPhotoB(compManager.getCandidateB());
      setBurstPhotos(compManager.getBurstPhotos());
      setAllPhotos(photoManager.getPhotos());
    });

    return () => {
      unsubComp();
      unsubPhoto();
    };
  }, [compManager, photoManager]);

  const getZoomStyle = () => {
    switch (state.zoomLevel) {
      case '100%':
        return 'scale-[1.75] cursor-grab';
      case '200%':
        return 'scale-[2.5] cursor-grab';
      case 'fit':
      default:
        return 'scale-100 object-contain';
    }
  };

  const getActiveBurstIndex = () => {
    if (!photoB) return 1;
    const idx = burstPhotos.findIndex((p) => p.id === photoB.id);
    return idx >= 0 ? idx + 1 : 1;
  };

  return (
    <div className="flex-1 min-h-screen pl-64 pt-14 pb-4 bg-surface text-on-surface flex flex-col justify-between select-none">
      {/* 2-Up Studio Toolbar Header */}
      <div className="bg-surface-container-low/95 backdrop-blur-md px-space-lg py-2.5 border-b border-outline-variant/30 flex flex-wrap items-center justify-between gap-space-md z-20">
        {/* Left: Burst Session Context */}
        <div className="flex items-center gap-space-md">
          <button
            onClick={() => controller.setMode('gallery')}
            className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface bg-surface-container px-space-sm py-1 rounded-lg text-label-md transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Volver a la Galería</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Comparación 2-Up
            </span>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-secondary font-mono">
              {photoA?.name || 'A'} vs {photoB?.name || 'B'}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant hidden lg:inline">
              · {burstGroup?.count || 8} tomas ({burstGroup?.interval || '0.18s intervalo'})
            </span>
          </div>
        </div>

        {/* Center: Tabs and Zoom Level Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-surface-container-lowest p-1 rounded-lg gap-1 border border-outline-variant/30">
            <button
              onClick={() => setActiveTab('2-up')}
              className={`px-3 py-1 rounded text-label-sm font-label-sm transition-all ${
                activeTab === '2-up'
                  ? 'bg-surface-container-highest text-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              2-Up
            </button>
            <button
              onClick={() => setActiveTab('n-up')}
              className={`px-3 py-1 rounded text-label-sm font-label-sm transition-all ${
                activeTab === 'n-up'
                  ? 'bg-surface-container-highest text-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Mesa de Luz
            </button>
          </div>

          {activeTab === '2-up' && (
            <div className="flex items-center bg-surface-container-lowest p-1 rounded-lg gap-1 border border-outline-variant/30 hidden sm:flex">
              {(['fit', '100%', '200%'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => compManager.setZoomLevel(lvl)}
                  className={`px-3 py-1 rounded text-label-sm font-label-sm transition-all uppercase ${
                    state.zoomLevel === lvl
                      ? 'bg-surface-container-highest text-primary font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Inspection Overlays & Shortcuts Pill */}
        <div className="flex items-center gap-space-sm">
          {/* Histogram Toggle */}
          <button
            onClick={() => compManager.toggleHistogram()}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-label-sm transition-colors ${
              state.showHistogram
                ? 'bg-secondary/20 text-secondary border border-secondary/40'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[15px]">equalizer</span>
            <span className="hidden sm:inline">Histograma</span>
          </button>

          {/* Peaking Toggle */}
          <button
            onClick={() => compManager.togglePeaking()}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-label-sm transition-colors ${
              state.showPeaking
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[15px]">filter_center_focus</span>
            <span className="hidden sm:inline">Enfoque</span>
          </button>

          {/* Split Curtain Toggle */}
          <button
            onClick={() => compManager.toggleSplitCurtain()}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-label-sm transition-colors ${
              state.splitCurtain
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
            type="button"
            title="Split Curtain Wipe View"
          >
            <span className="material-symbols-outlined text-[15px]">splitscreen</span>
            <span className="hidden xl:inline">Cortina</span>
          </button>

          {/* Shortcut Reference Pill */}
          <div className="hidden xl:flex items-center gap-1.5 bg-surface-container px-space-sm py-1 rounded-lg text-label-sm text-on-surface-variant font-mono">
            <span>[Z] Zoom</span>
            <span>·</span>
            <span>[1/K] Elegir A</span>
            <span>·</span>
            <span>[2/L] Elegir B</span>
            <span>·</span>
            <span>[X] Descartar</span>
          </div>
        </div>
      </div>

      {/* Main Dual Stage Viewport */}
      <div className="flex-1 p-space-md flex flex-col justify-center overflow-hidden relative">
        {activeTab === 'n-up' ? (
          /* N-Up Light Table View (Todas las fotos) */
          <div className="absolute inset-0 overflow-y-auto p-space-md bg-surface-container-lowest">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-headline-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">grid_view</span>
                Mesa de Luz (Todas las Fotos)
              </h2>
              <span className="text-on-surface-variant text-label-sm">{allPhotos.length} fotos disponibles</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-32">
              {allPhotos.map((photo, index) => {
                const isBaseA = photo.id === photoA?.id;
                const isActiveB = photo.id === photoB?.id;

                return (
                  <div 
                    key={photo.id}
                    className={`relative rounded-2xl bg-surface-container-lowest border-2 overflow-hidden flex flex-col group shadow-lg transition-all ${
                      isActiveB ? 'border-primary ring-2 ring-primary/30' : isBaseA ? 'border-secondary' : 'border-outline-variant/40 hover:border-outline'
                    }`}
                  >
                    <div className="aspect-[3/2] w-full relative bg-black/5 flex items-center justify-center p-2">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {isBaseA && <span className="px-2 py-0.5 rounded bg-secondary text-on-secondary font-label-sm font-bold shadow-md">Base (A)</span>}
                        {isActiveB && <span className="px-2 py-0.5 rounded bg-primary text-on-primary font-label-sm font-bold shadow-md">Activo (B)</span>}
                        {photo.status === 'kept' && !isBaseA && !isActiveB && <span className="px-2 py-0.5 rounded bg-primary/80 text-on-primary font-label-sm shadow-md">Mantener</span>}
                        {photo.status === 'rejected' && <span className="px-2 py-0.5 rounded bg-error/80 text-on-error font-label-sm shadow-md">Descartar</span>}
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white font-medium backdrop-blur-md">
                          Nítidez {photo.sharpnessScore}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-surface-container-low flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="font-label-md truncate" title={photo.name}>{photo.name}</span>
                        <span className="font-mono text-[10px] text-on-surface-variant">#{index + 1}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => compManager.setCandidates(photo.id, photoB?.id || photo.id)}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors border ${isBaseA ? 'bg-secondary text-on-secondary border-secondary' : 'bg-surface-container hover:bg-secondary/20 hover:text-secondary border-outline-variant/30 hover:border-secondary/50'}`}
                        >
                          Fijar como Base
                        </button>
                        <button 
                          onClick={() => compManager.setCandidateB(photo.id)}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors border ${isActiveB ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container hover:bg-primary/20 hover:text-primary border-outline-variant/30 hover:border-primary/50'}`}
                        >
                          Fijar Activo
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* 2-Up Split Views */
          <div className="w-full h-full flex flex-col justify-center">
            {state.splitCurtain ? (
              /* Split Curtain Wipe Mode */
              <div className="relative w-full h-[62vh] rounded-2xl overflow-hidden bg-surface-container-lowest border border-outline-variant/40 shadow-2xl flex items-center justify-center">
                <div className="relative w-full h-full max-w-full">
                  {/* Background Image: Candidate B */}
                  <img
                    src={photoB?.url || photoA?.url}
                    alt="Candidate B"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-contain"
                  />

                  {/* Foreground Clipped Image: Candidate A */}
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{ clipPath: `inset(0 ${100 - curtainPosition}% 0 0)` }}
                  >
                    <img
                      src={photoA?.url}
                      alt="Candidate A"
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  </div>

                  {/* Draggable Divider Bar */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-primary flex items-center justify-center shadow-[0_0_12px_rgba(78,222,163,0.8)] pointer-events-none"
                    style={{ left: `${curtainPosition}%` }}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg">
                      <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
                    </div>
                  </div>
                  
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={curtainPosition}
                    onChange={(e) => setCurtainPosition(Number(e.target.value))}
                    aria-label="Split curtain comparison wipe position"
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 accent-primary z-30 opacity-60 hover:opacity-100 cursor-pointer"
                  />
                </div>
              </div>
            ) : (
          /* Dual High-Resolution Split View (Side-by-Side) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md h-[62vh]">
            {/* Slot A: Candidate A (Base) */}
            <div className="relative rounded-2xl bg-surface-container-lowest border border-outline-variant/50 overflow-hidden flex flex-col justify-between shadow-2xl group">
              {/* Media Viewport */}
              <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center">
                <img
                  src={photoA?.url}
                  alt={photoA?.name || 'Candidate A'}
                  referrerPolicy="no-referrer"
                  className={`max-w-full max-h-full transition-transform duration-200 ${getZoomStyle()}`}
                />

                {/* Focus Peaking simulation edge line */}
                {state.showPeaking && (
                  <div className="absolute inset-0 pointer-events-none border border-primary/20 opacity-60 mix-blend-screen shadow-[inset_0_0_80px_rgba(78,222,163,0.15)]" />
                )}

                {/* Candidate A Badge on Top-Left */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-on-surface font-label-md font-semibold border border-white/10 shadow-md">
                    Candidato A · Base
                  </span>
                  {photoA?.status === 'kept' && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/90 text-on-primary font-label-sm font-semibold shadow-sm">
                      Marcada
                    </span>
                  )}
                </div>

                {/* 100% Focus Peaking Inset Loupe (from Stitch design) */}
                <div className="absolute top-3 right-3 z-10 w-24 h-24 rounded-xl border-2 border-primary bg-black/80 overflow-hidden shadow-2xl backdrop-blur-md hidden sm:block">
                  <img
                    src={photoA?.url}
                    alt="1:1 Loupe"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover scale-[3.2] translate-x-2 -translate-y-2"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-black/80 px-1.5 py-0.5 text-[9px] font-mono text-primary flex items-center justify-between">
                    <span>1:1 BLOQUEO</span>
                    <span>NÍTIDO 98%</span>
                  </div>
                </div>

                {/* Mini Histogram Overlay */}
                {state.showHistogram && (
                  <div className="absolute bottom-16 left-3 z-10 w-28 h-12 bg-black/70 rounded-lg p-1.5 border border-white/10 backdrop-blur-md">
                    <div className="w-full h-full flex items-end gap-[1px]">
                      {[15, 30, 45, 60, 85, 70, 50, 40, 25, 10, 5].map((val, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-white/70 rounded-t-sm"
                          style={{ height: `${val}%` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Camera & Lens HUD Details */}
              <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
                <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 pointer-events-auto">
                  <span className="font-label-md font-mono text-on-surface">
                    {photoA?.exif.shutter} · {photoA?.exif.aperture} · ISO {photoA?.exif.iso} · {photoA?.exif.evShift || '0.0 EV'}
                  </span>
                  <span className="text-on-surface-variant text-[11px] hidden lg:inline">
                    · {photoA?.exif.lens}
                  </span>
                </div>

                {/* Actions for Slot A */}
                <div className="flex items-center gap-1.5 pointer-events-auto">
                  <button
                    onClick={() => compManager.rejectA()}
                    className="px-3 py-1.5 rounded-xl bg-surface-container-high/90 hover:bg-error/30 text-on-surface hover:text-error transition-colors backdrop-blur-md text-label-md font-medium border border-white/10"
                    type="button"
                    title="Reject Candidate A"
                  >
                    Rechazar [X]
                  </button>

                  <button
                    onClick={() => compManager.keepA()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-all text-label-md font-semibold shadow-lg"
                    type="button"
                    title="Keep Candidate A [1]"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Mantener (A) [1]</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Slot B: Candidate B (Active Challenger / Next Burst Frame) */}
            <div className="relative rounded-2xl bg-surface-container-lowest border-2 border-primary/70 ring-1 ring-primary/40 overflow-hidden flex flex-col justify-between shadow-2xl group">
              {/* Media Viewport */}
              <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center">
                <img
                  src={photoB?.url}
                  alt={photoB?.name || 'Candidate B'}
                  referrerPolicy="no-referrer"
                  className={`max-w-full max-h-full transition-transform duration-200 ${getZoomStyle()}`}
                />

                {/* Focus Peaking simulation edge line */}
                {state.showPeaking && (
                  <div className="absolute inset-0 pointer-events-none border border-secondary/20 opacity-60 mix-blend-screen shadow-[inset_0_0_80px_rgba(76,215,246,0.15)]" />
                )}

                {/* Candidate B Badge & Differential Tag */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-primary font-label-md font-semibold border border-primary/30 shadow-md">
                    Candidato B · Activo ({getActiveBurstIndex()} de {burstPhotos.length})
                  </span>

                  {photoB?.aiFlag && (
                    <span className="px-2.5 py-1 rounded-lg bg-secondary/90 text-on-secondary font-label-sm font-semibold shadow-md backdrop-blur-md">
                      {photoB.aiFlag}
                    </span>
                  )}
                </div>

                {/* 100% Focus Peaking Inset Loupe for Candidate B */}
                <div className="absolute top-3 right-3 z-10 w-24 h-24 rounded-xl border-2 border-secondary bg-black/80 overflow-hidden shadow-2xl backdrop-blur-md hidden sm:block">
                  <img
                    src={photoB?.url}
                    alt="1:1 Loupe B"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover scale-[3.2] translate-x-1 -translate-y-1"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-black/80 px-1.5 py-0.5 text-[9px] font-mono text-secondary flex items-center justify-between">
                    <span>1:1 BLOQUEO</span>
                    <span>NÍTIDO 99.8%</span>
                  </div>
                </div>

                {/* Mini Histogram Overlay with Highlight Indicator */}
                {state.showHistogram && (
                  <div className="absolute bottom-16 left-3 z-10 w-28 h-12 bg-black/70 rounded-lg p-1.5 border border-white/10 backdrop-blur-md">
                    <div className="w-full h-full flex items-end gap-[1px]">
                      {[10, 20, 35, 55, 75, 90, 85, 60, 40, 20, 15].map((val, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-secondary/80 rounded-t-sm"
                          style={{ height: `${val}%` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Camera & Lens HUD Details */}
              <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
                <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 pointer-events-auto">
                  <span className="font-label-md font-mono text-on-surface">
                    {photoB?.exif.shutter} · {photoB?.exif.aperture} · ISO {photoB?.exif.iso} ·{' '}
                    <span className="text-secondary font-semibold">{photoB?.exif.evShift || '0.0 EV'}</span>
                  </span>
                  <span className="text-on-surface-variant text-[11px] hidden lg:inline">
                    · {photoB?.exif.lens}
                  </span>
                </div>

                {/* Actions for Slot B */}
                <div className="flex items-center gap-1.5 pointer-events-auto">
                  <button
                    onClick={() => compManager.rejectB()}
                    className="px-3 py-1.5 rounded-xl bg-surface-container-high/90 hover:bg-error/30 text-on-surface hover:text-error transition-colors backdrop-blur-md text-label-md font-medium border border-white/10"
                    type="button"
                    title="Reject B & Advance [X]"
                  >
                    Rechazar [X]
                  </button>

                  <button
                    onClick={() => compManager.keepB(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-all text-label-md font-semibold shadow-[0_0_16px_rgba(78,222,163,0.4)]"
                    type="button"
                    title="Keep B and Promote to Base [2]"
                  >
                    <span className="material-symbols-outlined text-[16px]">stars</span>
                    <span>Mantener (B) [2]</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Burst Sequence Filmstrip Navigator Dock */}
      {activeTab === '2-up' && (
        <div className="mx-space-md mb-2 bg-surface-container-low/95 backdrop-blur-md rounded-2xl border border-outline-variant/30 p-space-sm shadow-xl flex flex-col gap-2">
          {/* Filmstrip Header: Burst title & navigation chevrons */}
          <div className="flex items-center justify-between px-space-xs">
            <div className="flex items-center gap-2">
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                Galería de Comparación ({allPhotos.length} Fotos)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-mono px-1">
                Mostrando todas las fotos disponibles
              </span>
            </div>
          </div>

          {/* All Photos Thumbnail Scrubber Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
            {allPhotos.map((photo, index) => {
              const isBaseA = photo.id === photoA?.id;
              const isActiveB = photo.id === photoB?.id;

              return (
                <div
                  key={photo.id}
                  onClick={() => compManager.setCandidateB(photo.id)}
                  className={`relative flex-shrink-0 w-24 sm:w-28 rounded-xl overflow-hidden bg-surface-container-lowest cursor-pointer transition-all duration-150 border ${
                    isActiveB
                      ? 'border-primary ring-2 ring-primary scale-[1.03] shadow-[0_0_12px_rgba(78,222,163,0.3)]'
                      : isBaseA
                      ? 'border-secondary ring-1 ring-secondary/80'
                      : 'border-outline-variant/40 hover:border-outline opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* Thumbnail Image */}
                  <div className="relative aspect-[3/2] w-full overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />

                    {/* Top Badge: Role indicator or status */}
                    <div className="absolute top-1 left-1">
                      {isBaseA && (
                        <span className="font-label-sm text-[9px] px-1 py-0.5 rounded bg-secondary text-on-secondary font-bold">
                          BASE
                        </span>
                      )}
                      {isActiveB && !isBaseA && (
                        <span className="font-label-sm text-[9px] px-1 py-0.5 rounded bg-primary text-on-primary font-bold">
                          ACTIVO
                        </span>
                      )}
                      {!isBaseA && !isActiveB && photo.status === 'kept' && (
                        <span className="font-label-sm text-[9px] px-1 py-0.5 rounded bg-primary/90 text-on-primary font-bold">
                          MANTENER
                        </span>
                      )}
                      {!isBaseA && !isActiveB && photo.status === 'rejected' && (
                        <span className="font-label-sm text-[9px] px-1 py-0.5 rounded bg-error/90 text-on-error font-bold">
                          REJ
                        </span>
                      )}
                    </div>

                    {/* Sharpness Score Pin */}
                    <div className="absolute bottom-1 right-1">
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-black/70 text-white font-medium">
                        {photo.sharpnessScore}
                      </span>
                    </div>
                  </div>

                  {/* Mini Filename & Exposure */}
                  <div className="p-1 text-[10px] flex items-center justify-between font-mono text-on-surface-variant bg-surface-container-low">
                    <span className="truncate">#{index + 1}</span>
                    <span>{photo.exif.shutter}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
