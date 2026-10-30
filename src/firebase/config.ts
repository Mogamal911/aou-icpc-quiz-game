// Firebase configuration for AOU ICPC Quiz Game
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAfTmOvhf2mDa3NePWdakDQRcfWFFi4Zqc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "aou-icpc-quiz-game.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://aou-icpc-quiz-game-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "aou-icpc-quiz-game",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "aou-icpc-quiz-game.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "753882938185",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:753882938185:web:a70311899ed750be83b898",
};

// Admin email — matches the designated administrator account
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@aouicpc.com";

// Check if actual Firebase credentials have been configured
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.projectId !== "YOUR_PROJECT_ID"
);
