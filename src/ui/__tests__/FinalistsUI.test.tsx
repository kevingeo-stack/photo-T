// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { FinalistsUI } from '../FinalistsUI';
import { ComparisonManager } from '../../services/ComparisonManager';
import { AppController } from '../../controllers/AppController';
import { PhotoManager } from '../../services/PhotoManager';
import { Photo } from '../../types';

// Verify we use thumbnails, not originals
let mockUsePhotoThumbnail = { url: 'blob:thumb', isLoading: false, error: null };
vi.mock('../../hooks/usePhotoThumbnail', () => ({
  usePhotoThumbnail: () => mockUsePhotoThumbnail
}));

// Strictly fail if usePhotoOriginal is imported/called
vi.mock('../../hooks/usePhotoOriginal', () => ({
  usePhotoOriginal: () => {
    throw new Error('usePhotoOriginal should not be used in FinalistsUI');
  }
}));

describe('FinalistsUI (Phase 2.5A)', () => {
  let compManager: ComparisonManager;
  let controller: AppController;
  let photoManager: PhotoManager;

  const mockFinalists: Photo[] = [
    { id: 'f1', name: 'photo1.jpg', format: 'JPG', exif: {}, status: 'kept' },
    { id: 'f2', name: 'photo2.jpg', format: 'JPG', exif: {}, status: 'kept' },
    { id: 'f1', name: 'photo1.jpg', format: 'JPG', exif: {}, status: 'kept' } // Duplicado intencional
  ] as Photo[];

  beforeEach(() => {
    compManager = ComparisonManager.getInstance();
    controller = AppController.getInstance();
    photoManager = PhotoManager.getInstance();
    
    compManager.cancelSession(); 
    controller.clearFinalSelection();
    vi.spyOn(photoManager, 'getPhotos').mockReturnValue(mockFinalists);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('1. Renderiza correctamente y deduplica IDs', () => {
    vi.spyOn(compManager, 'getWinners').mockReturnValue(['f1', 'f2', 'f1']);
    
    const { getByText } = render(<FinalistsUI />);
    
    // There are 2 unique finalists
    expect(getByText('photo1.jpg')).toBeDefined();
    expect(getByText('photo2.jpg')).toBeDefined();
    
    // Should be exactly 2 photos displayed
    const cards = document.querySelectorAll('.group');
    expect(cards.length).toBe(2);
  });

  it('2. Toggle select incrementa y decrementa correctamente el contador', () => {
    vi.spyOn(compManager, 'getWinners').mockReturnValue(['f1', 'f2']);
    
    const { getByText } = render(<FinalistsUI />);
    
    // Al inicio ambos están seleccionados (2 únicas)
    expect(getByText(/Resultado de la ronda/i)).toBeTruthy();

    const continueBtn = getByText(/Revisar selección \(2\)/i).closest('button')!;
    expect(continueBtn.disabled).toBe(false);

    // Clic en la primera para deseleccionar
    const cards = document.querySelectorAll('.group');
    fireEvent.click(cards[0]);

    expect(getByText('1 seleccionadas')).toBeDefined();
    expect(getByText(/Seleccionar finales/i).closest('button')?.disabled).toBe(false);

    // Clic en la segunda para deseleccionar
    fireEvent.click(cards[1]);
    expect(getByText('0 seleccionadas')).toBeDefined();
    
    // El botón debe estar deshabilitado
    const disabledBtn = getByText(/Seleccionar finales/i).closest('button')!;
    expect(disabledBtn.disabled).toBe(true);
  });

  it('3. "Finalizar Selección" guarda la selección y navega a editor', () => {
    vi.spyOn(compManager, 'getWinners').mockReturnValue(['f1', 'f2']);
    const setModeSpy = vi.spyOn(controller, 'setMode').mockImplementation(() => {});
    
    const { getByText } = render(<FinalistsUI />);
    
    // Deseleccionamos una
    const cards = document.querySelectorAll('.group');
    fireEvent.click(cards[1]); // Queda solo 'f1'
    
    // Continuar
    fireEvent.click(getByText(/Seleccionar finales/i));
    
    // Verificaciones
    expect(controller.getFinalSelection()).toEqual(['f1']);
    expect(setModeSpy).toHaveBeenCalledWith('editor');
  });

  it('4. "Revisar selección" abre PreRoundUI con los supervivientes', () => {
    vi.spyOn(compManager, 'getWinners').mockReturnValue(['f1', 'f2']);
    const openSelectionViewSpy = vi.spyOn(controller, 'openSelectionView').mockImplementation(() => {});
    
    const { getByText } = render(<FinalistsUI />);
    
    // Continuar con ambas
    fireEvent.click(getByText(/Revisar selección \(2\)/i));
    
    // Verificaciones
    expect(openSelectionViewSpy).toHaveBeenCalledWith(['f1', 'f2']);
  });

  it('5. "Volver a comparar" invoca undo() y reabre el torneo', () => {
    vi.spyOn(compManager, 'getWinners').mockReturnValue(['f1', 'f2']);
    vi.spyOn(compManager, 'getSession').mockReturnValue({
      isActive: false,
      roundNumber: 1,
      initialIds: ['f1', 'f2'],
      currentPair: null,
      pendingPairs: [],
      winners: ['f1'],
      eliminatedIds: ['f2'],
      history: [{
        leftId: 'f1', rightId: 'f2', winnerId: 'f1', loserId: 'f2',
        previousPendingPairs: [], previousWinners: [], previousEliminatedIds: []
      }]
    });
    
    const undoSpy = vi.spyOn(compManager, 'undo').mockImplementation(() => {});
    const setModeSpy = vi.spyOn(controller, 'setMode').mockImplementation(() => {});
    
    const { getByText } = render(<FinalistsUI />);
    
    fireEvent.click(getByText('Volver a comparar'));
    
    expect(undoSpy).toHaveBeenCalledTimes(1);
    expect(setModeSpy).toHaveBeenCalledWith('compare');
  });

  it('6. "Cancelar" limpia finalSelectionIds y cancela sesión', () => {
    vi.spyOn(compManager, 'getWinners').mockReturnValue(['f1', 'f2']);
    
    controller.setFinalSelection(['f1', 'f2']);
    
    const cancelSessionSpy = vi.spyOn(compManager, 'cancelSession').mockImplementation(() => {});
    const clearFinalSelectionSpy = vi.spyOn(controller, 'clearFinalSelection');
    
    const { getByText } = render(<FinalistsUI />);
    
    fireEvent.click(getByText('Cancelar'));
    
    expect(cancelSessionSpy).toHaveBeenCalledTimes(1);
    expect(clearFinalSelectionSpy).toHaveBeenCalledTimes(1);
    expect(controller.getFinalSelection()).toEqual([]);
  });

  it('7. Estado vacío se renderiza sin errores', () => {
    vi.spyOn(compManager, 'getWinners').mockReturnValue([]);
    
    const { getByText } = render(<FinalistsUI />);
    expect(getByText('No hay finalistas')).toBeDefined();
    expect(getByText('No completaste la sesión de comparación.')).toBeDefined();
  });
});
