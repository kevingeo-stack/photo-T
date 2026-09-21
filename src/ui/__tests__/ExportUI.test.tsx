/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ExportUI } from '../ExportUI';
import { AppController } from '../../controllers/AppController';
import { PhotoManager } from '../../services/PhotoManager';
import { ImageExporter } from '../../utils/ImageExporter';
import { Photo } from '../../types';

// Mock dependencies
vi.mock('../../controllers/AppController', () => {
  return {
    AppController: {
      getInstance: vi.fn()
    }
  };
});

vi.mock('../../services/PhotoManager', () => {
  return {
    PhotoManager: {
      getInstance: vi.fn(() => ({
        getPhotos: vi.fn(),
        getPhotoBlob: vi.fn(),
      }))
    }
  };
});

vi.mock('../../utils/ImageExporter', () => {
  return {
    ImageExporter: {
      renderEdited: vi.fn(),
      downloadBlob: vi.fn(),
      replaceExtension: vi.fn(),
    }
  };
});

// Avoid canvas errors in jsdom
beforeAll(() => {
  if (typeof document !== 'undefined') {
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          toDataURL: vi.fn(() => 'data:image/webp;base64,...'),
          getContext: vi.fn(),
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });
  }
});

describe('ExportUI (Phase 2.7)', () => {
  let controllerMock: any;
  let photoManagerMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    controllerMock = {
      getFinalSelection: vi.fn().mockReturnValue(['1', '2']),
      setMode: vi.fn()
    };
    
    (AppController.getInstance as any).mockReturnValue(controllerMock);
    
    photoManagerMock = {
      getPhotos: vi.fn(() => [
        {
          id: '1',
          name: `Foto1.jpg`,
          format: 'JPG',
          editState: null,
        } as Photo,
        {
          id: '2',
          name: `Foto2.jpg`,
          format: 'JPG',
          editState: { brightness: 110, contrast: 100, saturation: 100 },
        } as Photo
      ]),
      getPhotoBlob: vi.fn().mockResolvedValue(new Blob(['dummy'], { type: 'image/jpeg' }))
    };
    
    (PhotoManager.getInstance as any).mockReturnValue(photoManagerMock);
    
    (ImageExporter.renderEdited as any).mockResolvedValue(new Blob(['rendered'], { type: 'image/jpeg' }));
    (ImageExporter.replaceExtension as any).mockImplementation((name: string, mime: string) => {
      if (mime === 'image/jpeg') return name.replace('.jpg', '.jpg');
      if (mime === 'image/png') return name.replace('.jpg', '.png');
      return name;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('1. Renderiza correctamente indicando la cantidad de fotos finales', () => {
    render(<ExportUI />);
    // "2 fotos en selección final"
    expect(screen.getByText(/2 fotos en selección final/i)).toBeDefined();
    // Start export button
    expect(screen.getByTestId('export-start-btn').textContent).toMatch(/Exportar 2 fotos/i);
  });

  it('2. El botón exportar actualiza cantidad cuando se deselecciona', () => {
    render(<ExportUI />);
    // Initial state: 2 selected
    const startBtn = screen.getByTestId('export-start-btn');
    expect(startBtn.textContent).toMatch(/Exportar 2 fotos/i);
    
    // Find select all/deselect all button
    const selectAllBtn = screen.getByText('Deseleccionar todo');
    fireEvent.click(selectAllBtn);
    
    // Now 0 selected
    expect(startBtn).toHaveProperty('disabled', true);
  });

  it('3. Cancela si es RAW original con edición', async () => {
    // Override photo 1 to be RAW with edits
    photoManagerMock.getPhotos.mockReturnValue([
      {
        id: '1',
        name: 'RAW1.cr3',
        format: 'CR3',
        editState: { brightness: 110, contrast: 100, saturation: 100 }
      } as Photo,
      {
        id: '2',
        name: 'Foto2.jpg',
        format: 'JPG',
        editState: null
      } as Photo
    ]);
    
    window.alert = vi.fn();
    
    render(<ExportUI />);
    
    // By default it is in 'original' format
    fireEvent.click(screen.getByTestId('export-start-btn'));
    
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('tiene cambios. Para exportar la edición, elige JPEG, PNG o WebP.'));
    expect(ImageExporter.downloadBlob).not.toHaveBeenCalled();
  });

  it('4. Realiza descarga secuencial llamando a renderEdited si es necesario', async () => {
    render(<ExportUI />);
    
    // Cambiar formato a JPEG
    const jpegBtn = screen.getByRole('button', { name: /JPEG/i });
    fireEvent.click(jpegBtn);
    
    fireEvent.click(screen.getByTestId('export-start-btn'));
    
    await waitFor(() => {
      expect(ImageExporter.renderEdited).toHaveBeenCalledTimes(2);
      expect(ImageExporter.downloadBlob).toHaveBeenCalledTimes(2);
    });
  });
});
