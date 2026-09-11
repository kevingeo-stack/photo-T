import React from 'react';
import { AppController } from '../controllers/AppController';

export const ShortcutsModal: React.FC = () => {
  const controller = AppController.getInstance();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-xl rounded-2xl bg-surface-container-low border border-outline-variant/50 p-6 shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">keyboard</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Atajos de Teclado
            </h2>
          </div>

          <button
            onClick={() => controller.toggleShortcutsModal()}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Triage Keys */}
          <div className="flex flex-col gap-2 bg-surface-container p-3.5 rounded-xl">
            <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-semibold">
              Clasificación y Selección
            </span>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Marcar / Mantener</span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-mono text-xs text-primary font-bold">
                P
              </kbd>
            </div>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Rechazar / Descartar</span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-mono text-xs text-error font-bold">
                X
              </kbd>
            </div>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Quitar Marcas / Sin Calificar</span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-mono text-xs text-on-surface">
                U
              </kbd>
            </div>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Asignar Estrellas</span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-mono text-xs text-amber-400">
                1 - 5
              </kbd>
            </div>
          </div>

          {/* 2-Up Comparison */}
          <div className="flex flex-col gap-2 bg-surface-container p-3.5 rounded-xl">
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
              Comparación 2-Up
            </span>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Elegir Candidato A</span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-mono text-xs text-on-surface font-bold">
                1 or K
              </kbd>
            </div>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Elegir Candidato B (Avanzar)</span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-mono text-xs text-primary font-bold">
                2 or L
              </kbd>
            </div>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Cambiar Foto en Ráfaga</span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-mono text-xs text-on-surface">
                ← / →
              </kbd>
            </div>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Cambiar Zoom (Lupa)</span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-mono text-xs text-on-surface">
                Z
              </kbd>
            </div>
          </div>

          {/* Navigation & Batch */}
          <div className="flex flex-col gap-2 bg-surface-container p-3.5 rounded-xl">
            <span className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider font-semibold">
              Navegación
            </span>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Alternar Comparación 2-Up</span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-mono text-xs text-secondary font-bold">
                C
              </kbd>
            </div>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Seleccionar todas Marcadas</span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-mono text-xs text-on-surface">
                Cmd + A
              </kbd>
            </div>
          </div>

          {/* Offline PWA & Sync */}
          <div className="flex flex-col gap-2 bg-surface-container p-3.5 rounded-xl">
            <span className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider font-semibold">
              Sistema y Sincronización
            </span>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Mostrar Atajos</span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container-highest font-mono text-xs text-on-surface">
                ?
              </kbd>
            </div>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant">Caché IndexedDB</span>
              <span className="text-xs text-primary font-mono font-medium">Automático</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-outline-variant/30">
          <button
            onClick={() => controller.toggleShortcutsModal()}
            className="px-4 py-2 rounded-xl bg-surface-container-highest hover:bg-outline-variant text-on-surface font-label-md transition-colors"
            type="button"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
