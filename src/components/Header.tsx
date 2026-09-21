import React, { useEffect, useState } from 'react';
import { AppController } from '../controllers/AppController';
import { PWAInstallButton } from './PWAInstallButton';
import { NavigationMode, SessionInfo } from '../types';

export const Header: React.FC = () => {
  const controller = AppController.getInstance();
  const [currentMode, setCurrentMode] = useState<NavigationMode>(controller.getMode());
  const session: SessionInfo = controller.getSessionInfo();

  useEffect(() => {
    return controller.subscribe(() => {
      setCurrentMode(controller.getMode());
    });
  }, [controller]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-low/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.4)] border-b border-outline-variant/30">
      <div className="h-14 w-full px-space-lg flex items-center justify-between">
        {/* Left: Brand Logo & Session Selector */}
        <div className="flex items-center gap-space-lg">
          <div
            className="flex items-center gap-space-sm cursor-pointer"
            onClick={() => controller.setMode('gallery')}
          >
            <img
              alt="PhotoTriage Logo"
              className="h-8 w-auto object-contain"
              src="/icon.svg"
            />
            <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
              PhotoTriage
            </span>
          </div>

          <div className="h-4 w-px bg-outline-variant/60 hidden sm:block"></div>

          <div className="hidden sm:flex items-center gap-space-xs bg-surface-container px-space-sm py-1 rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[16px] text-secondary">
              photo_library
            </span>
            <span className="font-label-md text-label-md text-on-surface">
              {session.title}
            </span>
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
              unfold_more
            </span>
          </div>
        </div>

        {/* Center: Navigation Modes (Gallery, Compare, History/Trash) */}
        <nav
          className="hidden md:flex items-center bg-surface-container-lowest p-1 rounded-lg gap-1 border border-outline-variant/20"
        >
          <button
            onClick={() => controller.setMode('gallery')}
            className={`px-space-md py-1 rounded-lg transition-all text-label-lg font-label-lg ${
              currentMode === 'gallery'
                ? 'bg-surface-container-highest text-primary font-semibold shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
            type="button"
          >
            Galería
          </button>

          <button
            onClick={() => controller.setMode('compare')}
            className={`px-space-md py-1 rounded-lg transition-all text-label-lg font-label-lg ${
              currentMode === 'compare'
                ? 'bg-surface-container-highest text-primary font-semibold shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
            type="button"
          >
            Comparar
          </button>

          <button
            onClick={() => controller.setMode('history-trash')}
            className={`px-space-md py-1 rounded-lg transition-all text-label-lg font-label-lg ${
              currentMode === 'history-trash'
                ? 'bg-surface-container-highest text-primary font-semibold shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
            type="button"
          >
            Historia / Basura
          </button>
        </nav>

        {/* Right: Storage, PWA, Shortcuts, Avatar */}
        <div className="flex items-center gap-space-md">
          {/* Storage Meter */}
          <div className="hidden lg:flex flex-col gap-1 bg-surface-container px-3 py-1.5 rounded-lg min-w-[140px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                  hard_drive
                </span>
                <span className="text-xs font-medium text-on-surface-variant">Almacenamiento</span>
              </div>
              <span className="text-[10px] text-on-surface-variant font-medium">
                {session.usedStorageGB} GB
              </span>
            </div>
            
            {session.totalStorageGB ? (
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden" title={`${session.usedStorageGB} GB usados de ${session.totalStorageGB} GB permitidos por el dispositivo`}>
                <div
                  className={`h-full rounded-full transition-all ${
                    (session.usedStorageGB / session.totalStorageGB) > 0.9 ? 'bg-red-500' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(100, (session.usedStorageGB / session.totalStorageGB) * 100)}%` }}
                ></div>
              </div>
            ) : (
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden" title={`${session.usedStorageGB} GB usados. Límite gestionado por el dispositivo.`}>
                <div className="bg-primary/50 h-full w-1/3 rounded-full"></div>
              </div>
            )}
          </div>

          <PWAInstallButton />

          {/* Shortcuts Button */}
          <button
            onClick={() => controller.toggleShortcutsModal()}
            className="flex items-center gap-space-xs bg-surface-container px-space-sm py-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
            type="button"
            title="Atajos del teclado [?]"
          >
            <span className="material-symbols-outlined text-[16px]">keyboard</span>
            <span className="font-label-md text-label-md hidden xl:inline">Atajos</span>
            <span className="font-label-sm text-label-sm bg-surface-container-high px-1 py-0.5 rounded text-on-surface-variant">
              ?
            </span>
          </button>

          {/* User Profile Avatar */}
          <div
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer shadow-sm"
            title="Profesional Fotográfico (Autenticación Anónima Activa)"
          >
            <span className="material-symbols-outlined text-on-primary text-[18px]">
              person
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
