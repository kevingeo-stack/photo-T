import { Photo, PhotoStatus, SyncAction } from '../types';

/**
 * OfflineStorageService - OOP service managing IndexedDB for offline states,
 * cached photo assets, and outgoing synchronization queue.
 */
export class OfflineStorageService {
  private static instance: OfflineStorageService;
  private dbName = 'PhotoTriageDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  private constructor() {}

  public static getInstance(): OfflineStorageService {
    if (!OfflineStorageService.instance) {
      OfflineStorageService.instance = new OfflineStorageService();
    }
    return OfflineStorageService.instance;
  }

  public async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('status', 'status', { unique: false });
          photoStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          queueStore.createIndex('synced', 'synced', { unique: false });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.initPromise;
  }

  private async getStore(
    storeName: 'photos' | 'syncQueue' | 'blobs',
    mode: IDBTransactionMode = 'readonly'
  ): Promise<IDBObjectStore> {
    const db = await this.init();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  public async savePhoto(photo: Photo): Promise<void> {
    const store = await this.getStore('photos', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(photo);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async savePhotos(photos: Photo[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('photos', 'readwrite');
      const store = transaction.objectStore('photos');
      photos.forEach((photo) => store.put(photo));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  public async getPhoto(id: string): Promise<Photo | undefined> {
    const store = await this.getStore('photos', 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result as Photo | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  public async getAllPhotos(): Promise<Photo[]> {
    const store = await this.getStore('photos', 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as Photo[]);
      req.onerror = () => reject(req.error);
    });
  }

  public async updatePhotoStatus(id: string, status: PhotoStatus): Promise<void> {
    const photo = await this.getPhoto(id);
    if (!photo) return;
    photo.status = status;
    photo.updatedAt = Date.now();
    await this.savePhoto(photo);
  }

  public async deletePhoto(id: string): Promise<void> {
    const store = await this.getStore('photos', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async queueAction(
    actionData: Omit<SyncAction, 'id' | 'timestamp' | 'synced'>
  ): Promise<SyncAction> {
    const store = await this.getStore('syncQueue', 'readwrite');
    const action: SyncAction = {
      ...actionData,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const req = store.put(action);
      req.onsuccess = () => resolve(action);
      req.onerror = () => reject(req.error);
    });
  }

  public async getPendingActions(): Promise<SyncAction[]> {
    const store = await this.getStore('syncQueue', 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result as SyncAction[];
        const pending = all.filter((a) => !a.synced);
        resolve(pending);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteAction(actionId: string): Promise<void> {
    const store = await this.getStore('syncQueue', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(actionId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async saveBlob(id: string, blob: Blob): Promise<void> {
    const store = await this.getStore('blobs', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put({ id, blob, createdAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getBlob(id: string): Promise<Blob | undefined> {
    const store = await this.getStore('blobs', 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result?.blob);
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteBlob(id: string): Promise<void> {
    const store = await this.getStore('blobs', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async saveThumbnail(photoId: string, blob: Blob): Promise<void> {
    return this.saveBlob(`thumb_${photoId}`, blob);
  }

  public async getThumbnail(photoId: string): Promise<Blob | undefined> {
    return this.getBlob(`thumb_${photoId}`);
  }

  public async clearSyncQueue(): Promise<void> {
    const store = await this.getStore('syncQueue', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
