import { NavigationMode, SessionInfo } from '../types';
import { PhotoManager } from '../services/PhotoManager';
import { ComparisonManager } from '../services/ComparisonManager';
import { ThemeManager } from '../services/ThemeManager';
import { FirebaseService } from '../services/FirebaseService';

/**
 * AppController - Central OOP controller coordinating user interactions,
 * top-level navigation, keyboard triage shortcuts, and application state.
 */
export class AppController {
  private static instance: AppController;
  private currentMode: NavigationMode = 'gallery';
  private preRoundOrigin: NavigationMode = 'gallery';
  private preRoundSelection: string[] = [];
  private sessionInfo: SessionInfo = {
    id: 'session-2024-iceland',
    title: 'Session: 2024 Iceland Expedition',
    date: '2024-09-12',
    usedStorageGB: 0,
    totalStorageGB: null
  };
  private showShortcutsModal: boolean = false;
  private finalSelectionIds: Set<string> = new Set();
  private listeners: Array<() => void> = [];

  private photoManager = PhotoManager.getInstance();
  private comparisonManager = ComparisonManager.getInstance();
  private themeManager = ThemeManager.getInstance();
  private firebaseService = FirebaseService.getInstance();

  private constructor() {
    this.initKeyboardShortcuts();
    this.updateStorageInfo();
    
    // Escuchar a ComparisonManager para navegar reactivamente y romper el ciclo
    this.comparisonManager.subscribe(() => {
      const session = this.comparisonManager.getSession();
      
      // Si la sesión termina y estamos en modo compare, hay dos caminos:
      if (this.currentMode === 'compare' && !session.isActive) {
        if (session.winners.length > 0) {
          // Ronda finalizada normalmente
          this.setMode('finalists');
        } else {
          // Torneo fue cancelado manualmente (winners está vacío)
          this.setMode('gallery');
        }
      }
    });

    // Cleanup selections if photos are deleted
    this.photoManager.subscribe(() => {
      const allIds = new Set(this.photoManager.getPhotos().map(p => p.id));
      
      const oldPreLen = this.preRoundSelection.length;
      this.preRoundSelection = this.preRoundSelection.filter(id => allIds.has(id));
      
      const oldFinalLen = this.finalSelectionIds.size;
      for (const id of this.finalSelectionIds) {
        if (!allIds.has(id)) this.finalSelectionIds.delete(id);
      }
      
      if (oldPreLen !== this.preRoundSelection.length || oldFinalLen !== this.finalSelectionIds.size) {
        this.notify();
      }
    });
  }

  public static getInstance(): AppController {
    if (!AppController.instance) {
      AppController.instance = new AppController();
    }
    return AppController.instance;
  }

  public async updateStorageInfo(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const total = estimate.quota || 0;
        this.sessionInfo.usedStorageGB = Number((used / (1024 * 1024 * 1024)).toFixed(2));
        this.sessionInfo.totalStorageGB = total > 0 ? Number((total / (1024 * 1024 * 1024)).toFixed(2)) : null;
      }
    } catch (e) {
      console.warn('[AppController] Could not estimate storage:', e);
    }
    this.notify();
  }

  private initKeyboardShortcuts(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      // Ignore when user typing in input fields
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      // [?] Shortcuts modal
      if (e.key === '?') {
        e.preventDefault();
        this.toggleShortcutsModal();
        return;
      }

      // [Cmd+A] / [Ctrl+A] Select Flagged
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        this.photoManager.selectFlagged();
        return;
      }

      // [U] Clear Inactive Flags
      if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        this.photoManager.clearInactiveFlags();
        return;
      }

      // [C] Switch to Compare 2-Up
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (this.currentMode === 'compare') {
          this.setMode('gallery');
        } else {
          this.startComparisonWithSelection();
        }
        return;
      }

      // Compare mode specific shortcuts
      if (this.currentMode === 'compare') {
        const session = this.comparisonManager.getSession();
        
        if (e.key === '1' || e.key === 'ArrowLeft') {
          e.preventDefault();
          if (session.currentPair) this.comparisonManager.chooseWinner(session.currentPair[0]);
          return;
        }
        if (e.key === '2' || e.key === 'ArrowRight') {
          e.preventDefault();
          if (session.currentPair) this.comparisonManager.chooseWinner(session.currentPair[1]);
          return;
        }
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          this.comparisonManager.undo();
          return;
        }
      } else {
        // Gallery mode shortcuts
        if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          this.photoManager.batchKeep();
          return;
        }
        if (e.key.toLowerCase() === 'x') {
          e.preventDefault();
          this.photoManager.batchDiscard();
          return;
        }
      }
    });
  }

  public startComparisonWithSelection(): void {
    const selectedIds = Array.from(this.photoManager.getSelectedIds());
    if (selectedIds.length < 2) {
      return;
    }
    this.openSelectionView(selectedIds);
  }

  public openSelectionView(selectedIds: string[]): void {
    this.preRoundOrigin = this.currentMode;
    this.preRoundSelection = [...selectedIds];
    this.setMode('pre-round');
  }

  public cancelSelectionView(): void {
    this.setMode(this.preRoundOrigin);
  }

  public startComparisonFromSelection(selectedIds: string[]): void {
    if (selectedIds.length < 2) return;
    const success = this.comparisonManager.startSession(selectedIds);
    if (success) {
      this.setMode('compare');
    }
  }

  public returnToSelectionView(): void {
    this.comparisonManager.cancelSession();
    this.setMode('pre-round');
  }

  public getPreRoundSelection(): string[] {
    return [...this.preRoundSelection];
  }

  public getMode(): NavigationMode {
    return this.currentMode;
  }

  public setMode(mode: NavigationMode): void {
    this.currentMode = mode;
    this.notify();
  }

  public getSessionInfo(): SessionInfo {
    return this.sessionInfo;
  }

  public isShortcutsModalOpen(): boolean {
    return this.showShortcutsModal;
  }

  public toggleShortcutsModal(): void {
    this.showShortcutsModal = !this.showShortcutsModal;
    this.notify();
  }

  public openExportView(): void {
    if (this.finalSelectionIds.size > 0) {
      this.setMode('export');
    } else {
      alert('Selecciona al menos una foto para exportar.');
    }
  }

  public getFinalSelection(): string[] {
    return Array.from(this.finalSelectionIds);
  }

  public setFinalSelection(ids: string[]): void {
    this.finalSelectionIds = new Set(ids);
    this.notify();
  }

  public openEditorWithSelection(ids: string[]): void {
    this.setFinalSelection(ids);
    this.setMode('editor');
  }

  public clearFinalSelection(): void {
    this.finalSelectionIds.clear();
    this.notify();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}
