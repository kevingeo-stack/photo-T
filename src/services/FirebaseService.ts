import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
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
  serverTimestamp
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

export interface FirestoreErrorInfo {
  error: string;
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
  private localUserId: string = 'user_phototriage_local';
  private isConfigured: boolean = false;
  private listeners: Array<(user: User | null, isConnected: boolean) => void> = [];

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
        this.isConfigured = true;

        onAuthStateChanged(this.auth, (user) => {
          this.currentUser = user;
          if (user) {
            this.localUserId = user.uid;
          }
          this.notify();
        });

        // Ensure anonymous sign in as requested
        await this.signInAnonymously();
      } else {
        // Generate or restore persistent local user ID for offline first
        const savedId = localStorage.getItem('phototriage_user_id');
        if (savedId) {
          this.localUserId = savedId;
        } else {
          this.localUserId = `user_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
          localStorage.setItem('phototriage_user_id', this.localUserId);
        }
        this.notify();
      }
    } catch (err) {
      console.warn('[FirebaseService] Running in offline/fallback mode:', err);
      this.isConfigured = false;
      this.notify();
    }
  }

  public getIsConfigured(): boolean {
    return this.isConfigured;
  }

  public getUserId(): string {
    return this.currentUser?.uid || this.localUserId;
  }

  public async signInAnonymously(): Promise<string> {
    if (this.auth && this.isConfigured) {
      try {
        const userCred = await fbSignInAnonymously(this.auth);
        this.currentUser = userCred.user;
        this.localUserId = userCred.user.uid;
        return this.localUserId;
      } catch (error) {
        console.warn('[FirebaseService] Anonymous sign-in failed, using local ID:', error);
      }
    }
    return this.localUserId;
  }

  private handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
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
    console.warn('[Firebase] Non-fatal Error: ', JSON.stringify(errInfo));
    // Eliminamos el throw para no causar pantallas rojas (Uncaught Errors) en la app local
  }

  /**
   * Save photo metadata at strict even-segment path: users/{userId}/images/{imageId}
   */
  public async saveImageMetadata(userId: string, imageId: string, photo: Partial<Photo>): Promise<void> {
    const path = `users/${userId}/images/${imageId}`;
    if (!this.db || !this.isConfigured) {
      return;
    }

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
    }
  }

  /**
   * Update photo status at strict even-segment path: users/{userId}/images/{imageId}
   */
  public async updateImageStatus(userId: string, imageId: string, status: PhotoStatus): Promise<void> {
    const path = `users/${userId}/images/${imageId}`;
    if (!this.db || !this.isConfigured) {
      return;
    }

    try {
      const docRef = doc(this.db, 'users', userId, 'images', imageId);
      await updateDoc(docRef, {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      this.handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  /**
   * Delete photo document at strict even-segment path: users/{userId}/images/{imageId}
   */
  public async deleteImageMetadata(userId: string, imageId: string): Promise<void> {
    const path = `users/${userId}/images/${imageId}`;
    if (!this.db || !this.isConfigured) {
      return;
    }

    try {
      const docRef = doc(this.db, 'users', userId, 'images', imageId);
      await deleteDoc(docRef);
    } catch (error) {
      this.handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  /**
   * Realtime subscription for users/{userId}/images collection
   */
  public subscribeToUserImages(userId: string, onUpdate: (photos: Photo[]) => void): () => void {
    const path = `users/${userId}/images`;
    if (!this.db || !this.isConfigured) {
      return () => {};
    }

    try {
      const colRef = collection(this.db, 'users', userId, 'images');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const list: Photo[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as Photo);
          });
          onUpdate(list);
        },
        (error) => {
          this.handleFirestoreError(error, OperationType.GET, path);
        }
      );
      return unsubscribe;
    } catch (error) {
      this.handleFirestoreError(error, OperationType.GET, path);
    }
  }

  public subscribe(callback: (user: User | null, isConnected: boolean) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser, this.isConfigured);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb(this.currentUser, this.isConfigured));
  }
}
