// lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  Firestore,
} from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// ⚠️ Substitua pelos valores do seu projeto Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBRcBI5WVDH4AUOTEVgJmu2wc4-ULTQ-H4",
  authDomain: "app-ebd-25695.firebaseapp.com",
  projectId: "app-ebd-25695",
  storageBucket: "app-ebd-25695.firebasestorage.app",
  messagingSenderId: "1033714210310",
  appId: "1:1033714210310:web:6f01b9f881573f0bb49587",
};

// ---------------------------------------------------------------------------
// Inicialização base do app
// ---------------------------------------------------------------------------

let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const firebaseAuth: Auth = getAuth(app);

// ---------------------------------------------------------------------------
// Firestore - forçando long polling para evitar problemas de rede/WebSocket
// ---------------------------------------------------------------------------

let firebaseDb: Firestore;

if (typeof window !== "undefined") {
  // Ambiente web: usamos initializeFirestore com long polling
  firebaseDb = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} else {
  // Ambiente nativo: getFirestore normal
  firebaseDb = getFirestore(app);
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const firebaseStorage: FirebaseStorage = getStorage(app);

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { app, firebaseAuth, firebaseDb, firebaseStorage };
