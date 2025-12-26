// lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, Firestore } from "firebase/firestore";
import { getFunctions, Functions } from "firebase/functions";
import { getStorage, FirebaseStorage } from "firebase/storage";

// ---------------------------------------------------------------------------
// Configuração
// ATENÇÃO: É obrigatório usar process.env.NOME_EXATO aqui para o Expo Web
// funcionar em produção (static replacement).
// ---------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ---------------------------------------------------------------------------
// Validação de Variáveis de Ambiente
// ---------------------------------------------------------------------------

const requiredKeys = [
  { key: "apiKey", envName: "EXPO_PUBLIC_FIREBASE_API_KEY" },
  { key: "authDomain", envName: "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN" },
  { key: "projectId", envName: "EXPO_PUBLIC_FIREBASE_PROJECT_ID" },
  { key: "storageBucket", envName: "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET" },
  { key: "messagingSenderId", envName: "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" },
  { key: "appId", envName: "EXPO_PUBLIC_FIREBASE_APP_ID" },
];

const missingRequired = requiredKeys
  .filter((item) => !firebaseConfig[item.key as keyof typeof firebaseConfig])
  .map((item) => item.envName);

const firebaseReady = missingRequired.length === 0;

const firebaseMissingMessage = firebaseReady
  ? ""
  : `[firebase] Missing environment variables: ${missingRequired.join(", ")}`;

// Função auxiliar para garantir que o Firebase está pronto antes de usar
function requireFirebase<T>(factory: () => T): T {
  if (!firebaseReady) {
    console.error(firebaseMissingMessage);
    // Em produção, isso pode causar tela branca, mas é melhor que falhar silenciosamente.
    // O ideal é ter as variáveis configuradas.
    throw new Error(firebaseMissingMessage);
  }
  return factory();
}

// Em desenvolvimento, lança erro imediatamente para alertar o desenvolvedor
if (!firebaseReady && __DEV__) {
  throw new Error(firebaseMissingMessage);
}

// ---------------------------------------------------------------------------
// Inicialização do App
// ---------------------------------------------------------------------------

let app: FirebaseApp;

// Inicializa apenas se não houver apps existentes
app = requireFirebase(() => 
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const firebaseAuth: Auth = requireFirebase(() => getAuth(app));

// ---------------------------------------------------------------------------
// Firestore
// Mantendo a configuração de long polling conforme seu código original
// ---------------------------------------------------------------------------

let firebaseDb: Firestore;

firebaseDb = requireFirebase(() => {
  try {
    // Tenta inicializar com configurações específicas se for web
    if (typeof window !== "undefined") {
      return initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });
    }
    return getFirestore(app);
  } catch (e) {
    // Fallback caso a instância já exista
    return getFirestore(app);
  }
});

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const firebaseStorage: FirebaseStorage = requireFirebase(() => getStorage(app));

// Functions (usar mesma região das Cloud Functions/Firestore: europe-west3)
const firebaseFunctions: Functions = requireFirebase(() => getFunctions(app, "europe-west3"));

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { 
  app, 
  firebaseAuth, 
  firebaseDb, 
  firebaseStorage, 
  firebaseFunctions,
  firebaseReady, 
  firebaseMissingMessage 
};