import { initializeApp, getApps, getApp, FirebaseApp, FirebaseError } from 'firebase/app';
import {
  getAuth,
  signInAnonymously as fbSignInAnonymously,
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  Firestore,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { Photo, PhotoStatus } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export type AuthState = 'INITIALIZING' | 'AUTHENTICATED' | 'LOCAL_OFFLINE';

export interface FirestoreErrorInfo {
  error: string;
  code?: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * FirebaseService - OOP backend integration for PhotoTriage.
 * Enforces STRICT FIRESTORE RULE: All document references must use even-segment paths.
 * Path structure: users/{userId}/images/{imageId}
 */
export class FirebaseService {
  private static instance: FirebaseService;
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private currentUser: User | null = null;
  private localUserId: string = '';
  private authState: AuthState = 'INITIALIZING';
  private listeners: Array<(user: User | null, authState: AuthState) => void> = [];

  private constructor() {
    this.init();
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  private async init(): Promise<void> {
    try {
      const config = firebaseConfig as any;

      if (config && config.projectId) {
        if (!getApps().length) {
          this.app = initializeApp(config);
        } else {
          this.app = getApp();
        }
        this.db = getFirestore(this.app, config.firestoreDatabaseId);
        this.auth = getAuth(this.app);

        onAuthStateChanged(this.auth, (user) => {
          this.currentUser = user;
          if (user) {
            this.authState = 'AUTHENTICATED';
          }
          this.notify();
        });

        // Ensure anonymous sign in as requested
        await this.signInAnonymously();
      } else {
        this.fallbackToLocalOffline();
      }
    } catch (err) {
      console.warn('[FirebaseService] Running in offline/fallback mode due to error:', err);
      this.fallbackToLocalOffline();
    }
  }

  private fallbackToLocalOffline(): void {
    // Generate or restore persistent local user ID for offline first
    const savedId = localStorage.getItem('phototriage_user_id');
    if (savedId) {
      this.localUserId = savedId;
    } else {
      this.localUserId = `user_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      localStorage.setItem('phototriage_user_id', this.localUserId);
    }
    this.authState = 'LOCAL_OFFLINE';
    this.notify();
  }

  public getAuthState(): AuthState {
    return this.authState;
  }

  // Backwards compatibility for PhotoManager, though AuthState is preferred
  public getIsConfigured(): boolean {
    return this.authState === 'AUTHENTICATED';
  }

  public getUserId(): string {
    return this.authState === 'AUTHENTICATED' ? (this.currentUser?.uid || '') : this.localUserId;
  }

  public async signInAnonymously(): Promise<string> {
    if (this.auth) {
      try {
        const userCred = await fbSignInAnonymously(this.auth);
        this.currentUser = userCred.user;
        this.authState = 'AUTHENTICATED';
        return this.currentUser.uid;
      } catch (error) {
        const fbError = error as FirebaseError;
        console.warn(`[FirebaseService] Anonymous sign-in failed (${fbError.code || 'unknown'}). Falling back to LOCAL_OFFLINE.`);
        this.fallbackToLocalOffline();
        return this.localUserId;
      }
    }
    this.fallbackToLocalOffline();
    return this.localUserId;
  }

  private handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
    const fbError = error as FirebaseError;
    const errorCode = fbError?.code || 'unknown';
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      code: errorCode,
      authInfo: {
        userId: this.currentUser?.uid,
        email: this.currentUser?.email,
        emailVerified: this.currentUser?.emailVerified,
        isAnonymous: this.currentUser?.isAnonymous,
        tenantId: this.currentUser?.tenantId,
        providerInfo: this.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
      },
      operationType,
      path,
    };
    
    // Classify errors for logging
    if (errorCode === 'permission-denied') {
      console.warn('[Firebase] Permission Denied: ', JSON.stringify(errInfo));
    } else if (errorCode === 'unauthenticated') {
      console.warn('[Firebase] Unauthenticated: ', JSON.stringify(errInfo));
    } else if (errorCode === 'unavailable' || errorCode.includes('network')) {
      console.warn('[Firebase] Network/Unavailable: ', JSON.stringify(errInfo));
    } else {
      console.warn('[Firebase] Non-fatal Error: ', JSON.stringify(errInfo));
    }
  }

  /**
   * Save photo metadata at strict even-segment path: users/{userId}/images/{imageId}
   */
  public async saveImageMetadata(userId: string, imageId: string, photo: Partial<Photo>): Promise<void> {
    if (this.authState !== 'AUTHENTICATED' || !this.db) {
      return;
    }
    const path = `users/${userId}/images/${imageId}`;
    try {
      const docRef = doc(this.db, 'users', userId, 'images', imageId);
      await setDoc(docRef, {
        ...photo,
        id: imageId,
        userId,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      this.handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  }

  /**
   * Update photo status at strict even-segment path: users/{userId}/images/{imageId}
   */
  public async updateImageStatus(userId: string, imageId: string, status: PhotoStatus): Promise<void> {
    if (this.authState !== 'AUTHENTICATED' || !this.db) {
      return;
    }
    const path = `users/${userId}/images/${imageId}`;
    try {
      const docRef = doc(this.db, 'users', userId, 'images', imageId);
      await updateDoc(docRef, {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      this.handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  }

  /**
   * Delete photo document at strict even-segment path: users/{userId}/images/{imageId}
   */
  public async deleteImageMetadata(userId: string, imageId: string): Promise<void> {
    if (this.authState !== 'AUTHENTICATED' || !this.db) {
      return;
    }
    const path = `users/${userId}/images/${imageId}`;
    try {
      const docRef = doc(this.db, 'users', userId, 'images', imageId);
      await deleteDoc(docRef);
    } catch (error) {
      this.handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  }

  /**
   * Realtime subscription for users/{userId}/images collection
   */
  public subscribeToUserImages(userId: string, onUpdate: (photos: Photo[]) => void): () => void {
    if (this.authState !== 'AUTHENTICATED' || !this.db) {
      return () => {};
    }
    const path = `users/${userId}/images`;
    try {
      const q = query(
        collection(this.db, 'users', userId, 'images'),
        orderBy('createdAt', 'desc')
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const images = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Photo[];
        onUpdate(images);
      }, (error) => {
        console.error('[Firebase] Subscription error:', error);
        this.handleFirestoreError(error, OperationType.GET, path);
      });
      return unsub;
    } catch (error) {
      this.handleFirestoreError(error, OperationType.GET, path);
      return () => {};
    }
  }

  public subscribe(callback: (user: User | null, authState: AuthState) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser, this.authState);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb(this.currentUser, this.authState));
  }
}
