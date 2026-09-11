import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, FirebaseStorage } from 'firebase/storage';
import { getApp, getApps } from 'firebase/app';
import { OfflineStorageService } from './OfflineStorageService';

/**
 * StorageService - OOP service for binary file uploads to Firebase Cloud Storage
 * at `/users/{userId}/uploads/{filename}` with IndexedDB blob fallback for offline resiliency.
 */
export class StorageService {
  private static instance: StorageService;
  private storage: FirebaseStorage | null = null;
  private offlineStorage = OfflineStorageService.getInstance();

  private constructor() {
    try {
      if (getApps().length > 0) {
        this.storage = getStorage(getApp());
      }
    } catch {
      this.storage = null;
    }
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private getStorageClient(): FirebaseStorage | null {
    if (!this.storage && getApps().length > 0) {
      try {
        this.storage = getStorage(getApp());
      } catch (err) {
        console.warn('[StorageService] Could not get storage instance:', err);
      }
    }
    return this.storage;
  }

  /**
   * Upload binary file to Firebase Cloud Storage at /users/{userId}/uploads/{filename}
   * Falls back to IndexedDB local blob caching when offline.
   */
  public async uploadPhoto(
    userId: string,
    file: File | Blob,
    filename: string,
    onProgress?: (progressPercent: number) => void
  ): Promise<{ url: string; storagePath: string; isLocalBlob: boolean }> {
    const cleanFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath = `users/${userId}/uploads/${cleanFilename}`;
    const storageClient = this.getStorageClient();

    // Check if online and storage initialized
    if (navigator.onLine && storageClient) {
      try {
        const storageRef = ref(storageClient, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              if (onProgress) onProgress(progress);
            },
            (error) => {
              console.warn('[StorageService] Remote upload failed, caching locally in IndexedDB:', error);
              // Fallback to local offline cache
              this.cacheLocally(cleanFilename, file, storagePath).then(resolve).catch(reject);
            },
            async () => {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              // Also cache blob locally for fast offline loupe zoom
              await this.offlineStorage.saveBlob(cleanFilename, file);
              resolve({
                url: downloadUrl,
                storagePath,
                isLocalBlob: false
              });
            }
          );
        });
      } catch (err) {
        console.warn('[StorageService] Exception during storage upload, saving locally:', err);
      }
    }

    // Offline or Firebase Storage unconfigured fallback
    return this.cacheLocally(cleanFilename, file, storagePath, onProgress);
  }

  private async cacheLocally(
    filenameId: string,
    file: File | Blob,
    storagePath: string,
    onProgress?: (progressPercent: number) => void
  ): Promise<{ url: string; storagePath: string; isLocalBlob: boolean }> {
    if (onProgress) {
      // simulate instant progress
      onProgress(100);
    }
    await this.offlineStorage.saveBlob(filenameId, file);
    const objectUrl = URL.createObjectURL(file);
    return {
      url: objectUrl,
      storagePath,
      isLocalBlob: true
    };
  }

  /**
   * Delete file from Cloud Storage or IndexedDB
   */
  public async deletePhoto(storagePath: string): Promise<void> {
    const filenameId = storagePath.split('/').pop();
    if (filenameId) {
      await this.offlineStorage.getBlob(filenameId).catch(() => {});
    }

    if (navigator.onLine && this.storage) {
      try {
        const fileRef = ref(this.storage, storagePath);
        await deleteObject(fileRef);
      } catch (err) {
        console.warn('[StorageService] Delete from Cloud Storage failed or file was local:', err);
      }
    }
  }
}
