// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { ComparisonUI } from '../ComparisonUI';
import { ComparisonManager } from '../../services/ComparisonManager';
import { AppController } from '../../controllers/AppController';
import { PhotoManager } from '../../services/PhotoManager';
import { Photo } from '../../types';

// Mock the hook to control loading/error states
let mockUsePhotoOriginalFn = (id: string | undefined) => ({ url: 'blob:test', isLoading: false, error: null as Error | null });
vi.mock('../../hooks/usePhotoOriginal', () => ({
  usePhotoOriginal: (id: string | undefined) => mockUsePhotoOriginalFn(id)
}));

describe('ComparisonUI (Phase 2.5A)', () => {
  let compManager: ComparisonManager;
  let controller: AppController;
  let photoManager: PhotoManager;

  const mockPhotos: Photo[] = [
    { id: 'p1', name: 'photo1.jpg', status: 'kept' },
    { id: 'p2', name: 'photo2.jpg', status: 'kept' },
    { id: 'p3', name: 'photo3.jpg', status: 'kept' }
  ] as Photo[];

  beforeEach(() => {
    compManager = ComparisonManager.getInstance();
    controller = AppController.getInstance();
    photoManager = PhotoManager.getInstance();
    compManager.cancelSession(); // reset
    vi.spyOn(photoManager, 'getPhotos').mockReturnValue(mockPhotos);
    mockUsePhotoOriginalFn = (id) => ({ url: 'blob:test', isLoading: false, error: null });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('1. Renders empty state if no session active', () => {
    const { getByText } = render(<ComparisonUI />);
    expect(getByText('No hay sesión de comparación activa.')).toBeDefined();
  });

  it('2. Renders photos when session active', () => {
    vi.spyOn(compManager, 'getSession').mockReturnValue({
      isActive: true,
      roundNumber: 1,
      initialIds: ['p1', 'p2', 'p3'],
      currentPair: ['p1', 'p2'],
      pendingPairs: [],
      winners: ['p3'],
      eliminatedIds: [],
      history: []
    });

    const { getByText, getByAltText, getAllByRole } = render(<ComparisonUI />);
    
    // Check titles
    expect(getByAltText('Opción A: photo1.jpg')).toBeTruthy();
    expect(getByAltText('Opción B: photo2.jpg')).toBeTruthy();
    
    // Check buttons
    const buttons = getAllByRole('button', { name: /Elegir /i });
    expect(buttons.length).toBe(2);
  });

  it('3. Elegir Izquierda (A) / Derecha (B) calls chooseWinner', () => {
    vi.spyOn(compManager, 'getSession').mockReturnValue({
      isActive: true,
      roundNumber: 1,
      initialIds: ['p1', 'p2', 'p3'],
      currentPair: ['p1', 'p2'],
      pendingPairs: [],
      winners: ['p3'],
      eliminatedIds: [],
      history: []
    });
    
    vi.spyOn(compManager, 'chooseWinner').mockImplementation(() => {});

    const { getAllByRole } = render(<ComparisonUI />);
    
    const buttons = getAllByRole('button', { name: /Elegir /i });
    expect(buttons.length).toBe(2);

    // Clic en la A
    fireEvent.click(buttons[0]);
    expect(compManager.chooseWinner).toHaveBeenCalledWith('p1');

    // Clic en la B
    fireEvent.click(buttons[1]);
    expect(compManager.chooseWinner).toHaveBeenCalledWith('p2');
  });

  it('4. Undo is disabled when history is empty, active when not', () => {
    vi.spyOn(compManager, 'getSession').mockReturnValue({
      isActive: true,
      roundNumber: 1,
      initialIds: ['p1', 'p2', 'p3'],
      currentPair: ['p1', 'p2'],
      pendingPairs: [],
      winners: ['p3'],
      eliminatedIds: [],
      history: [] // Empty
    });
    
    const { getByText, unmount } = render(<ComparisonUI />);
    const undoBtn = getByText('Deshacer [Z]').closest('button')!;
    expect(undoBtn.disabled).toBe(true);
    unmount();

    // Now mock with history
    vi.spyOn(compManager, 'getSession').mockReturnValue({
      isActive: true,
      roundNumber: 1,
      initialIds: ['p1', 'p2', 'p3'],
      currentPair: ['p1', 'p2'],
      pendingPairs: [],
      winners: ['p3'],
      eliminatedIds: [],
      history: [{
        leftId: 'p1', rightId: 'p3', winnerId: 'p1', loserId: 'p3',
        previousPendingPairs: [], previousWinners: [], previousEliminatedIds: []
      }] // 1 item
    });
    
    const { getByText: getByTextNew } = render(<ComparisonUI />);
    const undoBtnNew = getByTextNew('Deshacer [Z]').closest('button')!;
    expect(undoBtnNew.disabled).toBe(false);
  });

  it('5. Cancel session calls compManager.cancelSession', () => {
    vi.spyOn(compManager, 'getSession').mockReturnValue({
      isActive: true,
      roundNumber: 1,
      initialIds: ['p1', 'p2', 'p3'],
      currentPair: ['p1', 'p2'],
      pendingPairs: [],
      winners: ['p3'],
      eliminatedIds: [],
      history: []
    });
    const returnSpy = vi.spyOn(controller, 'returnToSelectionView').mockImplementation(() => {});

    const { getByText } = render(<ComparisonUI />);
    const backBtn = getByText('Volver a mi selección').closest('button')!;
    
    // Si el history está vacío, no pide confirmación
    fireEvent.click(backBtn);
    expect(returnSpy).toHaveBeenCalled();
  });

  it('5b. Shows confirmation modal if history is not empty', () => {
    vi.spyOn(compManager, 'getSession').mockReturnValue({
      isActive: true,
      roundNumber: 1,
      initialIds: ['p1', 'p2', 'p3'],
      currentPair: ['p1', 'p2'],
      pendingPairs: [],
      winners: ['p3'],
      eliminatedIds: [],
      history: [{
        leftId: 'p1', rightId: 'p3', winnerId: 'p1', loserId: 'p3',
        previousPendingPairs: [], previousWinners: [], previousEliminatedIds: []
      }]
    });
    
    const returnSpy = vi.spyOn(controller, 'returnToSelectionView').mockImplementation(() => {});

    const { getByText, queryByText } = render(<ComparisonUI />);
    const backBtn = getByText('Volver a mi selección').closest('button')!;
    
    fireEvent.click(backBtn);
    
    // Modal debe aparecer
    expect(getByText('¿Volver a tu selección?')).toBeDefined();
    expect(returnSpy).not.toHaveBeenCalled();

    // Confirmar salir
    const confirmBtn = getByText('Volver a mi selección', { selector: '.bg-transparent, .border' }).closest('button')!;
    fireEvent.click(confirmBtn);
    expect(returnSpy).toHaveBeenCalled();
  });

  it('6. Shows loading state and disables BOTH buttons even if only one is loading (A loading, B loaded)', () => {
    mockUsePhotoOriginalFn = (id) => {
      if (id === 'p1') return { url: '', isLoading: true, error: null };
      return { url: 'blob:p2', isLoading: false, error: null };
    };
    
    vi.spyOn(compManager, 'getSession').mockReturnValue({
      isActive: true,
      roundNumber: 1,
      initialIds: ['p1', 'p2', 'p3'],
      currentPair: ['p1', 'p2'],
      pendingPairs: [],
      winners: ['p3'],
      eliminatedIds: [],
      history: []
    });

    const { getAllByText, getAllByRole } = render(<ComparisonUI />);
    
    // 1 loading indicator should be visible
    expect(getAllByText('Cargando original...').length).toBe(1);
    
    // BOTH buttons should be disabled
    const buttons = getAllByRole('button', { name: /Elegir /i });
    const btnA = buttons[0] as HTMLButtonElement;
    const btnB = buttons[1] as HTMLButtonElement;
    expect(btnA.disabled).toBe(true);
    expect(btnB.disabled).toBe(true);
  });

  it('7. Shows error state when blob fails', () => {
    mockUsePhotoOriginalFn = (id) => ({ url: '', isLoading: false, error: new Error('Failed to load') });
    
    vi.spyOn(compManager, 'getSession').mockReturnValue({
      isActive: true,
      roundNumber: 1,
      initialIds: ['p1', 'p2', 'p3'],
      currentPair: ['p1', 'p2'],
      pendingPairs: [],
      winners: ['p3'],
      eliminatedIds: [],
      history: []
    });

    const { getAllByText } = render(<ComparisonUI />);
    
    expect(getAllByText('Imagen original no disponible').length).toBe(2);
  });

  it('8. Shows loading state and disables BOTH buttons if inverse is loading (A loaded, B loading)', () => {
    mockUsePhotoOriginalFn = (id) => {
      if (id === 'p2') return { url: '', isLoading: true, error: null };
      return { url: 'blob:p1', isLoading: false, error: null };
    };
    
    vi.spyOn(compManager, 'getSession').mockReturnValue({
      isActive: true,
      roundNumber: 1,
      initialIds: ['p1', 'p2', 'p3'],
      currentPair: ['p1', 'p2'],
      pendingPairs: [],
      winners: ['p3'],
      eliminatedIds: [],
      history: []
    });

    const { getAllByText, getAllByRole } = render(<ComparisonUI />);
    
    expect(getAllByText('Cargando original...').length).toBe(1);
    
    const buttons = getAllByRole('button', { name: /Elegir /i });
    const btnA = buttons[0] as HTMLButtonElement;
    const btnB = buttons[1] as HTMLButtonElement;
    expect(btnA.disabled).toBe(true);
    expect(btnB.disabled).toBe(true);
  });
});
