// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PhotoManager } from '../PhotoManager';
import { OfflineStorageService } from '../OfflineStorageService';
import { Photo } from '../../types';

vi.mock('../../mockData', () => ({
  INITIAL_PHOTOS: [
    { id: 'p1', status: 'kept' },
    { id: 'p2', status: 'rejected' },
    { id: 'p3', status: 'kept' },
  ] as Photo[]
}));

describe('PhotoManager Selection & Filtering (Phase 2.2A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // @ts-ignore
    PhotoManager.instance = undefined;
    // @ts-ignore
    OfflineStorageService.instance = undefined;
    
    vi.spyOn(OfflineStorageService.prototype, 'init').mockResolvedValue({} as any);
    vi.spyOn(OfflineStorageService.prototype, 'getAllPhotos').mockResolvedValue([
      { id: 'p1', status: 'kept' },
      { id: 'p2', status: 'rejected' },
      { id: 'p3', status: 'kept' },
    ] as Photo[]);
    vi.spyOn(OfflineStorageService.prototype, 'savePhotos').mockResolvedValue();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Filter "all" excludes rejected photos by default', async () => {
    const pm = PhotoManager.getInstance();
    // wait for init
    await new Promise(process.nextTick);
    
    const photos = pm.getFilteredPhotos();
    expect(photos.length).toBe(2);
    expect(photos.find(p => p.id === 'p1')).toBeDefined();
    expect(photos.find(p => p.id === 'p3')).toBeDefined();
    expect(photos.find(p => p.id === 'p2')).toBeUndefined();
  });
  
  it('2. Selection is sanitized after photos load', async () => {
    // Set localStorage with an invalid ID and a rejected ID
    localStorage.setItem('phototriage_active_selection', JSON.stringify(['p1', 'p2', 'p99']));
    
    const pm = PhotoManager.getInstance();
    await new Promise(process.nextTick);
    
    const selected = Array.from(pm.getSelectedIds());
    expect(selected).toEqual(['p1']); // p2 is rejected, p99 does not exist
    
    // Check if localStorage was updated with sanitized list
    expect(localStorage.getItem('phototriage_active_selection')).toBe(JSON.stringify(['p1']));
  });

  it('3. toggleSelect updates localStorage', async () => {
    const pm = PhotoManager.getInstance();
    await new Promise(process.nextTick);
    
    pm.toggleSelect('p3');
    expect(pm.isSelected('p3')).toBe(true);
    
    const stored = JSON.parse(localStorage.getItem('phototriage_active_selection') || '[]');
    expect(stored).toContain('p3');
  });
});
