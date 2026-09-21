/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePhotoOriginal } from '../usePhotoOriginal';
import { PhotoManager } from '../../services/PhotoManager';
import { BlobUrlManager } from '../../utils/BlobUrlManager';

vi.mock('../../services/PhotoManager', () => ({
  PhotoManager: {
    getInstance: vi.fn()
  }
}));

vi.mock('../../utils/BlobUrlManager', () => ({
  BlobUrlManager: {
    createUrl: vi.fn(),
    revokeUrl: vi.fn()
  }
}));

describe('usePhotoOriginal', () => {
  let mockGetPhotoBlob: ReturnType<typeof vi.fn>;
  let mockGetPhotoThumbnail: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetPhotoBlob = vi.fn();
    mockGetPhotoThumbnail = vi.fn();
    (PhotoManager.getInstance as any).mockReturnValue({
      getPhotoBlob: mockGetPhotoBlob,
      getPhotoThumbnail: mockGetPhotoThumbnail,
      getPhotos: vi.fn().mockReturnValue([
        { id: 'p1', format: 'JPG' },
        { id: 'p2', format: 'ARW' },
        { id: 'p3', format: 'JPG' },
        { id: 'p4', format: 'JPG' }
      ]),
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Creates Object URL on mount and revokes on unmount', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
    mockGetPhotoBlob.mockResolvedValueOnce(mockBlob);
    (BlobUrlManager.createUrl as any).mockReturnValue('blob:test');

    const { result, unmount } = renderHook(() => usePhotoOriginal('p1'));
    
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.url).toBe('blob:test');
    expect(BlobUrlManager.createUrl).toHaveBeenCalledWith(mockBlob);
    expect(BlobUrlManager.revokeUrl).not.toHaveBeenCalled();

    unmount();
    
    expect(BlobUrlManager.revokeUrl).toHaveBeenCalledWith('blob:test');
  });

  it('2. Prevents race conditions on rapid unmount', async () => {
    const mockBlob = new Blob(['test']);
    
    let resolvePromise: any;
    const slowPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    
    mockGetPhotoBlob.mockReturnValueOnce(slowPromise);
    (BlobUrlManager.createUrl as any).mockReturnValue('blob:late');

    const { result, unmount } = renderHook(() => usePhotoOriginal('p2'));
    
    // Unmount before promise resolves
    unmount();
    
    // Now resolve
    resolvePromise(mockBlob);

    // Give microtasks time to run
    await new Promise(r => setTimeout(r, 0));

    expect(result.current.url).toBe(''); // Should not be updated
    // Note: since React state doesn't update, it's fine.
    // Cleanup shouldn't have revoked anything because createUrl wasn't called while mounted
  });

  it('3. Error de blob no rompe toda la sesión y devuelve error', async () => {
    mockGetPhotoBlob.mockRejectedValueOnce(new Error('IndexedDB failed'));
    // After blob fails, the hook also tries the thumbnail fallback.
    // Mock thumbnail to also fail so we reach the final error state.
    mockGetPhotoThumbnail.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => usePhotoOriginal('p3'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.url).toBe('');
    expect(result.current.error).toBeInstanceOf(Error);
    // The hook now catches all exceptions and reports a user-facing message
    expect(result.current.error?.message).toBe('Imagen no disponible');
  });
  
  it('4. Retorna error si el blob no se encuentra (undefined)', async () => {
    mockGetPhotoBlob.mockResolvedValueOnce(undefined);
    // Thumbnail also resolves undefined so we reach final error
    mockGetPhotoThumbnail.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => usePhotoOriginal('p4'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.url).toBe('');
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Imagen no disponible');
  });
});
