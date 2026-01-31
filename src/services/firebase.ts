import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { FirebaseStorage } from 'firebase/storage';

const env = process.env as Record<string, string | undefined>;

// Helper function to get environment variable with fallback
const getEnvVar = (key: string, fallback?: string) => {
  // Try process.env first (for development)
  if (env[key]) return env[key];
  
  // Try window.__ENV__ for runtime injection (for production)
  if (typeof window !== 'undefined' && (window as any).__ENV__ && (window as any).__ENV__[key]) {
    return (window as any).__ENV__[key];
  }
  
  return fallback;
};

const firebaseConfig = {
  apiKey: getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY', 'demo-api-key'),
  authDomain: getEnvVar('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'demo-project.firebaseapp.com'),
  projectId: getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'demo-project'),
  storageBucket: getEnvVar('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'demo-project.appspot.com'),
  messagingSenderId: getEnvVar('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '123456789'),
  appId: getEnvVar('EXPO_PUBLIC_FIREBASE_APP_ID', '1:123456789:web:abcdef'),
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error('Firebase initialization failed:', error);
  console.warn('Using demo mode due to Firebase initialization failure.');
}

export { auth, db, storage };

// Helper function to safely get Firestore instance
export const getFirestoreDB = () => {
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }
  return db;
};

export default app;
