import { Photo, ComparisonSession, ComparisonDecision } from '../types';

export class ComparisonManager {
  private static instance: ComparisonManager;
  
  private session: ComparisonSession = {
    isActive: false,
    roundNumber: 1,
    initialIds: [],
    pendingPairs: [],
    currentPair: null,
    winners: [],
    eliminatedIds: [],
    history: []
  };

  private listeners: Array<() => void> = [];

  private constructor() {}

  public static getInstance(): ComparisonManager {
    if (!ComparisonManager.instance) {
      ComparisonManager.instance = new ComparisonManager();
    }
    return ComparisonManager.instance;
  }

  public getSession(): ComparisonSession {
    return { ...this.session };
  }

  public getCurrentPair(): [string, string] | null {
    return this.session.currentPair;
  }

  public getWinners(): string[] {
    return [...this.session.winners];
  }

  /**
   * Starts a new Tournament Round
   */
  public startSession(ids: string[]): boolean {
    const sessionIds = [...new Set(ids)]; // Deduplicate input IDs
    
    if (sessionIds.length < 2) {
      return false; // Need at least 2 photos to start a round
    }

    const pendingPairs: [string, string][] = [];
    const winners: string[] = [];

    // Create mutually exclusive pairs
    for (let i = 0; i < sessionIds.length; i += 2) {
      if (i + 1 < sessionIds.length) {
        pendingPairs.push([sessionIds[i], sessionIds[i + 1]]);
      } else {
        // Odd one out, gets a bye
        winners.push(sessionIds[i]);
      }
    }

    const currentPair = pendingPairs.length > 0 ? pendingPairs.shift()! : null;
    
    this.session = {
      isActive: true,
      roundNumber: this.session.isActive ? this.session.roundNumber : this.session.roundNumber + 1,
      initialIds: sessionIds,
      pendingPairs,
      currentPair,
      winners,
      eliminatedIds: [],
      history: []
    };

    this.notify();
    return true;
  }

  /**
   * Choose the winner of the current matchup
   */
  public chooseWinner(winnerId: string): void {
    if (!this.session.isActive || !this.session.currentPair) return;

    const [leftId, rightId] = this.session.currentPair;
    if (winnerId !== leftId && winnerId !== rightId) {
      return; // Invalid winnerId
    }

    const loserId = winnerId === leftId ? rightId : leftId;

    // Save exact previous state for deterministic undo
    const decision: ComparisonDecision = {
      leftId,
      rightId,
      winnerId,
      loserId,
      previousPendingPairs: this.session.pendingPairs.map(pair => [...pair] as [string, string]),
      previousWinners: [...this.session.winners],
      previousEliminatedIds: [...this.session.eliminatedIds]
    };

    this.session.history.push(decision);
    
    // Apply consequences
    this.session.winners.push(winnerId);
    this.session.eliminatedIds.push(loserId);

    // Fetch next pair
    if (this.session.pendingPairs.length > 0) {
      this.session.currentPair = this.session.pendingPairs.shift()!;
    } else {
      // No more pairs, round is over
      this.session.currentPair = null;
      this.session.isActive = false;
    }

    this.notify();
  }

  /**
   * Reverts the exact last decision deterministically
   */
  public undo(): void {
    if (this.session.history.length === 0) return;

    const lastDecision = this.session.history.pop()!;
    
    // Restore exact state
    this.session.isActive = true;
    this.session.currentPair = [lastDecision.leftId, lastDecision.rightId];
    this.session.pendingPairs = lastDecision.previousPendingPairs.map(pair => [...pair] as [string, string]);
    this.session.winners = [...lastDecision.previousWinners];
    this.session.eliminatedIds = [...lastDecision.previousEliminatedIds];

    this.notify();
  }

  /**
   * Cancels the session and returns to gallery
   */
  public cancelSession(): void {
    this.session = {
      isActive: false,
      roundNumber: 1,
      initialIds: [],
      pendingPairs: [],
      currentPair: null,
      winners: [],
      eliminatedIds: [],
      history: []
    };
    
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
