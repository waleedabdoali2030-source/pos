import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dummy-project-id',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:111111111111:web:1111111111111111111111',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDummyApiKeyStringLengthExample12345',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dummy-project-id.firebaseapp.com',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'dummy-project-id.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '111111111111',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
