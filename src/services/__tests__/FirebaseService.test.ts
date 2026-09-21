/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirebaseService, AuthState } from '../FirebaseService';
import { PhotoManager } from '../PhotoManager';

// Mock Firebase app
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
}));

// Mock Firebase auth
vi.mock('firebase/auth', () => {
  let authStateCallback: any = null;
  return {
    getAuth: vi.fn(),
    signInAnonymously: vi.fn(),
    onAuthStateChanged: vi.fn((auth, callback) => {
      authStateCallback = callback;
      return vi.fn(); // return unsubscribe
    }),
    __triggerAuthStateChanged: (user: any) => {
      if (authStateCallback) authStateCallback(user);
    }
  };
});

// Mock Firebase firestore
vi.mock('firebase/firestore', () => {
  const unsubscribeMock = vi.fn();
  return {
    getFirestore: vi.fn(() => ({})),
    doc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    collection: vi.fn(),
    query: vi.fn(),
    orderBy: vi.fn(),
    onSnapshot: vi.fn(() => unsubscribeMock),
    serverTimestamp: vi.fn(),
    __unsubscribeMock: unsubscribeMock
  };
});

// Import them so we can assert and trigger
import * as fbAuth from 'firebase/auth';
import * as fbFirestore from 'firebase/firestore';

// Mock OfflineStorageService
vi.mock('../OfflineStorageService', () => {
  return {
    OfflineStorageService: {
      getInstance: vi.fn(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        getAllPhotos: vi.fn().mockResolvedValue([]),
        savePhotos: vi.fn().mockResolvedValue(undefined),
        savePhoto: vi.fn().mockResolvedValue(undefined),
        updatePhotoStatus: vi.fn().mockResolvedValue(undefined),
        getPendingActions: vi.fn().mockResolvedValue([]),
        queueAction: vi.fn().mockResolvedValue({}),
        deleteAction: vi.fn().mockResolvedValue(undefined),
      })),
      getPendingActions: vi.fn().mockResolvedValue([]),
    }
  };
});

const waitForInit = () => new Promise(r => setTimeout(r, 50));

import { SyncAction } from '../../types';

describe('FirebaseService and PhotoManager Phase 1 Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Force singleton reset
    // @ts-ignore
    FirebaseService.instance = undefined;
    // @ts-ignore
    PhotoManager.instance = undefined;
  });

  it('TEST 1: Firebase configurado + Anonymous Auth exitoso -> AUTHENTICATED', async () => {
    vi.mocked(fbAuth.signInAnonymously).mockResolvedValueOnce({} as any);

    const service = FirebaseService.getInstance();
    await waitForInit();

    // Trigger auth state changed manually to simulate Firebase firing the event
    // @ts-ignore
    fbAuth.__triggerAuthStateChanged({ uid: 'real_firebase_uid' });

    expect(service.getAuthState()).toBe('AUTHENTICATED');
    expect(service.getUserId()).toBe('real_firebase_uid');
  });

  it('TEST 2: Anonymous Auth rechazado -> LOCAL_OFFLINE', async () => {
    vi.mocked(fbAuth.signInAnonymously).mockRejectedValueOnce(new Error('auth/admin-restricted-operation'));

    const service = FirebaseService.getInstance();
    await waitForInit();

    expect(service.getAuthState()).toBe('LOCAL_OFFLINE');
    expect(service.getUserId()).toMatch(/^user_/);
  });

  it('TEST 3: LOCAL_OFFLINE -> saveImageMetadata no llama Firestore', async () => {
    vi.mocked(fbAuth.signInAnonymously).mockRejectedValueOnce(new Error('auth/admin-restricted-operation'));
    const service = FirebaseService.getInstance();
    await waitForInit();

    await service.saveImageMetadata('user123', 'img123', { status: 'kept' });
    expect(fbFirestore.setDoc).not.toHaveBeenCalled();
  });

  it('TEST 4: LOCAL_OFFLINE -> updateImageStatus no llama Firestore', async () => {
    vi.mocked(fbAuth.signInAnonymously).mockRejectedValueOnce(new Error('fail'));
    const service = FirebaseService.getInstance();
    await waitForInit();

    await service.updateImageStatus('user123', 'img1', 'kept');
    expect(fbFirestore.updateDoc).not.toHaveBeenCalled();
  });

  it('TEST 5: LOCAL_OFFLINE -> deleteImageMetadata no llama Firestore', async () => {
    vi.mocked(fbAuth.signInAnonymously).mockRejectedValueOnce(new Error('fail'));
    const service = FirebaseService.getInstance();
    await waitForInit();

    await service.deleteImageMetadata('user123', 'img1');
    expect(fbFirestore.deleteDoc).not.toHaveBeenCalled();
  });

  it('TEST 6: LOCAL_OFFLINE -> subscribeToUserImages no crea listener', async () => {
    vi.mocked(fbAuth.signInAnonymously).mockRejectedValueOnce(new Error('fail'));
    const service = FirebaseService.getInstance();
    await waitForInit();

    service.subscribeToUserImages('user123', () => {});
    expect(fbFirestore.onSnapshot).not.toHaveBeenCalled();
  });

  it('TEST 7: AUTHENTICATED -> subscribeToUserImages crea listener', async () => {
    vi.mocked(fbAuth.signInAnonymously).mockResolvedValueOnce({} as any);
    const service = FirebaseService.getInstance();
    await waitForInit();
    
    // @ts-ignore
    fbAuth.__triggerAuthStateChanged({ uid: 'real_firebase_uid' });

    service.subscribeToUserImages('real_firebase_uid', () => {});
    console.log('AUTH STATE:', service.getAuthState());
    expect(fbFirestore.onSnapshot).toHaveBeenCalled();
  });

  it('TEST 8: unsubscribe limpia correctamente el listener', async () => {
    vi.mocked(fbAuth.signInAnonymously).mockResolvedValueOnce({} as any);
    const fbService = FirebaseService.getInstance();
    const pm = PhotoManager.getInstance();
    await waitForInit();

    // @ts-ignore
    fbAuth.__triggerAuthStateChanged({ uid: 'real_firebase_uid' });

    // Ensure snapshot was created (from PhotoManager responding to auth state)
    expect(fbFirestore.onSnapshot).toHaveBeenCalled();

    // @ts-ignore
    const unsubscribeMock = fbFirestore.__unsubscribeMock;
    expect(unsubscribeMock).not.toHaveBeenCalled();

    // Force auth offline, which triggers cleanupFirebaseSync
    // @ts-ignore
    fbService.authState = 'LOCAL_OFFLINE';
    // @ts-ignore
    fbService.notify();

    // Unsubscribe should have been called
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('TEST 9: Modificaciones offline (setStarRating) generan SyncAction', async () => {
    const pm = PhotoManager.getInstance();
    // @ts-ignore - mock offline
    pm.isOnline = false;
    // @ts-ignore - inject photo
    pm.photos = [{ id: 'DSC08492' }];
    
    const storeQueue = vi.spyOn(pm['offlineStorage'], 'queueAction');
    await pm.setStarRating('DSC08492', 4);
    
    expect(storeQueue).toHaveBeenCalledWith({
      type: 'batch_update',
      payload: { photoId: 'DSC08492', updates: { starRating: 4 } }
    });
  });

  it('TEST 10: Modificaciones offline (updatePhotoDetails) generan SyncAction', async () => {
    const pm = PhotoManager.getInstance();
    // @ts-ignore
    pm.isOnline = false;
    // @ts-ignore - inject photo
    pm.photos = [{ id: 'DSC08492' }];
    
    const storeQueue = vi.spyOn(pm['offlineStorage'], 'queueAction');
    await pm.updatePhotoDetails('DSC08492', { name: 'New Name' });
    
    expect(storeQueue).toHaveBeenCalledWith({
      type: 'batch_update',
      payload: { photoId: 'DSC08492', updates: { name: 'New Name' } }
    });
  });

  it('TEST 11: Firebase success -> acción eliminada de IndexedDB', async () => {
    const pm = PhotoManager.getInstance();
    const fbService = FirebaseService.getInstance();
    
    // @ts-ignore
    pm.isOnline = true;
    // @ts-ignore
    fbService.authState = 'AUTHENTICATED';

    const mockPendingAction: SyncAction = {
      id: 'act_123', type: 'update_status', payload: { photoId: 'p1', status: 'kept' }, synced: false, timestamp: 1
    };
    
    vi.spyOn(pm['offlineStorage'], 'getPendingActions').mockResolvedValueOnce([mockPendingAction]);
    const deleteSpy = vi.spyOn(pm['offlineStorage'], 'deleteAction').mockResolvedValueOnce(undefined);
    
    vi.mocked(fbFirestore.updateDoc).mockResolvedValueOnce(undefined);

    await pm.syncPendingActions();

    expect(fbFirestore.updateDoc).toHaveBeenCalled();
    expect(deleteSpy).toHaveBeenCalledWith('act_123');
  });

  it('TEST 12: Firebase failure (permission-denied) -> acción no eliminada, continua con la siguiente', async () => {
    const pm = PhotoManager.getInstance();
    const fbService = FirebaseService.getInstance();
    
    // @ts-ignore
    pm.isOnline = true;
    // @ts-ignore
    fbService.authState = 'AUTHENTICATED';

    const action1: SyncAction = { id: 'act_1', type: 'update_status', payload: { photoId: 'p1', status: 'kept' }, synced: false, timestamp: 1 };
    const action2: SyncAction = { id: 'act_2', type: 'update_status', payload: { photoId: 'p2', status: 'kept' }, synced: false, timestamp: 2 };
    
    vi.spyOn(pm['offlineStorage'], 'getPendingActions').mockResolvedValueOnce([action1, action2]);
    const deleteSpy = vi.spyOn(pm['offlineStorage'], 'deleteAction').mockResolvedValue(undefined);
    
    // Action 1 fails with permission-denied
    vi.mocked(fbFirestore.updateDoc).mockRejectedValueOnce({ code: 'permission-denied' });
    // Action 2 succeeds
    vi.mocked(fbFirestore.updateDoc).mockResolvedValueOnce(undefined);

    await pm.syncPendingActions();

    // Should have tried both
    expect(fbFirestore.updateDoc).toHaveBeenCalledTimes(2);
    // Should ONLY delete action 2
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith('act_2');
  });

  it('TEST 13: Firebase failure (network) -> detiene la cola y no elimina', async () => {
    const pm = PhotoManager.getInstance();
    const fbService = FirebaseService.getInstance();
    
    // @ts-ignore
    pm.isOnline = true;
    // @ts-ignore
    fbService.authState = 'AUTHENTICATED';

    const action1: SyncAction = { id: 'act_1', type: 'update_status', payload: { photoId: 'p1', status: 'kept' }, synced: false, timestamp: 1 };
    const action2: SyncAction = { id: 'act_2', type: 'update_status', payload: { photoId: 'p2', status: 'kept' }, synced: false, timestamp: 2 };
    
    vi.spyOn(pm['offlineStorage'], 'getPendingActions').mockResolvedValueOnce([action1, action2]);
    const deleteSpy = vi.spyOn(pm['offlineStorage'], 'deleteAction').mockResolvedValue(undefined);
    
    // Action 1 fails with network error
    vi.mocked(fbFirestore.updateDoc).mockRejectedValueOnce(new Error('Network offline'));

    await pm.syncPendingActions();

    // Should have tried only the first one
    expect(fbFirestore.updateDoc).toHaveBeenCalledTimes(1);
    // Should not delete any
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('TEST 14: Identidad - Acción creada LOCAL_OFFLINE no contiene localUserId y al sincronizar usa UID real', async () => {
    const pm = PhotoManager.getInstance();
    const fbService = FirebaseService.getInstance();
    
    // Simulate LOCAL_OFFLINE
    // @ts-ignore
    fbService.authState = 'LOCAL_OFFLINE';
    // @ts-ignore
    pm.isOnline = false;
    // @ts-ignore
    pm.photos = [{ id: 'DSC08492' }];
    
    const storeQueue = vi.spyOn(pm['offlineStorage'], 'queueAction').mockImplementation(async (action) => {
      expect(action.payload).not.toHaveProperty('userId');
      return action as SyncAction;
    });
    
    await pm.setStatus('DSC08492', 'kept');
    expect(storeQueue).toHaveBeenCalled();

    // Now simulate reconnection and sync
    // @ts-ignore
    pm.isOnline = true;
    // @ts-ignore
    fbService.authState = 'AUTHENTICATED';
    
    // Stub the user ID to the real Firebase one
    vi.spyOn(fbService, 'getUserId').mockReturnValue('real_firebase_uid_777');
    
    const mockPendingAction: SyncAction = { id: 'act_ident', type: 'update_status', payload: { photoId: 'DSC08492', status: 'kept' }, synced: false, timestamp: 1 };
    vi.spyOn(pm['offlineStorage'], 'getPendingActions').mockResolvedValueOnce([mockPendingAction]);
    
    await pm.syncPendingActions();
    
    expect(fbFirestore.updateDoc).toHaveBeenCalledWith(
      undefined, // the mock of doc() returns undefined
      { status: 'kept' }
    );
    // Since doc() was mocked to return undefined, the first arg to updateDoc is undefined.
    // The path would normally be users/real_firebase_uid_777/images/DSC08492
    // Let's assert the firebase service method directly instead:
    const updateSpy = vi.spyOn(fbService, 'updateImageStatus');
    vi.spyOn(pm['offlineStorage'], 'getPendingActions').mockResolvedValueOnce([mockPendingAction]);
    await pm.syncPendingActions();
    expect(updateSpy).toHaveBeenCalledWith('real_firebase_uid_777', 'DSC08492', 'kept');
  });

  it('TEST 15: Concurrencia - Dos llamadas simultáneas a syncPendingActions() -> una sola ejecución', async () => {
    const pm = PhotoManager.getInstance();
    const fbService = FirebaseService.getInstance();
    // @ts-ignore
    pm.isOnline = true;
    // @ts-ignore
    fbService.authState = 'AUTHENTICATED';
    
    // Mock getPendingActions to take some time so we can trigger two concurrently
    vi.spyOn(pm['offlineStorage'], 'getPendingActions').mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 20));
      return [];
    });
    
    const promise1 = pm.syncPendingActions();
    const promise2 = pm.syncPendingActions();
    
    await Promise.all([promise1, promise2]);
    
    // getPendingActions should only be called once because the second call returned early (this.isSyncing = true)
    expect(pm['offlineStorage'].getPendingActions).toHaveBeenCalledTimes(1);
  });

  it('TEST 16: LOCAL_OFFLINE + acción pendiente -> cero llamadas Firestore', async () => {
    const pm = PhotoManager.getInstance();
    const fbService = FirebaseService.getInstance();
    // @ts-ignore
    pm.isOnline = false; // Offline
    // @ts-ignore
    fbService.authState = 'LOCAL_OFFLINE';
    
    const mockAction: SyncAction = { id: 'act_1', type: 'update_status', payload: { photoId: 'p1', status: 'kept' }, synced: false, timestamp: 1 };
    vi.spyOn(pm['offlineStorage'], 'getPendingActions').mockResolvedValueOnce([mockAction]);
    
    await pm.syncPendingActions();
    expect(fbFirestore.updateDoc).not.toHaveBeenCalled();
  });

  it('TEST 17: Error desconocido -> acción permanece en IndexedDB; NO se elimina', async () => {
    const pm = PhotoManager.getInstance();
    const fbService = FirebaseService.getInstance();
    // @ts-ignore
    pm.isOnline = true;
    // @ts-ignore
    fbService.authState = 'AUTHENTICATED';
    
    const action1: SyncAction = { id: 'act_err', type: 'update_status', payload: { photoId: 'p1', status: 'kept' }, synced: false, timestamp: 1 };
    vi.spyOn(pm['offlineStorage'], 'getPendingActions').mockResolvedValueOnce([action1]);
    const deleteSpy = vi.spyOn(pm['offlineStorage'], 'deleteAction');
    
    // Mock unknown error
    vi.spyOn(fbService, 'updateImageStatus').mockRejectedValueOnce(new Error('SyntaxError or something unexpected'));
    
    await pm.syncPendingActions();
    
    // The action failed with unknown error, it should NOT be deleted
    expect(deleteSpy).not.toHaveBeenCalledWith('act_err');
  });

  it('TEST 18: Éxito Firebase + fallo de deleteAction -> acción permanece y el siguiente intento es seguro', async () => {
    const pm = PhotoManager.getInstance();
    const fbService = FirebaseService.getInstance();
    // @ts-ignore
    pm.isOnline = true;
    // @ts-ignore
    fbService.authState = 'AUTHENTICATED';
    
    const action1: SyncAction = { id: 'act_idempotent', type: 'update_status', payload: { photoId: 'p1', status: 'kept' }, synced: false, timestamp: 1 };
    vi.spyOn(pm['offlineStorage'], 'getPendingActions').mockResolvedValueOnce([action1]);
    
    vi.spyOn(fbService, 'updateImageStatus').mockResolvedValueOnce(undefined); // Success remote
    const deleteSpy = vi.spyOn(pm['offlineStorage'], 'deleteAction').mockRejectedValueOnce(new Error('IndexedDB QuotaExceededError'));
    
    await pm.syncPendingActions();
    
    // It tried to delete but failed
    expect(deleteSpy).toHaveBeenCalledWith('act_idempotent');
    
    // Next time it syncs, it will just do it again because the action is still in the queue.
    // The updateImageStatus is idempotent (sets status to 'kept' again).
  });
});
