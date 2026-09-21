// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePhotoThumbnail } from '../../hooks/usePhotoThumbnail';
import { PhotoManager } from '../../services/PhotoManager';
import { BlobUrlManager } from '../../utils/BlobUrlManager';

describe('usePhotoThumbnail (Phase 2.2A)', () => {
  let createSpy: any;
  let revokeSpy: any;
  let pmSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock BlobUrlManager
    createSpy = vi.spyOn(BlobUrlManager, 'createUrl').mockImplementation((blob) => `blob:test-${(blob as any).id}`);
    revokeSpy = vi.spyOn(BlobUrlManager, 'revokeUrl').mockImplementation(() => {});

    // Mock PhotoManager
    const pm = PhotoManager.getInstance();
    pmSpy = vi.spyOn(pm, 'getPhotoThumbnail').mockImplementation(async (id: string) => {
      return { id, type: 'image/webp', size: 100 } as any; // Fake blob
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Creates Object URL on mount and revokes on unmount', async () => {
    const { result, unmount } = renderHook(() => usePhotoThumbnail('photo1'));
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.url).toBe('blob:test-photo1');
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).not.toHaveBeenCalled();

    // Unmount
    unmount();
    
    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:test-photo1');
  });

  it('2. Revokes previous URL when photoId changes', async () => {
    const { result, rerender } = renderHook(({ id }) => usePhotoThumbnail(id), {
      initialProps: { id: 'photo1' },
    });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.url).toBe('blob:test-photo1');
    
    // Change ID
    rerender({ id: 'photo2' });
    
    expect(revokeSpy).toHaveBeenCalledWith('blob:test-photo1');
    
    await waitFor(() => {
      expect(result.current.url).toBe('blob:test-photo2');
    });
    
    expect(createSpy).toHaveBeenCalledTimes(2);
  });

  it('3. Ignores stale async results if photoId changes quickly (race condition)', async () => {
    // Make the first request slow
    let resolveFirst: any;
    const firstPromise = new Promise((resolve) => { resolveFirst = resolve; });
    
    pmSpy.mockImplementation(async (id: string) => {
      if (id === 'slow') {
        await firstPromise;
        return { id, type: 'image/webp' } as any;
      }
      return { id, type: 'image/webp' } as any;
    });

    const { result, rerender } = renderHook(({ id }) => usePhotoThumbnail(id), {
      initialProps: { id: 'slow' },
    });
    
    // Immediately change ID before slow promise resolves
    rerender({ id: 'fast' });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.url).toBe('blob:test-fast');
    
    // Now resolve the slow one
    resolveFirst();
    
    // Wait a bit to ensure it doesn't override the state
    await new Promise(process.nextTick);
    
    expect(result.current.url).toBe('blob:test-fast'); // Remains fast
    
    // The stale createUrl might be called but since isMounted=false for that effect,
    // wait, our code says `if (!isMounted) return;` BEFORE `createUrl`
    expect(createSpy).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'slow' }));
  });

  it('4. Does not update state after unmount', async () => {
    let resolvePromise: any;
    pmSpy.mockImplementation(async () => {
      return new Promise(r => { resolvePromise = r; });
    });

    const { result, unmount } = renderHook(() => usePhotoThumbnail('photo1'));
    
    unmount();
    
    // Resolve after unmount
    resolvePromise({ id: 'photo1' } as any);
    
    await new Promise(process.nextTick);
    
    // State should still be loading since it shouldn't have updated
    expect(result.current.isLoading).toBe(true);
  });
});
