import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-space-sm py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary hover:text-primary-container transition-colors text-label-md"
        title="Instalar App PhotoTriage"
        type="button"
      >
        <span className="material-symbols-outlined text-[16px]">download_for_offline</span>
        <span className="hidden xl:inline">Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-space-sm py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary transition-colors text-label-md"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">install_mobile</span>
          <span className="hidden xl:inline">Instalar App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl bg-surface-container p-6 shadow-2xl border border-outline-variant/50">
              <h3 className="text-headline-sm font-semibold text-on-surface">Instalar PhotoTriage en iOS</h3>
              <p className="mt-2 text-body-md text-on-surface-variant">
                1. Toca el botón de <strong className="text-on-surface">Compartir</strong> en la barra de Safari.<br />
                2. Desliza hacia abajo y selecciona <strong className="text-primary">Agregar a Inicio</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-surface-container-high py-2 text-label-md font-medium text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
