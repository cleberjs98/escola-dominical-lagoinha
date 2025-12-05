// lib/devotionals.ts - funções de devocionais espelhadas em lib/lessons.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  limit,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import type { Devotional } from "../types/devotional";
import { DevotionalStatus } from "../types/devotional";
import { firebaseDb } from "./firebase";
import { sanitizeText } from "../utils/sanitize";

const COLLECTION = "devocionais";

type CreateParams = {
  titulo: string;
  referencia_biblica: string;
  conteudo_base: string;
  data_devocional: string; // dd/mm/aaaa ou yyyy-mm-dd
  publish_at_text?: string | null;
  publish_at?: Timestamp | null;
  data_publicacao_auto?: string | null;
  status: DevotionalStatus;
  criado_por_id: string;
  publishNow?: boolean;
};

type UpdateParams = Partial<CreateParams> & { devotionalId: string };

export async function createDevotional(params: CreateParams) {
  console.log("[DevotionalsLib] createDevotional called");
  const { publishNow = false, publish_at_text = null, publish_at = null, ...rest } = params;
  validateCreate(rest);

  const normalizedDate = normalizeDate(rest.data_devocional);
  const publishAtTs = publishNow ? null : resolvePublishAt(publish_at, publish_at_text);
  const payload: Omit<Devotional, "id"> = {
    ...rest,
    conteudo_base: sanitizeText(rest.conteudo_base),
    titulo: sanitizeText(rest.titulo),
    referencia_biblica: sanitizeText(rest.referencia_biblica),
    data_devocional: normalizedDate,
    publish_at: publishAtTs,
    data_publicacao_auto: publishNow ? null : params.data_publicacao_auto ?? publish_at_text ?? null,
    status: publishNow ? DevotionalStatus.PUBLICADO : params.status,
    publicado_em: publishNow ? (serverTimestamp() as any) : null,
    rascunho_salvo_em: serverTimestamp() as any,
    created_at: serverTimestamp() as any,
    updated_at: serverTimestamp() as any,
  };

  const colRef = collection(firebaseDb, COLLECTION);
  const docRef = await addDoc(colRef, payload);
  return docRef.id;
}

export async function updateDevotional(params: UpdateParams) {
  console.log("[DevotionalsLib] updateDevotional called", params.devotionalId);
  const { devotionalId, publishNow = false, publish_at_text, publish_at, ...updates } = params;
  const ref = doc(firebaseDb, COLLECTION, devotionalId);
  const payload: Partial<Devotional> = { updated_at: serverTimestamp() as any, rascunho_salvo_em: serverTimestamp() as any };

  if (updates.titulo !== undefined) payload.titulo = sanitizeText(updates.titulo);
  if (updates.referencia_biblica !== undefined) payload.referencia_biblica = sanitizeText(updates.referencia_biblica);
  if (updates.conteudo_base !== undefined) payload.conteudo_base = sanitizeText(updates.conteudo_base);
  if (updates.data_devocional !== undefined) payload.data_devocional = normalizeDate(updates.data_devocional);

  const publishAtTs = publishNow ? null : resolvePublishAt(publish_at, publish_at_text);
  if (publish_at !== undefined || publish_at_text !== undefined) {
    payload.publish_at = publishAtTs;
    payload.data_publicacao_auto = publishNow ? null : updates.data_publicacao_auto ?? publish_at_text ?? null;
  }

  if (publishNow) {
    payload.status = DevotionalStatus.PUBLICADO;
    payload.publicado_em = serverTimestamp() as any;
    payload.publish_at = null;
    payload.data_publicacao_auto = null;
  } else if (updates.status) {
    payload.status = updates.status;
  }

  await updateDoc(ref, payload as any);
}

export async function setDevotionalStatus(devotionalId: string, status: DevotionalStatus) {
  console.log("[DevotionalsLib] setDevotionalStatus", devotionalId, status);
  const ref = doc(firebaseDb, COLLECTION, devotionalId);
  await updateDoc(ref, {
    status,
    updated_at: serverTimestamp() as any,
    ...(status === DevotionalStatus.PUBLICADO ? { publicado_em: serverTimestamp() as any, publish_at: null, data_publicacao_auto: null } : null),
  } as any);
}

export async function publishDevotionalNow(devotionalId: string, userId: string) {
  console.log("[DevotionalsLib] publishDevotionalNow called", devotionalId, userId);
  const ref = doc(firebaseDb, COLLECTION, devotionalId);
  await updateDoc(ref, {
    status: DevotionalStatus.PUBLICADO,
    publicado_em: serverTimestamp() as any,
    updated_at: serverTimestamp() as any,
    publish_at: null,
    data_publicacao_auto: null,
  } as any);
}

export async function deleteDevotional(devotionalId: string) {
  console.log("[DevotionalsLib] deleteDevotional", devotionalId);
  await deleteDoc(doc(firebaseDb, COLLECTION, devotionalId));
}

export async function getDevotionalById(devotionalId: string): Promise<Devotional | null> {
  const ref = doc(firebaseDb, COLLECTION, devotionalId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return convertDoc(devotionalId, snap.data());
}

export async function listPublishedDevotionals(): Promise<Devotional[]> {
  console.log("[DevotionalsLib] listPublishedDevotionals called");
  const colRef = collection(firebaseDb, COLLECTION);
  const q = query(colRef, where("status", "==", DevotionalStatus.PUBLICADO), orderBy("data_devocional", "desc"));
  const snap = await getDocs(q);
  const list: Devotional[] = [];
  snap.forEach((docSnap) => list.push(convertDoc(docSnap.id, docSnap.data())));
  return list;
}

export async function listAvailableAndPublishedForProfessor(limitCount = 50): Promise<Devotional[]> {
  console.log("[DevotionalsLib] listAvailableAndPublishedForProfessor called");
  const colRef = collection(firebaseDb, COLLECTION);
  const q = query(
    colRef,
    where("status", "in", [DevotionalStatus.PUBLICADO, DevotionalStatus.DISPONIVEL]),
    orderBy("data_devocional", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  const list: Devotional[] = [];
  snap.forEach((docSnap) => list.push(convertDoc(docSnap.id, docSnap.data())));
  return list;
}

export async function getDevotionalOfTheDay(dateISO: string): Promise<Devotional | null> {
  // dateISO esperado: "YYYY-MM-DD"
  const normalized = normalizeDate(dateISO);
  const colRef = collection(firebaseDb, COLLECTION);
  const q = query(colRef, where("status", "==", DevotionalStatus.PUBLICADO), where("data_devocional", "==", normalized));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return convertDoc(docSnap.id, docSnap.data());
}

export async function listDevotionalsForAdmin(): Promise<{
  drafts: Devotional[];
  available: Devotional[];
  published: Devotional[];
}> {
  console.log("[DevotionalsLib] listDevotionalsForAdmin called");
  const colRef = collection(firebaseDb, COLLECTION);
  const q = query(colRef, orderBy("data_devocional", "desc"));
  const snap = await getDocs(q);
  const drafts: Devotional[] = [];
  const available: Devotional[] = [];
  const published: Devotional[] = [];
  snap.forEach((docSnap) => {
    const devo = convertDoc(docSnap.id, docSnap.data());
    if (devo.status === DevotionalStatus.PUBLICADO) published.push(devo);
    else if (devo.status === DevotionalStatus.DISPONIVEL) available.push(devo);
    else drafts.push(devo);
  });
  return { drafts, available, published };
}

export async function isDevotionalDateAvailable(dateValue: string, ignoreId?: string): Promise<boolean> {
  const normalized = normalizeDate(dateValue);
  const colRef = collection(firebaseDb, COLLECTION);
  const q = query(colRef, where("data_devocional", "==", normalized));
  const snap = await getDocs(q);
  if (snap.empty) return true;
  if (!ignoreId) return false;
  return snap.docs.filter((docSnap) => docSnap.id !== ignoreId).length === 0;
}

// Helpers

function convertDoc(id: string, data: Record<string, any>): Devotional {
  return {
    id,
    titulo: data.titulo ?? "",
    referencia_biblica: data.referencia_biblica ?? "",
    data_devocional: data.data_devocional ?? "",
    publish_at: data.publish_at ?? null,
    data_publicacao_auto: data.data_publicacao_auto ?? null,
    conteudo_base: data.conteudo_base ?? data.devocional_texto ?? "",
    devocional_texto: data.devocional_texto ?? data.conteudo_base ?? "",
    status: data.status ?? DevotionalStatus.RASCUNHO,
    criado_por_id: data.criado_por_id ?? "",
    rascunho_salvo_em: data.rascunho_salvo_em ?? null,
    publicado_em: data.publicado_em ?? null,
    created_at: data.created_at ?? Timestamp.now(),
    updated_at: data.updated_at ?? Timestamp.now(),
  };
}

function normalizeDate(input: string): string {
  if (!input) throw new Error("Data do devocional obrigatória.");
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) throw new Error("Data do devocional inválida.");
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

function parsePublishAtString(input?: string | null): Timestamp | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 12) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const hour = Number(digits.slice(8, 10));
  const minute = Number(digits.slice(10, 12));
  const date = new Date(year, month - 1, day, hour, minute, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }
  return Timestamp.fromDate(date);
}

function resolvePublishAt(value?: Timestamp | null, text?: string | null): Timestamp | null {
  if (value instanceof Timestamp) return value;
  return parsePublishAtString(text);
}

function validateCreate(data: Omit<CreateParams, "publish_at" | "publish_at_text" | "publishNow">) {
  if (!data.titulo?.trim()) throw new Error("Informe o título.");
  if (!data.referencia_biblica?.trim()) throw new Error("Informe a referência bíblica.");
  if (!data.data_devocional?.trim()) throw new Error("Informe a data do devocional.");
  if (!data.conteudo_base?.trim()) throw new Error("Informe o devocional.");
}
