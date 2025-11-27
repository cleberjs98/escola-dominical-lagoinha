// lib/theme.ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";
import type { LayoutSettings, ThemeSettings } from "../types/theme";

// Colecoes
const THEME_COLLECTION = "theme_settings";
const LAYOUT_COLLECTION = "layout_settings";

// ---------- THEME SETTINGS ----------
type CreateThemeParams = Omit<ThemeSettings, "id" | "created_at" | "updated_at">;

export async function createThemeSettings(params: CreateThemeParams) {
  const colRef = collection(firebaseDb, THEME_COLLECTION);
  const now = serverTimestamp();
  const docRef = await addDoc(colRef, {
    ...params,
    created_at: now as any,
    updated_at: now as any,
  });
  return docRef.id;
}

type UpdateThemeParams = Partial<CreateThemeParams> & { id: string };

export async function updateThemeSettings(params: UpdateThemeParams) {
  const { id, ...updates } = params;
  const ref = doc(firebaseDb, THEME_COLLECTION, id);
  const payload = {
    ...updates,
    updated_at: serverTimestamp() as any,
  };
  await updateDoc(ref, payload);
}

export async function getActiveThemeSettings(): Promise<ThemeSettings | null> {
  const colRef = collection(firebaseDb, THEME_COLLECTION);
  const q = query(colRef, where("ativo", "==", true), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  const data = docSnap.data() as Omit<ThemeSettings, "id">;
  return { id: docSnap.id, ...data };
}

export async function listThemeSettings(): Promise<ThemeSettings[]> {
  const colRef = collection(firebaseDb, THEME_COLLECTION);
  const q = query(colRef, orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  const list: ThemeSettings[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<ThemeSettings, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

/**
 * Define um tema como ativo. Nao desativa os demais aqui; em producao
 * o ideal seria fazer isso via transaction/CF para garantir apenas um ativo.
 */
export async function setThemeSettingsActive(id: string, ativo = true) {
  const ref = doc(firebaseDb, THEME_COLLECTION, id);
  await updateDoc(ref, {
    ativo,
    updated_at: serverTimestamp() as any,
  });
}

// ---------- LAYOUT SETTINGS ----------
type CreateLayoutParams = Omit<
  LayoutSettings,
  "id" | "created_at" | "updated_at"
>;

export async function createLayoutSettings(params: CreateLayoutParams) {
  const colRef = collection(firebaseDb, LAYOUT_COLLECTION);
  const now = serverTimestamp();
  const docRef = await addDoc(colRef, {
    ...params,
    created_at: now as any,
    updated_at: now as any,
  });
  return docRef.id;
}

type UpdateLayoutParams = Partial<CreateLayoutParams> & { id: string };

export async function updateLayoutSettings(params: UpdateLayoutParams) {
  const { id, ...updates } = params;
  const ref = doc(firebaseDb, LAYOUT_COLLECTION, id);
  const payload = {
    ...updates,
    updated_at: serverTimestamp() as any,
  };
  await updateDoc(ref, payload);
}

export async function getActiveLayoutSettings(): Promise<LayoutSettings | null> {
  const colRef = collection(firebaseDb, LAYOUT_COLLECTION);
  const q = query(colRef, where("ativo", "==", true), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  const data = docSnap.data() as Omit<LayoutSettings, "id">;
  return { id: docSnap.id, ...data };
}

export async function listLayoutSettings(): Promise<LayoutSettings[]> {
  const colRef = collection(firebaseDb, LAYOUT_COLLECTION);
  const q = query(colRef, orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  const list: LayoutSettings[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<LayoutSettings, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

/**
 * Marca configuracao de layout como ativa.
 * Em producao, use transaction/CF para garantir unicidade.
 */
export async function setLayoutSettingsActive(id: string, ativo = true) {
  const ref = doc(firebaseDb, LAYOUT_COLLECTION, id);
  await updateDoc(ref, {
    ativo,
    updated_at: serverTimestamp() as any,
  });
}
