// lib/firebase.ts
// Configuração base do Firebase para o app da Escola Dominical

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 🔐 Substitua esses valores pelos que o Firebase Console te deu
const firebaseConfig = {
  apiKey: "AIzaSyBRcBI5WVDH4AUOTEVgJmu2wc4-ULTQ-H4",
  authDomain: "SEU_AUTH_DOMAIN_AQUI",
  projectId: "SEU_PROJECT_ID_AQUI",
  storageBucket: "SEU_STORAGE_BUCKET_AQUI",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID_AQUI",
  appId: "SEU_APP_ID_AQUI",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const firebaseApp = app;
export const firebaseAuth = getAuth(app);
export const firebaseDb = getFirestore(app);
export const firebaseStorage = getStorage(app);
