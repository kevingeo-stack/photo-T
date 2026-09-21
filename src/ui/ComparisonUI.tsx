import React, { useEffect, useState } from 'react';
import { ComparisonManager } from '../services/ComparisonManager';
import { AppController } from '../controllers/AppController';
import { PhotoManager } from '../services/PhotoManager';
import { ComparisonSession, Photo } from '../types';
import { usePhotoOriginal } from '../hooks/usePhotoOriginal';

export const ComparisonUI: React.FC = () => {
  const compManager = ComparisonManager.getInstance();
  const controller = AppController.getInstance();
  const photoManager = PhotoManager.getInstance();

  const [session, setSession] = useState<ComparisonSession>(compManager.getSession());
  const [photoA, setPhotoA] = useState<Photo | undefined>();
  const [photoB, setPhotoB] = useState<Photo | undefined>();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { url: urlA, isLoading: loadingA, error: errorA } = usePhotoOriginal(photoA?.id);
  const { url: urlB, isLoading: loadingB, error: errorB } = usePhotoOriginal(photoB?.id);

  useEffect(() => {
    const updateState = () => {
      const sess = compManager.getSession();
      setSession(sess);
      const pair = sess.currentPair;
      const allPhotos = photoManager.getPhotos();
      setPhotoA(pair ? allPhotos.find(p => p.id === pair[0]) : undefined);
      setPhotoB(pair ? allPhotos.find(p => p.id === pair[1]) : undefined);
    };
    
    updateState(); // initial
    const unsub = compManager.subscribe(updateState);
    return unsub;
  }, [compManager, photoManager]);

  if (!session.isActive) {
    return (
      <div className="flex-1 min-h-screen pl-64 flex items-center justify-center bg-surface">
        <p className="text-on-surface-variant font-body-lg">No hay sesión de comparación activa.</p>
      </div>
    );
  }

  const currentMatch = session.history.length;
  const totalMatchesInRound = session.history.length + session.pendingPairs.length + (session.currentPair ? 1 : 0);
  const progressPercentage = totalMatchesInRound > 0 ? (currentMatch / totalMatchesInRound) * 100 : 0;

  return (
    <div className="flex-1 min-h-screen pl-0 md:pl-64 pt-14 pb-4 bg-surface text-on-surface flex flex-col justify-between select-none" aria-live="polite">
      {/* Top Bar */}
      <div className="bg-surface-container-low/95 backdrop-blur-md px-space-md md:px-space-lg py-3 border-b border-outline-variant/30 flex flex-col md:flex-row items-center justify-between gap-space-sm z-20">
        <div className="flex items-center justify-between w-full md:w-auto">
          <button
            onClick={() => {
              if (session.history.length > 0) {
                setShowCancelConfirm(true);
              } else {
                controller.returnToSelectionView();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
            title="Volver a mi selección"
            aria-label="Cancelar y volver a la selección"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
            <span className="hidden sm:inline font-medium">Volver a mi selección</span>
          </button>

          <div className="flex flex-col items-center flex-1 md:hidden px-2">
            <span className="font-headline-sm text-on-surface font-semibold text-sm">
              Ronda {session.roundNumber}
            </span>
            <span className="font-label-sm text-on-surface-variant font-mono mb-1">
              Duelo {currentMatch + 1} de {totalMatchesInRound}
            </span>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          <button
            onClick={() => compManager.undo()}
            disabled={session.history.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-md transition-colors focus-visible:ring-2 focus-visible:ring-primary focus:outline-none ${
              session.history.length > 0
                ? 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/50'
                : 'bg-transparent text-on-surface-variant/40 border border-transparent cursor-not-allowed'
            }`}
            title="Deshacer última decisión [Z]"
            aria-label="Deshacer última decisión"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">undo</span>
            <span className="hidden sm:inline">Deshacer [Z]</span>
          </button>
        </div>

        {/* Desktop Progress Bar */}
        <div className="hidden md:flex flex-col items-center flex-1 max-w-md mx-space-lg">
          <div className="flex items-center justify-between w-full mb-1">
            <span className="font-label-md font-semibold text-on-surface">
              Ronda {session.roundNumber}
            </span>
            <span className="font-label-sm text-on-surface-variant font-mono">
              Duelo {currentMatch + 1} de {totalMatchesInRound}
            </span>
          </div>
          <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(78,222,163,0.4)]"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Dual Stage */}
      <div className="flex-1 p-space-sm md:p-space-md flex flex-col justify-center overflow-hidden">
        <div className="flex flex-col md:flex-row gap-space-sm md:gap-space-md h-full md:h-[75vh]">
          
          {/* Slot A */ }
          <div className="flex-1 relative rounded-2xl bg-surface-container-lowest border-2 border-secondary ring-1 ring-secondary/30 overflow-hidden flex flex-col shadow-xl group transition-all">
            <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black/20 min-h-[30vh]">
              {loadingA ? (
                <div className="flex flex-col items-center gap-3 text-primary animate-pulse" role="status" aria-label="Cargando imagen">
                  <span className="material-symbols-outlined text-[32px] animate-spin">sync</span>
                  <span className="font-label-md">Cargando original...</span>
                </div>
              ) : errorA ? (
                <div className="flex flex-col items-center gap-3 text-error" role="alert">
                  <span className="material-symbols-outlined text-[48px]">broken_image</span>
                  <span className="font-label-md">Imagen original no disponible</span>
                </div>
              ) : (
                <img
                  src={urlA}
                  alt={`Opción A: ${photoA?.name || 'A'}`}
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            <div className="bg-surface-container p-3 md:p-4 flex flex-col items-center border-t border-secondary/30">
              <span className="font-label-lg font-medium text-on-surface mb-2 truncate w-full text-center">
                {photoA?.name}
              </span>
              <button
                disabled={loadingA || loadingB || !!errorA}
                onClick={() => photoA && compManager.chooseWinner(photoA.id)}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-surface-container-high text-on-surface hover:bg-primary hover:text-on-primary hover:shadow-lg transition-all text-label-lg font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-4 focus-visible:ring-primary/50 focus:outline-none"
                title="Elegir izquierda [1 o Flecha Izquierda]"
                aria-label={`Elegir ${photoA?.name}. Atajo: 1 o Flecha Izquierda`}
              >
                <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
                Elegir esta
              </button>
            </div>
          </div>

          {/* VS Divider (Mobile only) */}
          <div className="md:hidden flex items-center justify-center -my-3 z-10">
            <span className="bg-surface-container-highest text-on-surface font-bold text-sm px-3 py-1 rounded-full shadow-md border border-outline-variant/30">
              VS
            </span>
          </div>

          {/* Slot B */}
          <div className="flex-1 relative rounded-2xl bg-surface-container-lowest border-2 border-primary ring-1 ring-primary/30 overflow-hidden flex flex-col shadow-xl group transition-all">
            <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black/20 min-h-[30vh]">
              {loadingB ? (
                <div className="flex flex-col items-center gap-3 text-primary animate-pulse" role="status" aria-label="Cargando imagen">
                  <span className="material-symbols-outlined text-[32px] animate-spin">sync</span>
                  <span className="font-label-md">Cargando original...</span>
                </div>
              ) : errorB ? (
                <div className="flex flex-col items-center gap-3 text-error" role="alert">
                  <span className="material-symbols-outlined text-[48px]">broken_image</span>
                  <span className="font-label-md">Imagen original no disponible</span>
                </div>
              ) : (
                <img
                  src={urlB}
                  alt={`Opción B: ${photoB?.name || 'B'}`}
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            <div className="bg-surface-container p-3 md:p-4 flex flex-col items-center border-t border-primary/30">
              <span className="font-label-lg font-medium text-on-surface mb-2 truncate w-full text-center">
                {photoB?.name}
              </span>
              <button
                disabled={loadingA || loadingB || !!errorB}
                onClick={() => photoB && compManager.chooseWinner(photoB.id)}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-surface-container-high text-on-surface hover:bg-primary hover:text-on-primary hover:shadow-lg transition-all text-label-lg font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-4 focus-visible:ring-primary/50 focus:outline-none"
                title="Elegir derecha [2 o Flecha Derecha]"
                aria-label={`Elegir ${photoB?.name}. Atajo: 2 o Flecha Derecha`}
              >
                Elegir esta
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-outline-variant/30 animate-in zoom-in-95 duration-200">
            <h3 className="font-headline-sm text-on-surface mb-2">¿Volver a tu selección?</h3>
            <p className="font-body-md text-on-surface-variant mb-6">
              Se perderá el progreso de esta ronda.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 rounded-lg font-label-md bg-primary text-on-primary hover:bg-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                Seguir comparando
              </button>
              <button
                onClick={() => {
                  setShowCancelConfirm(false);
                  controller.returnToSelectionView();
                }}
                className="px-4 py-2 rounded-lg font-label-md border border-outline-variant/50 text-on-surface hover:bg-surface-container-highest transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                Volver a mi selección
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

