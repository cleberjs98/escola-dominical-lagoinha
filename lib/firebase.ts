// lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

type EnvOptions = { required?: boolean };

const missingRequired: string[] = [];

function getEnvVar(key: string, options: EnvOptions = {}): string | undefined {
  const value = process.env[key];
  if (value && value.trim().length > 0) return value;
  if (options.required) missingRequired.push(key);
  return undefined;
}

const firebaseConfig = {
  apiKey: getEnvVar("EXPO_PUBLIC_FIREBASE_API_KEY", { required: true }) ?? "",
  authDomain: getEnvVar("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN", { required: true }) ?? "",
  projectId: getEnvVar("EXPO_PUBLIC_FIREBASE_PROJECT_ID", { required: true }) ?? "",
  storageBucket: getEnvVar("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET", { required: true }) ?? "",
  messagingSenderId: getEnvVar("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", { required: true }) ?? "",
  appId: getEnvVar("EXPO_PUBLIC_FIREBASE_APP_ID", { required: true }) ?? "",
  measurementId: getEnvVar("EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID"),
};

const firebaseReady = missingRequired.length === 0;
const firebaseMissingMessage = firebaseReady
  ? ""
  : `[firebase] Missing environment variables: ${missingRequired.join(", ")}`;

function requireFirebase<T>(factory: () => T): T {
  if (!firebaseReady) {
    console.error(firebaseMissingMessage);
    throw new Error(firebaseMissingMessage);
  }
  return factory();
}

if (!firebaseReady && __DEV__) {
  throw new Error(firebaseMissingMessage);
}

// ---------------------------------------------------------------------------
// Inicialização base do app
// ---------------------------------------------------------------------------

let app: FirebaseApp;
app = requireFirebase(() => (!getApps().length ? initializeApp(firebaseConfig) : getApp()));

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const firebaseAuth: Auth = requireFirebase(() => getAuth(app));

// ---------------------------------------------------------------------------
// Firestore - forçando long polling para evitar problemas de rede/WebSocket
// ---------------------------------------------------------------------------

let firebaseDb: Firestore;

firebaseDb = requireFirebase(() =>
  typeof window !== "undefined"
    ? initializeFirestore(app, {
        experimentalForceLongPolling: true,
      })
    : getFirestore(app)
);

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const firebaseStorage: FirebaseStorage = requireFirebase(() => getStorage(app));

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { app, firebaseAuth, firebaseDb, firebaseStorage, firebaseReady, firebaseMissingMessage };
