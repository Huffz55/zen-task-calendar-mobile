import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, type Firestore } from 'firebase/firestore';
// @ts-expect-error getReactNativePersistence is exported in React Native Metro bundle of firebase/auth
import { initializeAuth, getReactNativePersistence, getAuth, signInAnonymously, signOut, type Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCSnWuNSR4KWIX79xomrJnzplFTpB5Qqgk",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "noteapp-sync-8d335.firebaseapp.com",
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || "https://noteapp-sync-8d335-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "noteapp-sync-8d335",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "noteapp-sync-8d335.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "432161165401",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:432161165401:web:64a010a00557ac2fbb2148",
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let authInitPromise: Promise<void> | null = null;

/**
 * Returns true only after Firebase has been lazily initialized by an explicit Cloud Sync action.
 */
export function isFirebaseInitialized(): boolean {
  return appInstance !== null || getApps().length > 0;
}

/**
 * Lazily initializes and returns the Firebase App instance on first Cloud Sync use.
 */
export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  }
  return appInstance;
}

/**
 * Lazily initializes React Native Auth with AsyncStorage persistence on first Cloud Sync use.
 */
export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    try {
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      authInstance = getAuth(app);
    }
  }
  return authInstance;
}

/**
 * Lazily initializes React Native Firestore with long-polling and ignoreUndefinedProperties.
 */
export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    const app = getFirebaseApp();
    try {
      dbInstance = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      });
    } catch {
      dbInstance = getFirestore(app);
    }
  }
  return dbInstance;
}

/**
 * Ensures an anonymous Firebase Auth session exists. Only called when Cloud Sync is explicitly active.
 */
export async function ensureAuth(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) {
    return;
  }

  if (!authInitPromise) {
    authInitPromise = signInAnonymously(auth)
      .then(() => {
        authInitPromise = null;
      })
      .catch(err => {
        if (__DEV__) {
          console.error('[SyncError Auth Mobile]: Anonymous sign-in failed:', err?.code || 'unknown');
        }
        authInitPromise = null;
        throw err;
      });
  }

  return authInitPromise;
}

/**
 * Signs out the active anonymous Firebase Auth session (if initialized) so residual
 * auth tokens are cleared from AsyncStorage during full data erasure.
 */
export async function signOutIfInitialized(): Promise<void> {
  if (!authInstance) return;
  try {
    await signOut(authInstance);
  } catch {
    // Ignore sign-out errors during cleanup
  }
}
