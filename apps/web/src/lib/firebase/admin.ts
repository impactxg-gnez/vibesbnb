import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

function adminCredentials() {
  const projectId = (process.env.FIREBASE_ADMIN_PROJECT_ID || '').trim();
  const clientEmail = (process.env.FIREBASE_ADMIN_CLIENT_EMAIL || '').trim();
  const privateKeyRaw = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').trim();
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  return { projectId, clientEmail, privateKey };
}

export function isFirebaseAdminConfigured(): boolean {
  const { projectId, clientEmail, privateKey } = adminCredentials();
  return Boolean(projectId && clientEmail && privateKey);
}

let adminApp: App | null = null;

function getFirebaseAdminApp(): App {
  if (adminApp) return adminApp;
  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return adminApp;
  }

  const { projectId, clientEmail, privateKey } = adminCredentials();
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin is not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.'
    );
  }

  adminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  return adminApp;
}

export function getFirebaseAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}
