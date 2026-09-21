// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { PhotoCard } from '../../components/PhotoCard';
import { Photo } from '../../types';

vi.mock('../../hooks/usePhotoThumbnail', () => ({
  usePhotoThumbnail: () => ({ url: 'blob:test', isLoading: false, error: null })
}));

describe('PhotoCard & GalleryUI Selection (Phase 2.2A)', () => {
  let toggleSelectMock: any;
  const mockPhoto = { id: 'p1', name: 'test.jpg', status: 'kept', exif: {} } as Photo;

  beforeEach(() => {
    toggleSelectMock = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Click on card toggles selection exactly once', () => {
    const { container } = render(
      <PhotoCard 
        photo={mockPhoto} 
        isSelected={false}
        onToggleSelect={toggleSelectMock}
        onSetStatus={vi.fn()}
        onSendToCompare={vi.fn()}
        onOpenLoupe={vi.fn()}
        onSetStarRating={vi.fn()}
      />
    );
    
    const card = container.querySelector('.group');
    fireEvent.click(card!);
    
    expect(toggleSelectMock).toHaveBeenCalledTimes(1);
    expect(toggleSelectMock).toHaveBeenCalledWith('p1');
  });

  it('2. Click on checkbox toggles selection exactly once (no bubbling)', () => {
    const { container } = render(
      <PhotoCard 
        photo={mockPhoto} 
        isSelected={false}
        onToggleSelect={toggleSelectMock}
        onSetStatus={vi.fn()}
        onSendToCompare={vi.fn()}
        onOpenLoupe={vi.fn()}
        onSetStarRating={vi.fn()}
      />
    );
    
    // The checkbox is the first button inside the card
    const checkbox = container.querySelector('button');
    fireEvent.click(checkbox!);
    
    expect(toggleSelectMock).toHaveBeenCalledTimes(1);
    expect(toggleSelectMock).toHaveBeenCalledTimes(1);
    expect(toggleSelectMock).toHaveBeenCalledWith('p1');
  });
});

import { AppController } from '../../controllers/AppController';
import { ComparisonManager } from '../../services/ComparisonManager';
import { PhotoManager } from '../../services/PhotoManager';
import { GalleryUI } from '../GalleryUI';

describe('GalleryUI to Compare Navigation (Phase 2.2B)', () => {
  let controller: AppController;
  let compManager: ComparisonManager;
  let photoManager: PhotoManager;

  beforeEach(() => {
    controller = AppController.getInstance();
    compManager = ComparisonManager.getInstance();
    photoManager = PhotoManager.getInstance();
    
    // Reset state
    controller.setMode('gallery');
    compManager.cancelSession();
    photoManager.selectAll(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('3. con menos de 2 seleccionadas no se entra a compare desde menú HUD', () => {
    photoManager.getFilteredPhotos = () => [{ id: 'p1', status: 'kept', exif: {} } as Photo];
    photoManager.getSelectedIds = () => new Set(['p1']);
    
    const { getAllByText } = render(<GalleryUI />);
    const compareBtn = getAllByText('Revisar selección (1)')[0].closest('button')!;
    
    fireEvent.click(compareBtn);
    
    expect(controller.getMode()).toBe('gallery');
    expect(compManager.getSession().isActive).toBe(false);
  });

  it('4. shortcut C con menos de 2 seleccionadas no entra a compare', () => {
    photoManager.getSelectedIds = () => new Set(['p1']);
    controller.startComparisonWithSelection();
    
    expect(controller.getMode()).toBe('gallery');
    expect(compManager.getSession().isActive).toBe(false);
  });

  it('5. acción del menú inicia realmente una sesión con la selección (>= 2)', () => {
    photoManager.getFilteredPhotos = () => [
      { id: 'p1', status: 'kept', exif: {} },
      { id: 'p2', status: 'kept', exif: {} }
    ] as Photo[];
    photoManager.getSelectedIds = () => new Set(['p1', 'p2']);
    
    const { getAllByText } = render(<GalleryUI />);
    const compareBtn = getAllByText('Revisar selección (2)')[0].closest('button')!;
    
    fireEvent.click(compareBtn);
    
    expect(controller.getMode()).toBe('pre-round');
    expect(compManager.getSession().isActive).toBe(false);
  });

  it('6. el FAB continúa funcionando para iniciar la comparación', () => {
    photoManager.getFilteredPhotos = () => [
      { id: 'p1', status: 'kept', exif: {} },
      { id: 'p2', status: 'kept', exif: {} }
    ] as Photo[];
    photoManager.getSelectedIds = () => new Set(['p1', 'p2']);
    
    const { getByText, getAllByRole } = render(<GalleryUI />);
    // Since selectedIds.size > 1, FAB should be visible.
    const fabBtn = getAllByRole('button', { name: /Revisar selección/i })[0];

    fireEvent.click(fabBtn);
    
    expect(controller.getMode()).toBe('pre-round');
    expect(compManager.getSession().isActive).toBe(false);
  });

  it('7. shortcut C inicia sesión con la selección (>= 2)', () => {
    photoManager.getSelectedIds = () => new Set(['p1', 'p2']);
    
    // Simulate AppController 'c' keydown behavior manually since testing keydown on window in jsdom can be tricky.
    // Instead we just call what 'c' calls when not in compare mode: startComparisonWithSelection
    controller.startComparisonWithSelection();
    
    expect(controller.getMode()).toBe('pre-round');
    expect(compManager.getSession().isActive).toBe(false);
  });
});
