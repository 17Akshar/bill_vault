/**
 * Firebase Web SDK initialization.
 *
 * Used for client-side Google Sign-In via signInWithPopup. The resulting
 * Firebase ID token is then sent to our backend at POST /api/auth/google/firebase
 * which verifies it with Firebase Admin SDK and returns our app's JWT.
 *
 * NOTE: We only initialize Firebase Auth on web. On native (iOS/Android)
 * the Firebase JS SDK has known persistence issues and the recommended
 * approach is expo-auth-session for Google. For now mobile users can use
 * email/password or "Use Without Account".
 */
import { Platform } from 'react-native';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type Auth,
  type UserCredential,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

/**
 * Lazily initialize Firebase. Returns null if running on native (where we
 * intentionally skip Firebase JS Auth) or if config is missing.
 */
export function getFirebaseAuth(): Auth | null {
  if (Platform.OS !== 'web') return null;
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('Firebase config missing. Set EXPO_PUBLIC_FIREBASE_* in .env');
    return null;
  }
  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  if (!firebaseAuth) {
    firebaseAuth = getAuth(firebaseApp);
  }
  return firebaseAuth;
}

/**
 * Trigger the Google Sign-In popup on web. Returns the Firebase ID token
 * which the backend will exchange for an app JWT.
 */
export async function signInWithGooglePopup(): Promise<{ idToken: string; email: string | null; name: string | null; photoURL: string | null; }> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Google Sign-In is only available on web in this build. Please use email/password on mobile.');
  }
  const provider = new GoogleAuthProvider();
  // Always show account chooser even if the user has only one Google account.
  provider.setCustomParameters({ prompt: 'select_account' });
  const result: UserCredential = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return {
    idToken,
    email: result.user.email,
    name: result.user.displayName,
    photoURL: result.user.photoURL,
  };
}

/** Sign out from Firebase (clears the Firebase JS SDK in-memory session). */
export async function signOutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) await signOut(auth);
}
