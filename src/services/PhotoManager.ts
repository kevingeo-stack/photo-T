import { Photo, PhotoStatus, TriageFolder, SortMode, IngestionProgress, PhotoEditState } from '../types';

import { OfflineStorageService } from './OfflineStorageService';
import { FirebaseService, AuthState } from './FirebaseService';
import { StorageService } from './StorageService';
import { ThumbnailGenerator } from '../utils/ThumbnailGenerator';
import { ImageExporter } from '../utils/ImageExporter';

/**
 * PhotoManager - OOP Business Logic for PhotoTriage.
 * Manages photo collection, triage states (kept/rejected/unrated), batch actions,
 * storage upload pipeline, and bidirectional sync between IndexedDB & Firebase.
 */
export class PhotoManager {
  private static instance: PhotoManager;
  private photos: Photo[] = [];
  private selectedIds: Set<string> = new Set();
  private activeFolder: TriageFolder = 'all';
  private sortMode: SortMode = 'capture-desc';
  private searchFilter: string = '';
  private ingestion: IngestionProgress = {
    active: false,
    totalFiles: 0,
    processedFiles: 0,
    percentage: 0,
    source: 'SD Card',
    bufferedBytes: 0,
    totalBytes: 0,
    speedMBs: 0
  };

  private offlineStorage = OfflineStorageService.getInstance();
  private firebaseService = FirebaseService.getInstance();
  private storageService = StorageService.getInstance();
  private listeners: Array<() => void> = [];
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private unsubscribeFirebase: (() => void) | null = null;
  private isSyncing = false;

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
        // App starts empty on new device
        this.photos = [];
      }
    } catch (err) {
      console.warn('[PhotoManager] Could not load offline photos:', err);
      this.photos = [];
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

    // Restore and sanitize active selection
    this.loadAndSanitizeSelection();

    // 3. React to Firebase Auth State Changes
    this.firebaseService.subscribe((user, authState) => {
      if (authState === 'AUTHENTICATED') {
        this.setupFirebaseSync();
        this.syncPendingActions();
      } else if (authState === 'LOCAL_OFFLINE') {
        this.cleanupFirebaseSync();
      }
      this.notify();
    });
  }

  private cleanupFirebaseSync(): void {
    if (this.unsubscribeFirebase) {
      this.unsubscribeFirebase();
      this.unsubscribeFirebase = null;
    }
  }

  private setupFirebaseSync(): void {
    this.cleanupFirebaseSync();

    const authState = this.firebaseService.getAuthState();
    if (authState !== 'AUTHENTICATED' || !this.isOnline) {
      return;
    }

    const userId = this.firebaseService.getUserId();
    this.unsubscribeFirebase = this.firebaseService.subscribeToUserImages(userId, (remotePhotos) => {
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

  private persistSelection(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('phototriage_active_selection', JSON.stringify(Array.from(this.selectedIds)));
    }
  }

  private loadAndSanitizeSelection(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('phototriage_active_selection');
        if (stored) {
          const ids = JSON.parse(stored) as string[];
          const validIds = ids.filter((id) => {
            const photo = this.photos.find((p) => p.id === id);
            return photo && photo.status !== 'rejected';
          });
          this.selectedIds = new Set(validIds);
          this.persistSelection(); // Resave sanitized list
          this.notify();
        }
      } catch (e) {
        console.warn('[PhotoManager] Failed to load active selection from localStorage', e);
      }
    }
  }

  public getPhotos(): Photo[] {
    return this.photos;
  }

  /**
   * Resolves the thumbnail blob for a photo. Handles legacy fallback.
   * 1. Try to get thumbnail blob
   * 2. If exists, return it
   * 3. If not, try to get original blob
   * 4. If exists, generate thumbnail on demand, save it, and return it
   * 5. If neither exists, return undefined
   */
  public async getPhotoThumbnail(photoId: string): Promise<Blob | undefined> {
    try {
      const thumb = await this.offlineStorage.getThumbnail(photoId);
      if (thumb) return thumb;

      const original = await this.offlineStorage.getBlob(photoId);
      if (original) {
        // Fallback for legacy photos without thumbnail
        const newThumb = await ThumbnailGenerator.generate(original);
        await this.offlineStorage.saveThumbnail(photoId, newThumb);
        return newThumb;
      }
      return undefined; // Resource lost locally
    } catch (e) {
      console.error('[PhotoManager] Error resolving thumbnail:', e);
      return undefined;
    }
  }

  /**
   * Resolves the original blob for a photo.
   * Required for high-resolution comparison.
   */
  public async getPhotoBlob(photoId: string): Promise<Blob | undefined> {
    try {
      const original = await this.offlineStorage.getBlob(photoId);
      return original;
    } catch (e) {
      console.error('[PhotoManager] Error resolving original blob:', e);
      return undefined;
    }
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
      case 'all':
      default:
        result = result.filter((p) => p.status !== 'rejected');
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
    const flagged = this.photos.filter((p) => p.status === 'kept' && p.starRating > 0).length;
    const rejected = this.photos.filter((p) => p.status === 'rejected').length;
    return { all, flagged, rejected };
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
    this.persistSelection();
    this.notify();
  }

  public selectAll(select: boolean): void {
    if (select) {
      this.photos.filter((p) => p.status !== 'rejected').forEach((p) => this.selectedIds.add(p.id));
    } else {
      this.selectedIds.clear();
    }
    this.persistSelection();
    this.notify();
  }

  public selectFlagged(): void {
    this.selectedIds.clear();
    this.photos.filter((p) => p.status === 'kept').forEach((p) => this.selectedIds.add(p.id));
    this.persistSelection();
    this.notify();
  }

  public clearInactiveFlags(): void {
    this.selectedIds.clear();
    this.persistSelection();
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
    await this.offlineStorage.queueAction({
      type: 'update_status',
      payload: { photoId, status }
    });

    // Fire and forget sync
    this.syncPendingActions().catch(err => console.warn('Sync error', err));

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
    await this.offlineStorage.deleteBlob(photoId).catch(() => {});
    await this.offlineStorage.deleteBlob(`thumb_${photoId}`).catch(() => {});

    // Delete remotely
    await this.offlineStorage.queueAction({
      type: 'delete',
      payload: { photoId, storagePath: photo.storagePath }
    });

    this.syncPendingActions().catch(err => console.warn('Sync error', err));

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

    await this.offlineStorage.queueAction({
      type: 'batch_update', // Will handle in syncPendingActions
      payload: { photoId, updates: { starRating: rating } }
    });

    this.syncPendingActions().catch(err => console.warn('Sync error', err));
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

    await this.offlineStorage.queueAction({
      type: 'batch_update',
      payload: { photoId, updates }
    });

    this.syncPendingActions().catch(err => console.warn('Sync error', err));
    this.notify();
  }

  /**
   * Guardar como copia: Crea una nueva foto en la colección con el editState aplicado.
   * La foto original permanece intacta.
   * Returns the new photo's id, or throws on unrecoverable error.
   */
  public async savePhotoCopy(photoId: string, editState: PhotoEditState): Promise<Photo> {
    const original = this.photos.find((p) => p.id === photoId);
    if (!original) throw new Error(`Photo not found: ${photoId}`);

    // 1. Load the original blob (or thumbnail as last resort)
    let sourceBlob: Blob | undefined;
    try {
      sourceBlob = await this.offlineStorage.getBlob(photoId);
    } catch {
      sourceBlob = undefined;
    }
    if (!sourceBlob) {
      try {
        sourceBlob = await this.offlineStorage.getThumbnail(photoId);
      } catch {
        sourceBlob = undefined;
      }
    }
    if (!sourceBlob) throw new Error('No blob available to create a copy');

    // 2. Render the edited version via Canvas
    const editedBlob = await ImageExporter.renderEdited(sourceBlob, editState);
    if (!editedBlob) throw new Error('Browser could not render the edited image');

    // 3. Generate a thumbnail for the copy
    let thumbBlob: Blob;
    try {
      thumbBlob = await ThumbnailGenerator.generate(editedBlob);
    } catch {
      thumbBlob = editedBlob; // fallback: use the full edited blob as thumb
    }

    // 4. Derive copy name
    const copyName = ImageExporter.deriveCopyName(original.name);
    const copyId = `copy_${photoId}_${Date.now()}`;

    // 5. Persist blobs
    await this.offlineStorage.saveBlob(copyId, editedBlob);
    await this.offlineStorage.saveThumbnail(copyId, thumbBlob);

    // 6. Build and persist the new Photo entity
    const newPhoto: Photo = {
      ...original,
      id: copyId,
      name: copyName,
      url: '',          // Not persisting ObjectURLs
      thumbnailUrl: undefined,
      editState: null,   // The copy IS the result; no further edit state
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isLocalOnly: true,
      storagePath: undefined,
    };

    this.photos.unshift(newPhoto);
    await this.offlineStorage.savePhoto(newPhoto);
    this.notify();

    return newPhoto;
  }

  /**
   * Reemplazar esta foto: Aplica el editState renderizando la imagen y actualizando
   * el Blob y thumbnail del original. El original NO se destruye (el archivo binario
   * se sobreescribe con la versión renderizada, que es el comportamiento esperado).
   */
  public async replacePhotoWithEdits(photoId: string, editState: PhotoEditState): Promise<void> {
    const photo = this.photos.find((p) => p.id === photoId);
    if (!photo) throw new Error(`Photo not found: ${photoId}`);

    // 1. Load original blob
    let sourceBlob: Blob | undefined;
    try {
      sourceBlob = await this.offlineStorage.getBlob(photoId);
    } catch {
      sourceBlob = undefined;
    }
    if (!sourceBlob) {
      try {
        sourceBlob = await this.offlineStorage.getThumbnail(photoId);
      } catch {
        sourceBlob = undefined;
      }
    }
    if (!sourceBlob) throw new Error('No blob available to replace photo');

    // 2. Render edited version
    const editedBlob = await ImageExporter.renderEdited(sourceBlob, editState);
    if (!editedBlob) throw new Error('Browser could not render the edited image for replace');

    // 3. Re-generate thumbnail from edited result
    let thumbBlob: Blob;
    try {
      thumbBlob = await ThumbnailGenerator.generate(editedBlob);
    } catch {
      thumbBlob = editedBlob;
    }

    // 4. Overwrite blobs in storage
    await this.offlineStorage.saveBlob(photoId, editedBlob);
    await this.offlineStorage.saveThumbnail(photoId, thumbBlob);

    // 5. Update Photo entity: persist editState and mark updated
    photo.editState = editState;
    photo.updatedAt = Date.now();
    await this.offlineStorage.savePhoto(photo);

    await this.offlineStorage.queueAction({
      type: 'batch_update',
      payload: { photoId, updates: { editState } }
    });

    this.syncPendingActions().catch(err => console.warn('Sync error', err));
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
    const isAuth = this.firebaseService.getAuthState() === 'AUTHENTICATED';

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const extension = (file.name.split('.').pop() || 'ARW').toUpperCase() as any;
      const photoId = `img_${Date.now()}_${i}`;

      try {
        // Generate and save thumbnail first
        try {
          const thumbnailBlob = await ThumbnailGenerator.generate(file);
          await this.offlineStorage.saveThumbnail(photoId, thumbnailBlob);
        } catch (e) {
          console.warn('[PhotoManager] Thumbnail generation failed for', file.name, e);
        }

        // Save original locally using the consistent photoId
        await this.offlineStorage.saveBlob(photoId, file);

        // Upload to Storage (or skip if offline)
        const uploadRes = await this.storageService.uploadPhoto(
          userId,
          photoId,
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
          url: '', // Object URLs cannot be persisted. They are generated on demand by usePhotoOriginal.
          size: file.size,
          sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          format: extension,
          status: 'kept',
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

        await this.offlineStorage.queueAction({
          type: 'upload',
          payload: { photoId, photo: newPhoto }
        });

        // Try syncing incrementally
        this.syncPendingActions().catch(err => console.warn('Sync error', err));

        this.ingestion.processedFiles = i + 1;
        this.ingestion.percentage = Math.round(((i + 1) / fileArray.length) * 100);
        this.notify();

        // Yield to the event loop so React can render the new photo and update progress
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (err: any) {
        if (err.name === 'QuotaExceededError' || (err.inner && err.inner.name === 'QuotaExceededError')) {
          alert('Ya no hay suficiente espacio disponible en este dispositivo para guardar más fotos.');
          console.error('[PhotoManager] Quota exceeded:', err);
          break; // Stop further imports
        }
        console.error('[PhotoManager] Error importing file:', file.name, err);
        // Do not abort the entire batch on individual failure
        this.ingestion.processedFiles = i + 1;
        this.ingestion.percentage = Math.round(((i + 1) / fileArray.length) * 100);
        this.notify();
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Finalize ingestion state
    this.ingestion.percentage = 100;
    this.notify();
    setTimeout(() => {
      this.ingestion.active = false;
      this.notify();
    }, 2500);
  }

  /**
   * Offline Sync Queue Processor
   */
  public async syncPendingActions(): Promise<void> {
    const isAuth = this.firebaseService.getAuthState() === 'AUTHENTICATED';
    if (!this.isOnline || !isAuth || this.isSyncing) return;

    this.isSyncing = true;
    try {
      const pending = await this.offlineStorage.getPendingActions();
      if (!pending || pending.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.log(`[PhotoManager] Processing ${pending.length} pending offline actions...`);
      const currentUserId = this.firebaseService.getUserId(); // Always real Firebase UID since isAuth is true

      for (const act of pending) {
        try {
          if (act.type === 'update_status') {
            const { photoId, status } = act.payload;
            await this.firebaseService.updateImageStatus(currentUserId, photoId, status);
          } else if (act.type === 'upload') {
            const { photoId, photo } = act.payload;
            // Overwrite any local userId with real Firebase UID before sending to remote
            const remotePhoto = { ...photo, userId: currentUserId };
            await this.firebaseService.saveImageMetadata(currentUserId, photoId, remotePhoto);
          } else if (act.type === 'delete') {
            const { photoId, storagePath } = act.payload;
            await this.firebaseService.deleteImageMetadata(currentUserId, photoId);
            if (storagePath) {
              await this.storageService.deletePhoto(storagePath);
            }
          } else if (act.type === 'batch_update') {
            const { photoId, updates } = act.payload;
            await this.firebaseService.saveImageMetadata(currentUserId, photoId, updates);
          }
          await this.offlineStorage.deleteAction(act.id);
        } catch (actErr: any) {
          console.warn('[PhotoManager] Action sync failed:', act, actErr);
          // Determine if error is permanent or transient to avoid head-of-line blocking
          const errCode = actErr?.code || '';
          if (errCode === 'permission-denied') {
            console.error('[PhotoManager] Permanent permission error on action. Skipping to unblock queue.', act.id);
            continue; // Unblock queue for other actions
          } else if (errCode === 'unauthenticated') {
            console.warn('[PhotoManager] Unauthenticated error, stopping sync queue.');
            break; // Stop queue, wait for auth
          } else if (actErr?.message?.toLowerCase().includes('network') || actErr?.message?.toLowerCase().includes('offline')) {
            console.warn('[PhotoManager] Transient network error, stopping sync queue.');
            break; // Stop queue, wait for network
          } else {
            console.error('[PhotoManager] Unknown error on action, skipping to unblock queue.', act.id, actErr);
            continue;
          }
        }
      }
      console.log('[PhotoManager] Offline sync completed.');
    } catch (err) {
      console.warn('[PhotoManager] Error flushing sync queue:', err);
    } finally {
      this.isSyncing = false;
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
