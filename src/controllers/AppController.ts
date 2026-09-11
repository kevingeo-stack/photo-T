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
  private sessionInfo: SessionInfo = {
    id: 'session-2024-iceland',
    title: 'Session: 2024 Iceland Expedition',
    date: '2024-09-12',
    usedStorageGB: 64.2,
    totalStorageGB: 100.0
  };
  private showShortcutsModal: boolean = false;
  private showExportModal: boolean = false;
  private listeners: Array<() => void> = [];

  private photoManager = PhotoManager.getInstance();
  private comparisonManager = ComparisonManager.getInstance();
  private themeManager = ThemeManager.getInstance();
  private firebaseService = FirebaseService.getInstance();

  private constructor() {
    this.initKeyboardShortcuts();
  }

  public static getInstance(): AppController {
    if (!AppController.instance) {
      AppController.instance = new AppController();
    }
    return AppController.instance;
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
        this.setMode(this.currentMode === 'compare' ? 'gallery' : 'compare');
        return;
      }

      // Compare mode specific shortcuts
      if (this.currentMode === 'compare') {
        if (e.key === '1' || e.key.toLowerCase() === 'k') {
          e.preventDefault();
          this.comparisonManager.keepA();
          return;
        }
        if (e.key === '2' || e.key.toLowerCase() === 'l') {
          e.preventDefault();
          this.comparisonManager.keepB();
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.comparisonManager.advanceBurstFrame(-1);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.comparisonManager.advanceBurstFrame(1);
          return;
        }
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          const current = this.comparisonManager.getState().zoomLevel;
          this.comparisonManager.setZoomLevel(current === '100%' ? '200%' : current === '200%' ? 'fit' : '100%');
          return;
        }
        if (e.key.toLowerCase() === 'x') {
          e.preventDefault();
          this.comparisonManager.rejectB();
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

  public isExportModalOpen(): boolean {
    return this.showExportModal;
  }

  public toggleExportModal(): void {
    this.showExportModal = !this.showExportModal;
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
