import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
// @ts-expect-error getReactNativePersistence is exported in React Native Metro bundle of firebase/auth
import { initializeAuth, getReactNativePersistence, getAuth, signInAnonymously } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCSnWuNSR4KWIX79xomrJnzplFTpB5Qqgk",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "noteapp-sync-8d335.firebaseapp.com",
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || "https://noteapp-sync-8d335-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "noteapp-sync-8d335",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "noteapp-sync-8d335.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "432161165401",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:432161165401:web:64a010a00557ac2fbb2148",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// React Native Auth with AsyncStorage persistence to avoid warning
let authInstance: ReturnType<typeof getAuth>;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}
export const auth = authInstance;

// React Native Firestore with long-polling and ignoreUndefinedProperties
let dbInstance: ReturnType<typeof getFirestore>;
try {
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
  });
} catch {
  dbInstance = getFirestore(app);
}
export const db = dbInstance;

let authInitPromise: Promise<void> | null = null;

export async function ensureAuth(): Promise<void> {
  if (auth.currentUser) {
    return;
  }

  if (!authInitPromise) {
    authInitPromise = signInAnonymously(auth)
      .then(() => {
        authInitPromise = null;
      })
      .catch(err => {
        console.error('[SyncError Auth Mobile]: Anonymous sign-in failed:', err);
        authInitPromise = null;
        throw err;
      });
  }

  return authInitPromise;
}
