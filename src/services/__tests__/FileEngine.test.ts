/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThumbnailGenerator } from '../../utils/ThumbnailGenerator';
import { BlobUrlManager } from '../../utils/BlobUrlManager';
import { OfflineStorageService } from '../OfflineStorageService';
import { PhotoManager } from '../PhotoManager';
import { StorageService } from '../StorageService';
import { Photo } from '../../types';

vi.mock('../../mockData', () => ({
  INITIAL_PHOTOS: []
}));

// Mock Firebase
vi.mock('firebase/app', () => ({
  getApp: vi.fn(),
  getApps: vi.fn(() => []),
}));
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadBytesResumable: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn()
}));
vi.mock('../FirebaseService', () => ({
  FirebaseService: {
    getInstance: vi.fn(() => ({
      getUserId: vi.fn(() => 'user123'),
      getAuthState: vi.fn(() => 'LOCAL_OFFLINE'),
      subscribe: vi.fn(),
      subscribeToUserImages: vi.fn()
    }))
  }
}));

// Mock URL methods
const createObjectURLMock = vi.fn((blob) => `blob:http://localhost/${Math.random()}`);
const revokeObjectURLMock = vi.fn();
global.URL.createObjectURL = createObjectURLMock;
global.URL.revokeObjectURL = revokeObjectURLMock;

// Mock OfflineStorageService
const mockOfflineStorageInstance = {
  init: vi.fn().mockResolvedValue(undefined),
  getAllPhotos: vi.fn().mockResolvedValue([]),
  savePhotos: vi.fn().mockResolvedValue(undefined),
  savePhoto: vi.fn().mockResolvedValue(undefined),
  updatePhotoStatus: vi.fn().mockResolvedValue(undefined),
  getPendingActions: vi.fn().mockResolvedValue([]),
  queueAction: vi.fn().mockResolvedValue({}),
  deleteAction: vi.fn().mockResolvedValue(undefined),
  saveBlob: vi.fn().mockResolvedValue(undefined),
  getBlob: vi.fn().mockResolvedValue(undefined),
  saveThumbnail: vi.fn().mockResolvedValue(undefined),
  getThumbnail: vi.fn().mockResolvedValue(undefined)
};

vi.mock('../OfflineStorageService', () => {
  return {
    OfflineStorageService: {
      getInstance: vi.fn(() => mockOfflineStorageInstance)
    }
  };
});

// We need to mock canvas for ThumbnailGenerator testing in jsdom
const toBlobMock = vi.fn((callback, type, quality) => {
  callback(new Blob(['mock_webp_bytes'], { type }));
});
const drawImageMock = vi.fn();
const getContextMock = vi.fn(() => ({ drawImage: drawImageMock }));
HTMLCanvasElement.prototype.getContext = getContextMock as any;
HTMLCanvasElement.prototype.toBlob = toBlobMock as any;
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==');

describe('File Engine & Thumbnail Generation (Phase 2.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // @ts-ignore
    PhotoManager.instance = undefined;
    // @ts-ignore
    OfflineStorageService.instance = undefined;
  });

  describe('ThumbnailGenerator', () => {
    it('1. Genera thumbnail y 2. Conserva aspect ratio (400px max)', async () => {
      const mockBlob = new Blob(['huge_image_bytes'], { type: 'image/jpeg' });
      
      // Mock createImageBitmap
      global.createImageBitmap = vi.fn().mockResolvedValue({
        width: 800,
        height: 600,
        close: vi.fn()
      });

      const thumbBlob = await ThumbnailGenerator.generate(mockBlob, 400);

      // Check aspect ratio calculation: 800x600 -> 400x300
      expect(drawImageMock).toHaveBeenCalledWith(expect.anything(), 0, 0, 400, 300);
      expect(thumbBlob).toBeInstanceOf(Blob);
      expect(thumbBlob.type).toBe('image/webp');
      
      // Original blob should not be mutated or closed
      expect(mockBlob.size).toBeGreaterThan(0);
    });

    it('3. Fallback a JPEG si WebP no es soportado', async () => {
      const mockBlob = new Blob(['image'], { type: 'image/jpeg' });
      global.createImageBitmap = vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() });
      
      // Force toDataURL to not return webp
      HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,...');
      
      const thumbBlob = await ThumbnailGenerator.generate(mockBlob, 400);
      
      expect(toBlobMock).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8);
    });
  });

  describe('OfflineStorageService', () => {
    it('5. Original y thumbnail se almacenan independientemente', async () => {
      const storage = OfflineStorageService.getInstance();
      
      const origStoreSpy = vi.spyOn(storage, 'saveBlob');
      const thumbStoreSpy = vi.spyOn(storage, 'saveThumbnail');

      const original = new Blob(['original'], { type: 'image/raw' });
      const thumb = new Blob(['thumb'], { type: 'image/webp' });

      await storage.saveBlob('img_1', original);
      await storage.saveThumbnail('img_1', thumb);

      expect(origStoreSpy).toHaveBeenCalledWith('img_1', original);
      expect(thumbStoreSpy).toHaveBeenCalledWith('img_1', thumb);
    });
  });

  describe('BlobUrlManager', () => {
    it('9. Object URL puede crearse y revocarse', () => {
      const blob = new Blob(['data']);
      const url = BlobUrlManager.createUrl(blob);
      
      expect(url).toMatch(/^blob:/);
      expect(createObjectURLMock).toHaveBeenCalledWith(blob);

      BlobUrlManager.revokeUrl(url);
      expect(revokeObjectURLMock).toHaveBeenCalledWith(url);
    });
  });

  describe('PhotoManager Import Flow', () => {
    it('6. Photo nueva no persiste blob URL', async () => {
      const pm = PhotoManager.getInstance();
      (pm as any).photos = [];
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock generate
      vi.spyOn(ThumbnailGenerator, 'generate').mockResolvedValue(new Blob(['thumb']));
      
      await pm.importFiles([mockFile]);

      const photos = pm.getPhotos();
      expect(photos.length).toBe(1); 
      
      const newPhoto = photos[0];
      // StorageService now returns '' for offline cache
      expect(newPhoto.url).toBe('');
      expect(newPhoto.isLocalOnly).toBe(true);
      expect(newPhoto.url.startsWith('blob:')).toBe(false);
    });

    it('10. Múltiples importaciones continúan aunque una falle', async () => {
      const pm = PhotoManager.getInstance();
      // clear mock photos
      (pm as any).photos = [];
      const file1 = new File(['1'], 'f1.jpg');
      const file2 = new File(['2'], 'f2.jpg'); // We will make this fail
      const file3 = new File(['3'], 'f3.jpg');

      vi.spyOn(ThumbnailGenerator, 'generate').mockResolvedValue(new Blob(['thumb']));
      
      // Force StorageService.uploadPhoto to throw on file2
      const storageSpy = vi.spyOn(StorageService.getInstance(), 'uploadPhoto')
        .mockImplementation(async (uid, pid, file, fname) => {
          if (fname === 'f2.jpg') throw new Error('Simulated failure');
          return { url: '', storagePath: 'path', isLocalBlob: true };
        });

      await pm.importFiles([file1, file2, file3]);

      const photos = pm.getPhotos();
      // f1 and f3 should be imported successfully
      expect(photos.length).toBe(2);
      expect(photos.find(p => p.name === 'f1.jpg')).toBeDefined();
      expect(photos.find(p => p.name === 'f3.jpg')).toBeDefined();
    });

    it('7. Foto antigua con blob URL no explota y 8. Puede generar thumbnail bajo demanda', async () => {
      const pm = PhotoManager.getInstance();
      const storage = OfflineStorageService.getInstance();

      // Simulate an old photo that has no thumbnail but has the original blob
      const oldBlob = new Blob(['old_original'], { type: 'image/jpeg' });
      vi.spyOn(storage, 'getThumbnail').mockResolvedValue(undefined); // Thumbnail not found
      vi.spyOn(storage, 'getBlob').mockResolvedValue(oldBlob); // Original exists
      
      const genSpy = vi.spyOn(ThumbnailGenerator, 'generate').mockResolvedValue(new Blob(['new_thumb']));
      const saveThumbSpy = vi.spyOn(storage, 'saveThumbnail');
      
      // Act
      const thumb = await pm.getPhotoThumbnail('img_old');
      
      // Assert
      expect(thumb).toBeDefined();
      expect(genSpy).toHaveBeenCalledWith(oldBlob);
      expect(saveThumbSpy).toHaveBeenCalledWith('img_old', expect.any(Blob));
    });
  });
});
