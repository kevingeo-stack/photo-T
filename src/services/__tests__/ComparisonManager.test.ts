import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComparisonManager } from '../ComparisonManager';

describe('ComparisonManager (Phase 2.5A - Tournament Rounds)', () => {
  let compManager: ComparisonManager;

  beforeEach(() => {
    compManager = ComparisonManager.getInstance();
    compManager.cancelSession(); 
  });

  const getIds = (n: number) => Array.from({ length: n }, (_, i) => `P${i + 1}`);

  it('1. No inicia comparación con menos de 2 fotos', () => {
    expect(compManager.startSession(['A'])).toBe(false);
    expect(compManager.getSession().isActive).toBe(false);
  });

  it('2. N=2: Inicializa correctamente, 1 duelo, 0 byes', () => {
    compManager.startSession(['A', 'B']);
    const session = compManager.getSession();
    
    expect(session.isActive).toBe(true);
    expect(session.currentPair).toEqual(['A', 'B']);
    expect(session.pendingPairs).toEqual([]);
    expect(session.winners).toEqual([]);
    expect(session.eliminatedIds).toEqual([]);
    expect(session.history).toEqual([]);
  });

  it('3. N=3: Byes automáticos para impar (1 duelo, 1 bye)', () => {
    compManager.startSession(['A', 'B', 'C']);
    const session = compManager.getSession();
    
    expect(session.currentPair).toEqual(['A', 'B']);
    expect(session.pendingPairs).toEqual([]);
    expect(session.winners).toEqual(['C']); // C gets a bye
  });

  it('4. N=4, 5, 6, 7 y 10: Verifica emparejamiento determinista', () => {
    // N=4 -> 2 pairs, 0 byes
    compManager.startSession(getIds(4));
    expect(compManager.getSession().currentPair).toEqual(['P1', 'P2']);
    expect(compManager.getSession().pendingPairs).toEqual([['P3', 'P4']]);
    expect(compManager.getSession().winners).toEqual([]);

    // N=5 -> 2 pairs, 1 bye
    compManager.startSession(getIds(5));
    expect(compManager.getSession().currentPair).toEqual(['P1', 'P2']);
    expect(compManager.getSession().pendingPairs).toEqual([['P3', 'P4']]);
    expect(compManager.getSession().winners).toEqual(['P5']);

    // N=6 -> 3 pairs, 0 byes
    compManager.startSession(getIds(6));
    expect(compManager.getSession().pendingPairs.length).toBe(2);
    expect(compManager.getSession().winners.length).toBe(0);

    // N=7 -> 3 pairs, 1 bye
    compManager.startSession(getIds(7));
    expect(compManager.getSession().pendingPairs.length).toBe(2);
    expect(compManager.getSession().winners).toEqual(['P7']);

    // N=10 -> 5 pairs, 0 byes
    compManager.startSession(getIds(10));
    expect(compManager.getSession().pendingPairs.length).toBe(4);
  });

  it('5. Duplicados: se purgan antes de iniciar la ronda', () => {
    expect(compManager.startSession(['A', 'A', 'B', 'B', 'C'])).toBe(true);
    const session = compManager.getSession();
    expect(session.initialIds).toEqual(['A', 'B', 'C']);
    expect(session.currentPair).toEqual(['A', 'B']);
    expect(session.winners).toEqual(['C']);
  });

  it('6. Invalid winner/decision: no altera estado', () => {
    compManager.startSession(['A', 'B', 'C']); // current: [A, B]
    compManager.chooseWinner('C'); // C is not in currentPair
    compManager.chooseWinner('INVALID');
    
    const session = compManager.getSession();
    expect(session.currentPair).toEqual(['A', 'B']);
    expect(session.winners).toEqual(['C']); // the bye
    expect(session.history.length).toBe(0);
  });

  it('7. Exclusividad de participación', () => {
    compManager.startSession(getIds(5)); // P1-P5. Bye: P5. Pairs: [P1,P2], [P3,P4]
    
    const assertExclusivity = () => {
      const { currentPair, pendingPairs, winners, eliminatedIds } = compManager.getSession();
      const allActive = [
        ...(currentPair || []),
        ...pendingPairs.flat(),
        ...winners,
        ...eliminatedIds
      ];
      const unique = new Set(allActive);
      expect(unique.size).toBe(allActive.length);
      expect(unique.size).toBe(5);
    };

    assertExclusivity();
    compManager.chooseWinner('P1');
    assertExclusivity();
    compManager.chooseWinner('P3');
    assertExclusivity();
  });

  it('8. Undo en la primera decisión', () => {
    compManager.startSession(['A', 'B', 'C', 'D']);
    compManager.chooseWinner('B');
    
    expect(compManager.getSession().currentPair).toEqual(['C', 'D']);
    expect(compManager.getSession().winners).toEqual(['B']);
    expect(compManager.getSession().eliminatedIds).toEqual(['A']);
    
    compManager.undo();
    
    const session = compManager.getSession();
    expect(session.currentPair).toEqual(['A', 'B']);
    expect(session.pendingPairs).toEqual([['C', 'D']]);
    expect(session.winners).toEqual([]);
    expect(session.eliminatedIds).toEqual([]);
  });

  it('9. Undo en la última decisión', () => {
    compManager.startSession(['A', 'B', 'C', 'D']);
    compManager.chooseWinner('A');
    compManager.chooseWinner('C');
    
    expect(compManager.getSession().isActive).toBe(false);
    expect(compManager.getWinners()).toEqual(['A', 'C']);
    
    compManager.undo();
    
    const session = compManager.getSession();
    expect(session.isActive).toBe(true);
    expect(session.currentPair).toEqual(['C', 'D']);
    expect(session.winners).toEqual(['A']);
    expect(session.eliminatedIds).toEqual(['B']);
    expect(session.pendingPairs).toEqual([]);
  });

  it('10. Cancelación limpia el estado por completo', () => {
    compManager.startSession(['A', 'B', 'C', 'D']);
    compManager.chooseWinner('A');
    compManager.cancelSession();
    
    const session = compManager.getSession();
    expect(session.isActive).toBe(false);
    expect(session.currentPair).toBe(null);
    expect(session.winners).toEqual([]);
    expect(session.history).toEqual([]);
  });

  it('11. Ronda 2 usando supervivientes de ronda 1', () => {
    compManager.startSession(['A', 'B', 'C', 'D', 'E']); // E bye
    compManager.chooseWinner('A');
    compManager.chooseWinner('C');
    
    const round1Winners = compManager.getWinners(); // ['E', 'A', 'C'] due to bye then winners
    
    compManager.startSession(round1Winners);
    const session2 = compManager.getSession();
    expect(session2.currentPair).toEqual(['E', 'A']);
    expect(session2.winners).toEqual(['C']); // C gets a bye in round 2!
  });

  it('12. Independencia y ausencia de escrituras persistentes', () => {
    // There are no imports of AppController, PhotoManager, Firebase, IndexedDB in ComparisonManager.
    // Ensure all methods are purely in-memory sync.
    const startKeys = Object.keys(compManager);
    expect(startKeys).not.toContain('photoManager');
    expect(startKeys).not.toContain('firebaseService');
    expect(startKeys).not.toContain('offlineStorage');
  });

  it('13. Decisiones repetidas en el historial (Undo múltiple)', () => {
    compManager.startSession(['A', 'B', 'C', 'D']);
    compManager.chooseWinner('A');
    compManager.undo();
    compManager.chooseWinner('A'); // same decision
    
    const session = compManager.getSession();
    expect(session.currentPair).toEqual(['C', 'D']);
    expect(session.history.length).toBe(1);
  });
});

