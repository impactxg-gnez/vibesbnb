import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

function firebaseWebConfig() {
  return {
    apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '').trim(),
    authDomain: (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '').trim(),
    projectId: (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '').trim(),
    appId: (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '').trim(),
  };
}

export function isFirebaseWebConfigured(): boolean {
  const c = firebaseWebConfig();
  return Boolean(c.apiKey && c.authDomain && c.projectId && c.appId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  if (!isFirebaseWebConfigured()) {
    throw new Error(
      'Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, and APP_ID.'
    );
  }
  const existing = getApps()[0];
  app = existing ?? initializeApp(firebaseWebConfig());
  return app;
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  return auth;
}
