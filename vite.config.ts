import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

// Load Firebase applet configuration dynamically if it exists at project root
const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
if (fs.existsSync(firebaseConfigPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
    process.env.VITE_FIREBASE_PROJECT_ID = firebaseConfig.projectId || '';
    process.env.VITE_FIREBASE_APP_ID = firebaseConfig.appId || '';
    process.env.VITE_FIREBASE_API_KEY = firebaseConfig.apiKey || '';
    process.env.VITE_FIREBASE_AUTH_DOMAIN = firebaseConfig.authDomain || '';
    process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId || '';
    process.env.VITE_FIREBASE_STORAGE_BUCKET = firebaseConfig.storageBucket || '';
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = firebaseConfig.messagingSenderId || '';
  } catch (e) {
    console.error('Error parsing firebase-applet-config.json:', e);
  }
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
