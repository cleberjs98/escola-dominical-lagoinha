// lib/navigationSettings.ts
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";
import type {
  BackgroundSettings,
  BackgroundSettingsInput,
  NavigationTabConfig,
  NavigationTabConfigInput,
  ScreenLayoutConfig,
  ScreenLayoutConfigInput,
} from "../types/theme";

const BACKGROUNDS = "backgrounds";
const NAV_TABS = "navigation_tabs";
const SCREEN_LAYOUTS = "screen_layouts";

// ----- BACKGROUNDS -----

export async function createBackground(input: BackgroundSettingsInput) {
  const colRef = collection(firebaseDb, BACKGROUNDS);
  const now = serverTimestamp();
  const docRef = await addDoc(colRef, {
    ...input,
    created_at: now as any,
    updated_at: now as any,
  });
  return docRef.id;
}

export async function updateBackground(id: string, input: Partial<BackgroundSettingsInput>) {
  const ref = doc(firebaseDb, BACKGROUNDS, id);
  await updateDoc(ref, {
    ...input,
    updated_at: serverTimestamp() as any,
  });
}

export async function listBackgrounds(): Promise<BackgroundSettings[]> {
  const q = query(collection(firebaseDb, BACKGROUNDS), orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  const list: BackgroundSettings[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<BackgroundSettings, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

export async function getActiveBackgrounds(): Promise<BackgroundSettings[]> {
  const q = query(collection(firebaseDb, BACKGROUNDS), where("ativo", "==", true));
  const snap = await getDocs(q);
  const list: BackgroundSettings[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<BackgroundSettings, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

export async function listBackgroundsForSection(
  secao: string
): Promise<BackgroundSettings[]> {
  const q = query(
    collection(firebaseDb, BACKGROUNDS),
    where("secao", "==", secao),
    orderBy("created_at", "desc")
  );
  const snap = await getDocs(q);
  const list: BackgroundSettings[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<BackgroundSettings, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

export async function getActiveBackgroundForSection(
  secao: string
): Promise<BackgroundSettings | null> {
  const q = query(
    collection(firebaseDb, BACKGROUNDS),
    where("secao", "==", secao),
    where("ativo", "==", true),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  const data = docSnap.data() as Omit<BackgroundSettings, "id">;
  return { id: docSnap.id, ...data };
}

/**
 * Marca um background como ativo e desativa os demais da mesma secao.
 * Em producao, ideal seria transaction; aqui fazemos multiplos updates simples.
 */
export async function setActiveBackgroundForSection(
  secao: string,
  backgroundId: string
) {
  const list = await listBackgroundsForSection(secao);
  await Promise.all(
    list.map((bg) =>
      updateDoc(doc(firebaseDb, BACKGROUNDS, bg.id), {
        ativo: bg.id === backgroundId,
        updated_at: serverTimestamp() as any,
      })
    )
  );
}

// ----- NAVIGATION TABS -----

export async function createNavigationTab(input: NavigationTabConfigInput) {
  const colRef = collection(firebaseDb, NAV_TABS);
  const now = serverTimestamp();
  const docRef = await addDoc(colRef, {
    ...input,
    created_at: now as any,
    updated_at: now as any,
  });
  return docRef.id;
}

export async function updateNavigationTab(
  id: string,
  input: Partial<NavigationTabConfigInput>
) {
  const ref = doc(firebaseDb, NAV_TABS, id);
  await updateDoc(ref, {
    ...input,
    updated_at: serverTimestamp() as any,
  });
}

export async function listNavigationTabs(): Promise<NavigationTabConfig[]> {
  const q = query(collection(firebaseDb, NAV_TABS), orderBy("ordem", "asc"));
  const snap = await getDocs(q);
  const list: NavigationTabConfig[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<NavigationTabConfig, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

export async function listActiveNavigationTabs(): Promise<NavigationTabConfig[]> {
  const q = query(
    collection(firebaseDb, NAV_TABS),
    where("ativo", "==", true),
    orderBy("ordem", "asc")
  );
  const snap = await getDocs(q);
  const list: NavigationTabConfig[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<NavigationTabConfig, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

/**
 * Atualiza a ordem de varias tabs de uma vez.
 * Em producao, o ideal seria uma batch/transaction; aqui usamos updates em serie.
 */
export async function reorderNavigationTabs(
  items: { id: string; ordem: number }[]
) {
  for (const item of items) {
    await updateDoc(doc(firebaseDb, NAV_TABS, item.id), {
      ordem: item.ordem,
      updated_at: serverTimestamp() as any,
    });
  }
}

// ----- SCREEN LAYOUTS -----

export async function createScreenLayout(input: ScreenLayoutConfigInput) {
  const colRef = collection(firebaseDb, SCREEN_LAYOUTS);
  const now = serverTimestamp();
  const docRef = await addDoc(colRef, {
    ...input,
    created_at: now as any,
    updated_at: now as any,
  });
  return docRef.id;
}

export async function updateScreenLayout(
  id: string,
  input: Partial<ScreenLayoutConfigInput>
) {
  const ref = doc(firebaseDb, SCREEN_LAYOUTS, id);
  await updateDoc(ref, {
    ...input,
    updated_at: serverTimestamp() as any,
  });
}

export async function listScreenLayouts(): Promise<ScreenLayoutConfig[]> {
  const q = query(collection(firebaseDb, SCREEN_LAYOUTS), orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  const list: ScreenLayoutConfig[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<ScreenLayoutConfig, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

export async function getActiveScreenLayouts(): Promise<ScreenLayoutConfig[]> {
  const q = query(collection(firebaseDb, SCREEN_LAYOUTS), where("ativo", "==", true));
  const snap = await getDocs(q);
  const list: ScreenLayoutConfig[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<ScreenLayoutConfig, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}
