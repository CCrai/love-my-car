import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

const missingEnvVars = [
  !apiKey && 'NEXT_PUBLIC_FIREBASE_API_KEY',
  !authDomain && 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  !projectId && 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  !storageBucket && 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  !messagingSenderId && 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  !appId && 'NEXT_PUBLIC_FIREBASE_APP_ID',
].filter(Boolean) as string[];

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingEnvVars.join(', ')}. ` +
      'Create a .env.local file based on .env.local.example and restart the dev server.'
  );
}

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
