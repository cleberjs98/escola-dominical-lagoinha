// lib/devotionals.ts - CRUD e listagem de devocionais
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import type { Devotional, DevotionalStatus } from "../types/devotional";
import { firebaseDb } from "./firebase";
import { listApprovedUsersIds } from "./users";
import { createNotification } from "./notifications";
import {
  NotificationReferenceType,
  NotificationType,
} from "../types/notification";
import { sanitizeText } from "../utils/sanitize";

type BaseDevotionalParams = {
  titulo: string;
  referencia_biblica: string;
  devocional_texto: string;
  data_devocional: string; // entrada DD/MM/YYYY ou YYYY-MM-DD
  publish_at?: Timestamp | null;
  data_publicacao_auto?: string | null;
};

type CreateDevotionalParams = BaseDevotionalParams & {
  criado_por_id: string;
  status: DevotionalStatus;
  publishNow?: boolean;
};

export async function createDevotional(params: CreateDevotionalParams) {
  const {
    titulo,
    referencia_biblica,
    devocional_texto,
    data_devocional,
    publish_at,
    data_publicacao_auto = null,
    criado_por_id,
    status,
    publishNow = false,
  } = params;

  validateRequiredFields({
    titulo,
    referencia_biblica,
    devocional_texto,
    data_devocional,
    criado_por_id,
  });
  ensureValidStatus(status);

  const normalizedDate = normalizeDateToISO(data_devocional);
  const available = await isDevotionalDateAvailable(normalizedDate);
  if (!available) {
    throw new Error("Ja existe devocional para esta data.");
  }

  const safeTitle = sanitizeText(titulo);
  const safeReference = sanitizeText(referencia_biblica);
  const safeContent = sanitizeText(devocional_texto);

  const finalStatus = publishNow ? DevotionalStatus.PUBLICADO : status;
  const payload: Omit<Devotional, "id"> = {
    titulo: safeTitle,
    referencia_biblica: safeReference,
    devocional_texto: safeContent,
    data_devocional: normalizedDate,
    status: finalStatus,
    publish_at: publishNow ? null : toTimestampOrNull(publish_at),
    data_publicacao_auto: publishNow ? null : data_publicacao_auto ?? null,
    criado_por_id,
    publicado_em: publishNow ? (serverTimestamp() as any) : null,
    created_at: serverTimestamp() as any,
    updated_at: serverTimestamp() as any,
    rascunho_salvo_em: serverTimestamp() as any,
  };

  const colRef = collection(firebaseDb, "devocionais");
  const docRef = await addDoc(colRef, payload);

  if (finalStatus === DevotionalStatus.PUBLICADO) {
    void notifyDevotionalPublished(docRef.id, safeTitle);
  }

  return docRef.id;
}

export async function createDevotionalDraft(
  params: Omit<CreateDevotionalParams, "status" | "publishNow">
) {
  return createDevotional({
    ...params,
    status: DevotionalStatus.RASCUNHO,
  });
}

type UpdateDevotionalParams = Partial<BaseDevotionalParams> & {
  devotionalId: string;
  status?: DevotionalStatus;
  setPublishedNow?: boolean;
  clearSchedule?: boolean;
};

export async function updateDevotionalBase(params: UpdateDevotionalParams) {
  const { devotionalId, setPublishedNow, clearSchedule, ...updates } = params;
  const ref = doc(firebaseDb, "devocionais", devotionalId);

  const payload: Partial<Devotional> = {
    updated_at: serverTimestamp() as any,
    rascunho_salvo_em: serverTimestamp() as any,
  };

  if (updates.titulo !== undefined) {
    if (!isNonEmpty(updates.titulo)) throw new Error("Titulo obrigatorio.");
    payload.titulo = sanitizeText(updates.titulo);
  }
  if (updates.referencia_biblica !== undefined) {
    if (!isNonEmpty(updates.referencia_biblica)) {
      throw new Error("Referencia biblica obrigatoria.");
    }
    payload.referencia_biblica = sanitizeText(updates.referencia_biblica);
  }
  if (updates.devocional_texto !== undefined) {
    if (!isNonEmpty(updates.devocional_texto)) {
      throw new Error("Devocional obrigatorio.");
    }
    payload.devocional_texto = sanitizeText(updates.devocional_texto);
  }
  if (updates.data_devocional !== undefined) {
    const normalized = normalizeDateToISO(updates.data_devocional);
    const available = await isDevotionalDateAvailable(normalized, devotionalId);
    if (!available) {
      throw new Error("Ja existe devocional para esta data.");
    }
    payload.data_devocional = normalized;
  }

  if (clearSchedule) {
    payload.publish_at = null;
    payload.data_publicacao_auto = null;
  } else {
    if (updates.publish_at !== undefined) {
      payload.publish_at = toTimestampOrNull(updates.publish_at);
    }
    if (updates.data_publicacao_auto !== undefined) {
      payload.data_publicacao_auto = updates.data_publicacao_auto ?? null;
    }
  }

  if (setPublishedNow) {
    payload.status = DevotionalStatus.PUBLICADO;
    payload.publish_at = null;
    payload.data_publicacao_auto = null;
    payload.publicado_em = serverTimestamp() as any;
  } else if (updates.status) {
    ensureValidStatus(updates.status);
    payload.status = updates.status;
  }

  await updateDoc(ref, payload as any);

  if (payload.status === DevotionalStatus.PUBLICADO) {
    const snap = await getDoc(ref);
    const title = (snap.data() as any)?.titulo ?? payload.titulo ?? "Devocional publicado";
    void notifyDevotionalPublished(devotionalId, title as string);
  }
}

export async function publishDevotionalNow(devotionalId: string) {
  const ref = doc(firebaseDb, "devocionais", devotionalId);
  await updateDoc(ref, {
    status: DevotionalStatus.PUBLICADO,
    publish_at: null,
    data_publicacao_auto: null,
    publicado_em: serverTimestamp() as any,
    updated_at: serverTimestamp() as any,
  });
  try {
    const snap = await getDoc(ref);
    const title = (snap.data() as any)?.titulo ?? "Devocional publicado";
    void notifyDevotionalPublished(devotionalId, title as string);
  } catch (err) {
    console.error("[Devocionais] Erro ao notificar publicacao:", err);
  }
}

export async function setDevotionalStatus(
  devotionalId: string,
  status: DevotionalStatus
) {
  ensureValidStatus(status);
  const ref = doc(firebaseDb, "devocionais", devotionalId);
  const payload: Partial<Devotional> = {
    status,
    updated_at: serverTimestamp() as any,
  };
  if (status === DevotionalStatus.PUBLICADO) {
    payload.publicado_em = serverTimestamp() as any;
    payload.publish_at = null;
  }
  await updateDoc(ref, payload as any);
}

export async function archiveDevotional(devotionalId: string) {
  await deleteDoc(doc(firebaseDb, "devocionais", devotionalId));
}

type SaveDevotionalDraftParams = Partial<BaseDevotionalParams> & {
  devotionalId: string;
};

export async function saveDevotionalDraft(params: SaveDevotionalDraftParams) {
  const { devotionalId, ...updates } = params;
  const ref = doc(firebaseDb, "devocionais", devotionalId);

  const payload: Partial<Devotional> = {
    updated_at: serverTimestamp() as any,
    rascunho_salvo_em: serverTimestamp() as any,
  };

  if (updates.titulo !== undefined && isNonEmpty(updates.titulo)) {
    payload.titulo = sanitizeText(updates.titulo);
  }
  if (updates.referencia_biblica !== undefined && isNonEmpty(updates.referencia_biblica)) {
    payload.referencia_biblica = sanitizeText(updates.referencia_biblica);
  }
  if (updates.devocional_texto !== undefined && isNonEmpty(updates.devocional_texto)) {
    payload.devocional_texto = sanitizeText(updates.devocional_texto);
  }
  if (updates.data_devocional !== undefined && isNonEmpty(updates.data_devocional)) {
    payload.data_devocional = normalizeDateToISO(updates.data_devocional);
  }
  if (updates.publish_at !== undefined) {
    payload.publish_at = toTimestampOrNull(updates.publish_at);
  }
  if (updates.data_publicacao_auto !== undefined) {
    payload.data_publicacao_auto = updates.data_publicacao_auto ?? null;
  }

  await updateDoc(ref, payload as any);
}

export async function getDevotionalById(
  devotionalId: string
): Promise<Devotional | null> {
  const ref = doc(firebaseDb, "devocionais", devotionalId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return null;
  }
  return convertDocToDevotional(snap.id, snap.data());
}

export async function listPublishedDevotionals(): Promise<Devotional[]> {
  const colRef = collection(firebaseDb, "devocionais");
  const q = query(
    colRef,
    where("status", "==", DevotionalStatus.PUBLICADO),
    orderBy("data_devocional", "asc")
  );
  const snap = await getDocs(q);
  const list: Devotional[] = [];
  snap.forEach((docSnap) => {
    list.push(convertDocToDevotional(docSnap.id, docSnap.data()));
  });
  return list;
}

export async function getDevotionalOfTheDay(
  dateValue: Devotional["data_devocional"]
): Promise<Devotional | null> {
  const colRef = collection(firebaseDb, "devocionais");
  const q = query(
    colRef,
    where("status", "==", DevotionalStatus.PUBLICADO),
    where("data_devocional", "==", dateValue),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return convertDocToDevotional(docSnap.id, docSnap.data());
}

export type DevotionalSearchFilters = {
  termo?: string;
  status?: DevotionalStatus | "todas";
  dataMinima?: Devotional["data_devocional"] | null;
};

export async function searchDevotionals(
  filters: DevotionalSearchFilters
): Promise<Devotional[]> {
  const { termo, status, dataMinima } = filters;
  const colRef = collection(firebaseDb, "devocionais");
  const conditions = [];
  if (status && status !== "todas") {
    conditions.push(where("status", "==", status));
  } else {
    conditions.push(where("status", "==", DevotionalStatus.PUBLICADO));
  }

  const q = query(colRef, ...conditions, orderBy("data_devocional", "desc"));
  const snap = await getDocs(q);
  const list: Devotional[] = [];
  snap.forEach((docSnap) => {
    const devo = convertDocToDevotional(docSnap.id, docSnap.data());
    if (dataMinima) {
      const millisDoc = Date.parse(devo.data_devocional);
      const millisMin =
        typeof dataMinima === "string" ? Date.parse(dataMinima) : Date.parse(String(dataMinima));
      if (millisDoc < millisMin) return;
    }
    list.push(devo);
  });

  if (termo) {
    const term = termo.toLowerCase();
    return list.filter(
      (d) =>
        d.titulo.toLowerCase().includes(term) ||
        d.devocional_texto.toLowerCase().includes(term) ||
        d.referencia_biblica.toLowerCase().includes(term)
    );
  }
  return list;
}

export async function listDevotionalsForAdmin(): Promise<{
  scheduledDrafts: Devotional[];
  drafts: Devotional[];
  published: Devotional[];
}> {
  const colRef = collection(firebaseDb, "devocionais");
  const snap = await getDocs(query(colRef, orderBy("data_devocional", "desc")));
  const scheduledDrafts: Devotional[] = [];
  const drafts: Devotional[] = [];
  const published: Devotional[] = [];

  snap.forEach((docSnap) => {
    const devo = convertDocToDevotional(docSnap.id, docSnap.data());
    if (devo.status === DevotionalStatus.PUBLICADO) {
      published.push(devo);
    } else if (devo.status === DevotionalStatus.DISPONIVEL && devo.publish_at) {
      scheduledDrafts.push(devo);
    } else {
      drafts.push(devo);
    }
  });

  return {
    scheduledDrafts,
    drafts,
    published,
  };
}

export async function isDevotionalDateAvailable(
  dateValue: Devotional["data_devocional"],
  ignoreId?: string
): Promise<boolean> {
  const normalized = normalizeDateToISO(dateValue);
  const colRef = collection(firebaseDb, "devocionais");
  const q = query(colRef, where("data_devocional", "==", normalized));
  const snap = await getDocs(q);

  if (snap.empty) return true;
  if (!ignoreId) return false;

  const others = snap.docs.filter((docSnap) => docSnap.id !== ignoreId);
  return others.length === 0;
}

// Helpers -------------------------------------------------

function convertDocToDevotional(id: string, data: Record<string, any>): Devotional {
  return {
    id,
    titulo: data.titulo ?? "",
    referencia_biblica: data.referencia_biblica ?? "",
    devocional_texto: data.devocional_texto ?? data.conteudo_base ?? "",
    data_devocional: normalizeStoredDate(data.data_devocional),
    status: (data.status ?? DevotionalStatus.RASCUNHO) as DevotionalStatus,
    publish_at: normalizePublishAtValue(data.publish_at),
    data_publicacao_auto: data.data_publicacao_auto ?? null,
    criado_por_id: data.criado_por_id ?? "",
    publicado_em: data.publicado_em ?? null,
    created_at: data.created_at ?? Timestamp.now(),
    updated_at: data.updated_at ?? Timestamp.now(),
    rascunho_salvo_em: data.rascunho_salvo_em ?? null,
  };
}

function toTimestampOrNull(value?: Timestamp | null): Timestamp | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value;
  return null;
}

function isNonEmpty(value?: string, min = 1): boolean {
  return typeof value === "string" && value.trim().length >= min;
}

function normalizeDateToISO(input: string): string {
  if (!isNonEmpty(input)) {
    throw new Error("Data do devocional obrigatoria.");
  }
  const normalized = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) throw new Error("Data do devocional invalida.");
    return normalized;
  }
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
  if (match) {
    const [, dd, mm, yyyy] = match;
    const day = Number(dd);
    const month = Number(mm);
    const year = Number(yyyy);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      throw new Error("Data do devocional invalida.");
    }
    return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
  }
  throw new Error("Data do devocional invalida. Use YYYY-MM-DD ou DD/MM/YYYY.");
}

function normalizeStoredDate(raw: unknown): string {
  if (typeof raw === "string") {
    try {
      return normalizeDateToISO(raw);
    } catch {
      return raw;
    }
  }
  if (raw instanceof Timestamp) {
    const date = raw.toDate();
    const dd = `${date.getDate()}`.padStart(2, "0");
    const mm = `${date.getMonth() + 1}`.padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
}

function normalizePublishAtValue(raw: unknown): Timestamp | null {
  if (!raw) return null;
  if (raw instanceof Timestamp) return raw;
  if (typeof raw === "string") {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    return Timestamp.fromDate(date);
  }
  return null;
}

function validateRequiredFields(values: {
  titulo: string;
  referencia_biblica: string;
  devocional_texto: string;
  data_devocional: string;
  criado_por_id: string;
}) {
  if (!isNonEmpty(values.titulo, 3)) {
    throw new Error("Informe o titulo do devocional.");
  }
  if (!isNonEmpty(values.referencia_biblica, 3)) {
    throw new Error("Informe a referencia biblica.");
  }
  if (!isNonEmpty(values.devocional_texto, 5)) {
    throw new Error("Informe o devocional.");
  }
  normalizeDateToISO(values.data_devocional);
  if (!isNonEmpty(values.criado_por_id, 6)) {
    throw new Error("Usuario invalido para criacao do devocional.");
  }
}

function ensureValidStatus(status: DevotionalStatus) {
  const allowed: DevotionalStatus[] = [
    DevotionalStatus.RASCUNHO,
    DevotionalStatus.DISPONIVEL,
    DevotionalStatus.PUBLICADO,
  ];
  if (!allowed.includes(status)) {
    throw new Error("Status de devocional invalido.");
  }
}

async function notifyDevotionalPublished(devotionalId: string, titulo: string) {
  try {
    const userIds = await listApprovedUsersIds();
    await Promise.all(
      userIds.map((uid) =>
        createNotification({
          usuario_id: uid,
          tipo: NotificationType.NOVO_DEVOCIONAL,
          titulo: "Novo devocional publicado",
          mensagem: titulo,
          tipo_referencia: NotificationReferenceType.DEVOCIONAL,
          referencia_id: devotionalId,
        })
      )
    );
  } catch (err) {
    console.error("[Devocionais] Erro ao notificar publicacao:", err);
  }
}
