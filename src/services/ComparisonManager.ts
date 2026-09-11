import { Photo, BurstGroup, ComparisonState } from '../types';
import { INITIAL_BURST_GROUPS } from '../mockData';
import { PhotoManager } from './PhotoManager';

/**
 * ComparisonManager - OOP class managing 2-Up split triage comparison,
 * synchronized loupe zoom, edge peaking inspection, histogram analysis,
 * and burst sequence filmstrip navigation.
 */
export class ComparisonManager {
  private static instance: ComparisonManager;
  private state: ComparisonState = {
    candidateAId: 'DSC08492',
    candidateBId: 'DSC08493',
    zoomLevel: '100%',
    showHistogram: true,
    showPeaking: true,
    splitCurtain: false,
    activeBurstGroupId: 'burst-04'
  };

  private burstGroups: BurstGroup[] = [...INITIAL_BURST_GROUPS];
  private photoManager = PhotoManager.getInstance();
  private listeners: Array<() => void> = [];

  private constructor() {}

  public static getInstance(): ComparisonManager {
    if (!ComparisonManager.instance) {
      ComparisonManager.instance = new ComparisonManager();
    }
    return ComparisonManager.instance;
  }

  public getState(): ComparisonState {
    return { ...this.state };
  }

  public getCandidateA(): Photo | undefined {
    return this.photoManager.getPhotos().find((p) => p.id === this.state.candidateAId);
  }

  public getCandidateB(): Photo | undefined {
    return this.photoManager.getPhotos().find((p) => p.id === this.state.candidateBId);
  }

  public getActiveBurstGroup(): BurstGroup | undefined {
    return this.burstGroups.find((g) => g.id === this.state.activeBurstGroupId);
  }

  public getBurstPhotos(): Photo[] {
    const group = this.getActiveBurstGroup();
    if (!group) return [];
    const all = this.photoManager.getPhotos();
    return group.photoIds.map((id) => all.find((p) => p.id === id)).filter((p): p is Photo => !!p);
  }

  public setCandidates(idA: string, idB: string): void {
    this.state.candidateAId = idA;
    this.state.candidateBId = idB;
    this.notify();
  }

  public setCandidateB(idB: string): void {
    this.state.candidateBId = idB;
    this.notify();
  }

  public setZoomLevel(level: 'fit' | '100%' | '200%'): void {
    this.state.zoomLevel = level;
    this.notify();
  }

  public toggleHistogram(): void {
    this.state.showHistogram = !this.state.showHistogram;
    this.notify();
  }

  public togglePeaking(): void {
    this.state.showPeaking = !this.state.showPeaking;
    this.notify();
  }

  public toggleSplitCurtain(): void {
    this.state.splitCurtain = !this.state.splitCurtain;
    this.notify();
  }

  /**
   * Keep Candidate A (Key: 1 or Button): Marks A as kept
   */
  public async keepA(): Promise<void> {
    if (this.state.candidateAId) {
      await this.photoManager.setStatus(this.state.candidateAId, 'kept');
    }
  }

  /**
   * Reject Candidate A: Marks A as rejected
   */
  public async rejectA(): Promise<void> {
    if (this.state.candidateAId) {
      await this.photoManager.setStatus(this.state.candidateAId, 'rejected');
    }
  }

  /**
   * Keep Candidate B (Promoted Winner, Key: 2 or Button):
   * Marks B as kept, and optionally shifts B to become the new Base (Slot A) for subsequent comparisons.
   */
  public async keepB(promoteToBase = false): Promise<void> {
    if (this.state.candidateBId) {
      await this.photoManager.setStatus(this.state.candidateBId, 'kept');
      if (promoteToBase) {
        this.state.candidateAId = this.state.candidateBId;
        this.advanceBurstFrame(1);
      }
    }
  }

  /**
   * Reject Candidate B: Marks B as rejected and advances to next burst frame
   */
  public async rejectB(): Promise<void> {
    if (this.state.candidateBId) {
      await this.photoManager.setStatus(this.state.candidateBId, 'rejected');
      this.advanceBurstFrame(1);
    }
  }

  /**
   * Step through burst frames in Slot B
   */
  public advanceBurstFrame(direction: 1 | -1): void {
    const burstPhotos = this.getBurstPhotos();
    if (burstPhotos.length === 0) return;

    const currentIndex = burstPhotos.findIndex((p) => p.id === this.state.candidateBId);
    let nextIndex = currentIndex + direction;

    if (nextIndex < 0) nextIndex = burstPhotos.length - 1;
    if (nextIndex >= burstPhotos.length) nextIndex = 0;

    this.state.candidateBId = burstPhotos[nextIndex].id;
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
