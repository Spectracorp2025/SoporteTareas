import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}


const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyBDhogOZmyca5ev4VQ7jXgkBS3vVpJ4zT0",
  authDomain: "soportes-tareas.firebaseapp.com",
  projectId: "soportes-tareas",
  storageBucket: "soportes-tareas.firebasestorage.app",
  messagingSenderId: "479680701494",
  appId: "1:479680701494:web:719fc4688ff0d56f81e497",
  measurementId: "G-X0JHL2EGD9"
};

let firebaseApp: any = null;
let firebaseAuth: any = null;
let firebaseDb: any = null;
let analytics: any = null;
const isFirebaseEnabled = true;

try {
  firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  firebaseAuth = getAuth(firebaseApp);
  firebaseDb = getFirestore(firebaseApp);
  
  // Safely initialize analytics if supported in this environment
  if (typeof window !== 'undefined') {
    isSupported().then((yes) => {
      if (yes) {
        analytics = getAnalytics(firebaseApp);
        console.log('Firebase Analytics initialized successfully.');
      }
    }).catch(err => {
      console.warn('Analytics is not supported or failed to initialize:', err);
    });
  }
  
  console.log('Firebase initialized successfully with live project credentials!');
} catch (error) {
  console.error('Error initializing Firebase with live project config:', error);
}

// Keep helper functions to prevent compilation/import errors, but make them no-ops since we are hardcoding the live credentials.
export function getSavedFirebaseConfig(): FirebaseConfig | null {
  return firebaseConfig;
}

export function saveFirebaseConfig(config: FirebaseConfig) {
  console.log('Using hardcoded live config. Save operation ignored.', config);
}

export function clearFirebaseConfig() {
  console.log('Using hardcoded live config. Clear operation ignored.');
}

export { firebaseApp, firebaseAuth, firebaseDb, isFirebaseEnabled, analytics };

// Fallback login simulation interface
export interface MockUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

