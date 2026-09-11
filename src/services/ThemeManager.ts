/**
 * ThemeManager - OOP class managing theme tokens, dark mode, density, and styling
 */

export type DensityMode = 1 | 2 | 3; // 1: Dense, 2: Standard, 3: Large

export class ThemeManager {
  private static instance: ThemeManager;
  private isDark: boolean = true;
  private density: DensityMode = 2;
  private listeners: Array<() => void> = [];

  private constructor() {
    this.init();
  }

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  private init(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('bg-background', 'text-on-surface');
    }
  }

  public getIsDark(): boolean {
    return this.isDark;
  }

  public toggleDarkMode(): void {
    this.isDark = !this.isDark;
    if (typeof document !== 'undefined') {
      if (this.isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    this.notify();
  }

  public getDensity(): DensityMode {
    return this.density;
  }

  public setDensity(mode: DensityMode): void {
    this.density = mode;
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
