import { Photo, PhotoStatus, TriageFolder, SortMode, IngestionProgress } from '../types';
import { INITIAL_PHOTOS } from '../mockData';
import { OfflineStorageService } from './OfflineStorageService';
import { FirebaseService } from './FirebaseService';
import { StorageService } from './StorageService';

/**
 * PhotoManager - OOP Business Logic for PhotoTriage.
 * Manages photo collection, triage states (kept/rejected/unrated), batch actions,
 * storage upload pipeline, and bidirectional sync between IndexedDB & Firebase.
 */
export class PhotoManager {
  private static instance: PhotoManager;
  private photos: Photo[] = [];
  private selectedIds: Set<string> = new Set(['DSC08492', 'AURORA_01', 'DIAMOND_022']);
  private activeFolder: TriageFolder = 'all';
  private sortMode: SortMode = 'capture-desc';
  private searchFilter: string = '';
  private ingestion: IngestionProgress = {
    active: true,
    totalFiles: 24,
    processedFiles: 20,
    percentage: 82,
    source: 'SD Card',
    bufferedBytes: 1.2 * 1024 * 1024 * 1024,
    totalBytes: 1.5 * 1024 * 1024 * 1024,
    speedMBs: 4.2
  };

  private offlineStorage = OfflineStorageService.getInstance();
  private firebaseService = FirebaseService.getInstance();
  private storageService = StorageService.getInstance();
  private listeners: Array<() => void> = [];
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  private constructor() {
    this.init();
  }

  public static getInstance(): PhotoManager {
    if (!PhotoManager.instance) {
      PhotoManager.instance = new PhotoManager();
    }
    return PhotoManager.instance;
  }

  private async init(): Promise<void> {
    // 1. Initialize IndexedDB and load cached photos
    try {
      await this.offlineStorage.init();
      const cached = await this.offlineStorage.getAllPhotos();
      if (cached && cached.length > 0) {
        this.photos = cached;
      } else {
        // Seed with realistic professional mock dataset from Stitch
        this.photos = [...INITIAL_PHOTOS];
        await this.offlineStorage.savePhotos(this.photos);
      }
    } catch (err) {
      console.warn('[PhotoManager] Could not load offline photos, using initial set:', err);
      this.photos = [...INITIAL_PHOTOS];
    }

    // 2. Setup online/offline network listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.syncPendingActions();
        this.notify();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notify();
      });
    }

    // 3. Setup Firebase sync if configured
    this.setupFirebaseSync();

    this.notify();
  }

  private setupFirebaseSync(): void {
    const userId = this.firebaseService.getUserId();
    if (this.firebaseService.getIsConfigured() && this.isOnline) {
      this.firebaseService.subscribeToUserImages(userId, (remotePhotos) => {
        if (remotePhotos && remotePhotos.length > 0) {
          // Merge remote with local
          const mergedMap = new Map<string, Photo>();
          this.photos.forEach((p) => mergedMap.set(p.id, p));
          remotePhotos.forEach((rp) => mergedMap.set(rp.id, rp));
          this.photos = Array.from(mergedMap.values());
          this.offlineStorage.savePhotos(this.photos);
          this.notify();
        }
      });
    }
  }

  public getPhotos(): Photo[] {
    return this.photos;
  }

  public getFilteredPhotos(): Photo[] {
    let result = [...this.photos];

    // Filter by Folder
    switch (this.activeFolder) {
      case 'flagged':
        result = result.filter((p) => p.status === 'kept');
        break;
      case 'rejected':
        result = result.filter((p) => p.status === 'rejected');
        break;
      case 'unrated':
        result = result.filter((p) => p.status === 'unrated');
        break;
      case 'burst-groups':
        result = result.filter((p) => !!p.burstGroupId);
        break;
      case 'all':
      default:
        break;
    }

    // Filter by Search
    if (this.searchFilter.trim()) {
      const q = this.searchFilter.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.format.toLowerCase().includes(q) ||
          p.exif.camera.toLowerCase().includes(q) ||
          p.exif.lens.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (this.sortMode) {
      case 'capture-desc':
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'capture-asc':
        result.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'sharpness':
        result.sort((a, b) => b.sharpnessScore - a.sharpnessScore);
        break;
      case 'iso':
        result.sort((a, b) => b.exif.iso - a.exif.iso);
        break;
      case 'filesize':
        result.sort((a, b) => b.size - a.size);
        break;
    }

    return result;
  }

  public getCounts() {
    const all = this.photos.length;
    const flagged = this.photos.filter((p) => p.status === 'kept').length;
    const rejected = this.photos.filter((p) => p.status === 'rejected').length;
    const unrated = this.photos.filter((p) => p.status === 'unrated').length;
    const bursts = new Set(this.photos.filter((p) => p.burstGroupId).map((p) => p.burstGroupId)).size || 12;
    return { all, flagged, rejected, unrated, bursts };
  }

  public getSelectedIds(): Set<string> {
    return this.selectedIds;
  }

  public isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  public toggleSelect(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.notify();
  }

  public selectAll(select: boolean): void {
    if (select) {
      this.photos.forEach((p) => this.selectedIds.add(p.id));
    } else {
      this.selectedIds.clear();
    }
    this.notify();
  }

  public selectFlagged(): void {
    this.selectedIds.clear();
    this.photos.filter((p) => p.status === 'kept').forEach((p) => this.selectedIds.add(p.id));
    this.notify();
  }

  public clearInactiveFlags(): void {
    this.selectedIds.clear();
    this.notify();
  }

  public setFolder(folder: TriageFolder): void {
    this.activeFolder = folder;
    this.notify();
  }

  public getActiveFolder(): TriageFolder {
    return this.activeFolder;
  }

  public setSortMode(mode: SortMode): void {
    this.sortMode = mode;
    this.notify();
  }

  public getSortMode(): SortMode {
    return this.sortMode;
  }

  public getIngestionProgress(): IngestionProgress {
    return this.ingestion;
  }

  /**
   * Triage Logic: Keep (Flag / Pick)
   */
  public async setStatus(photoId: string, status: PhotoStatus, notifySubscribers: boolean = true): Promise<void> {
    const photo = this.photos.find((p) => p.id === photoId);
    if (!photo) return;

    photo.status = status;
    photo.updatedAt = Date.now();

    // 1. Offline storage update immediately (Optimistic UI)
    await this.offlineStorage.updatePhotoStatus(photoId, status);

    // 2. Firebase sync or queue
    const userId = this.firebaseService.getUserId();
    if (this.isOnline && this.firebaseService.getIsConfigured()) {
      try {
        await this.firebaseService.updateImageStatus(userId, photoId, status);
      } catch (err) {
        console.warn('[PhotoManager] Remote status update failed, queuing:', err);
        await this.offlineStorage.queueAction({
          type: 'update_status',
          payload: { userId, photoId, status }
        });
      }
    } else {
      await this.offlineStorage.queueAction({
        type: 'update_status',
        payload: { userId, photoId, status }
      });
    }

    if (notifySubscribers) {
      this.notify();
    }
  }

  /**
   * Batch Keep: Mark all selected as 'kept'
   */
  public async batchKeep(): Promise<void> {
    const targetIds = this.selectedIds.size > 0 ? Array.from(this.selectedIds) : [];
    const promises = targetIds.map(id => this.setStatus(id, 'kept', false));
    await Promise.all(promises);
    this.selectedIds.clear();
    this.notify();
  }

  /**
   * Batch Discard: Mark all selected as 'rejected'
   */
  public async batchDiscard(): Promise<void> {
    const targetIds = this.selectedIds.size > 0 ? Array.from(this.selectedIds) : [];
    const promises = targetIds.map(id => this.setStatus(id, 'rejected', false));
    await Promise.all(promises);
    this.selectedIds.clear();
    this.notify();
  }

  /**
   * Delete photo permanently: removes document from Firestore, file from Cloud Storage, and IndexedDB
   */
  public async deletePhoto(photoId: string): Promise<void> {
    const photo = this.photos.find((p) => p.id === photoId);
    if (!photo) return;

    this.photos = this.photos.filter((p) => p.id !== photoId);
    this.selectedIds.delete(photoId);

    // Delete locally
    await this.offlineStorage.deletePhoto(photoId);

    // Delete remotely
    const userId = this.firebaseService.getUserId();
    if (this.isOnline && this.firebaseService.getIsConfigured()) {
      try {
        await this.firebaseService.deleteImageMetadata(userId, photoId);
        if (photo.storagePath) {
          await this.storageService.deletePhoto(photo.storagePath);
        }
      } catch (err) {
        console.warn('[PhotoManager] Remote delete failed, queuing:', err);
        await this.offlineStorage.queueAction({
          type: 'delete',
          payload: { userId, photoId, storagePath: photo.storagePath }
        });
      }
    } else {
      await this.offlineStorage.queueAction({
        type: 'delete',
        payload: { userId, photoId, storagePath: photo.storagePath }
      });
    }

    this.notify();
  }

  /**
   * Set Star Rating for photo
   */
  public async setStarRating(photoId: string, rating: number): Promise<void> {
    const photo = this.photos.find((p) => p.id === photoId);
    if (!photo) return;

    photo.starRating = rating;
    await this.offlineStorage.savePhoto(photo);

    const userId = this.firebaseService.getUserId();
    if (this.isOnline && this.firebaseService.getIsConfigured()) {
      await this.firebaseService.saveImageMetadata(userId, photoId, { starRating: rating });
    }
    this.notify();
  }

  /**
   * Update arbitrary details of a photo (e.g. name, starRating) from the Editor
   */
  public async updatePhotoDetails(photoId: string, updates: Partial<Photo>): Promise<void> {
    const photo = this.photos.find((p) => p.id === photoId);
    if (!photo) return;

    Object.assign(photo, updates);
    photo.updatedAt = Date.now();

    await this.offlineStorage.savePhoto(photo);

    const userId = this.firebaseService.getUserId();
    if (this.isOnline && this.firebaseService.getIsConfigured()) {
      await this.firebaseService.saveImageMetadata(userId, photoId, updates);
    }
    
    this.notify();
  }

  /**
   * Ingestion: Handle File Uploads (drag-and-drop or file dialog)
   */
  public async importFiles(files: FileList | File[]): Promise<void> {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    this.ingestion.active = true;
    this.ingestion.totalFiles = fileArray.length;
    this.ingestion.processedFiles = 0;
    this.ingestion.percentage = 0;
    this.notify();

    const userId = this.firebaseService.getUserId();

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const extension = (file.name.split('.').pop() || 'ARW').toUpperCase() as any;
      const photoId = `img_${Date.now()}_${i}`;

      try {
        // Upload to Storage (or fallback IndexedDB blob)
        const uploadRes = await this.storageService.uploadPhoto(
          userId,
          file,
          file.name,
          (pct) => {
            const overall = Math.round(((i + pct / 100) / fileArray.length) * 100);
            this.ingestion.percentage = overall;
            this.notify();
          }
        );

        // Generate synthetic EXIF and Sharpness for newly ingested RAW/JPG photos
        const newPhoto: Photo = {
          id: photoId,
          name: file.name,
          url: uploadRes.url,
          size: file.size,
          sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          format: extension,
          status: 'unrated',
          sharpnessScore: Math.round((85 + Math.random() * 14) * 10) / 10,
          starRating: 0,
          exif: {
            shutter: '1/1000s',
            aperture: 'f/2.8',
            iso: 200,
            focalLength: '35mm',
            lens: 'Sony 24-70mm GM II',
            camera: 'Sony A1',
            dimensions: '9504 × 6336',
            megapixels: '61 MP',
            evShift: '0.0 EV'
          },
          createdAt: Date.now(),
          userId,
          storagePath: uploadRes.storagePath,
          isLocalOnly: uploadRes.isLocalBlob
        };

        this.photos.unshift(newPhoto);
        await this.offlineStorage.savePhoto(newPhoto);

        // Save metadata to Firestore at users/{userId}/images/{imageId}
        if (this.isOnline && this.firebaseService.getIsConfigured()) {
          await this.firebaseService.saveImageMetadata(userId, photoId, newPhoto);
        } else {
          await this.offlineStorage.queueAction({
            type: 'upload',
            payload: { userId, photoId, photo: newPhoto }
          });
        }

        this.ingestion.processedFiles = i + 1;
        this.notify();
      } catch (err) {
        console.error('[PhotoManager] Error importing file:', file.name, err);
      }
    }

    this.ingestion.percentage = 100;
    setTimeout(() => {
      this.ingestion.active = false;
      this.notify();
    }, 1500);
  }

  /**
   * Offline Sync Queue Processor
   */
  public async syncPendingActions(): Promise<void> {
    if (!this.isOnline || !this.firebaseService.getIsConfigured()) return;

    try {
      const pending = await this.offlineStorage.getPendingActions();
      if (!pending || pending.length === 0) return;

      console.log(`[PhotoManager] Processing ${pending.length} pending offline actions...`);
      for (const act of pending) {
        try {
          if (act.type === 'update_status') {
            const { userId, photoId, status } = act.payload;
            await this.firebaseService.updateImageStatus(userId, photoId, status);
          } else if (act.type === 'upload') {
            const { userId, photoId, photo } = act.payload;
            await this.firebaseService.saveImageMetadata(userId, photoId, photo);
          } else if (act.type === 'delete') {
            const { userId, photoId, storagePath } = act.payload;
            await this.firebaseService.deleteImageMetadata(userId, photoId);
            if (storagePath) {
              await this.storageService.deletePhoto(storagePath);
            }
          }
          await this.offlineStorage.markActionSynced(act.id);
        } catch (actErr) {
          console.warn('[PhotoManager] Action sync failed:', act, actErr);
        }
      }
      console.log('[PhotoManager] Offline sync completed.');
    } catch (err) {
      console.warn('[PhotoManager] Error flushing sync queue:', err);
    }
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
