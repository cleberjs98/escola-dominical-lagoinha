// lib/devotionals.ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";
import type { Devotional, DevotionalStatus } from "../types/devotional";

/**
 * Índices recomendados (criar no console do Firestore):
 * - Collection "devocionais" orderBy data_devocional.
 * - Collection "devocionais" status + orderBy data_devocional (status, data_devocional).
 */

type CreateDevotionalParams = {
  titulo: string;
  conteudo_base: string;
  data_devocional: Devotional["data_devocional"];
  criado_por_id: string;
  status: DevotionalStatus;
  data_publicacao_auto?: Devotional["data_publicacao_auto"];
  publishNow?: boolean;
};

export async function createDevotional(params: CreateDevotionalParams) {
  const {
    titulo,
    conteudo_base,
    data_devocional,
    criado_por_id,
    status,
    data_publicacao_auto = null,
    publishNow = false,
  } = params;

  const colRef = collection(firebaseDb, "devocionais");
  const now = serverTimestamp();

  const payload: Omit<Devotional, "id"> = {
    titulo,
    conteudo_base,
    data_devocional,
    data_publicacao_auto,
    status,
    criado_por_id,
    created_at: now as any,
    updated_at: now as any,
    publicado_em: publishNow ? (now as any) : null,
    rascunho_salvo_em: now as any,
  };

  const docRef = await addDoc(colRef, payload);
  return docRef.id;
}

type CreateDevotionalDraftParams = {
  titulo: string;
  conteudo_base: string;
  data_devocional: Devotional["data_devocional"];
  criado_por_id: string;
};

export async function createDevotionalDraft(params: CreateDevotionalDraftParams) {
  return createDevotional({
    ...params,
    status: "rascunho" as DevotionalStatus,
  });
}

type UpdateDevotionalBaseParams = {
  devotionalId: string;
  titulo?: string;
  conteudo_base?: string;
  data_devocional?: Devotional["data_devocional"];
  data_publicacao_auto?: Devotional["data_publicacao_auto"];
  status?: DevotionalStatus;
  setPublishedNow?: boolean;
  archive?: boolean;
};

export async function updateDevotionalBase(params: UpdateDevotionalBaseParams) {
  const { devotionalId, setPublishedNow, archive, ...updates } = params;
  const ref = doc(firebaseDb, "devocionais", devotionalId);

  const payload: Partial<Devotional> = {
    ...updates,
    updated_at: serverTimestamp() as any,
    rascunho_salvo_em: serverTimestamp() as any,
  };

  if (setPublishedNow) {
    payload.status = "publicado" as DevotionalStatus;
    payload.publicado_em = serverTimestamp() as any;
  }

  if (archive) {
    payload.status = "arquivado" as DevotionalStatus;
  }

  await updateDoc(ref, payload as any);
}

export async function publishDevotionalNow(devotionalId: string) {
  const ref = doc(firebaseDb, "devocionais", devotionalId);
  await updateDoc(ref, {
    status: "publicado" as DevotionalStatus,
    publicado_em: serverTimestamp() as any,
    updated_at: serverTimestamp() as any,
  });
}

export async function getDevotionalById(
  devotionalId: string
): Promise<Devotional | null> {
  const ref = doc(firebaseDb, "devocionais", devotionalId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return null;
  }
  const data = snap.data() as Omit<Devotional, "id">;
  return { id: snap.id, ...data };
}

export async function listPublishedDevotionals(): Promise<Devotional[]> {
  const colRef = collection(firebaseDb, "devocionais");
  const q = query(
    colRef,
    where("status", "==", "publicado"),
    orderBy("data_devocional", "desc")
  );
  const snap = await getDocs(q);

  const list: Devotional[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Devotional, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

export async function getDevotionalOfTheDay(
  dateValue: Devotional["data_devocional"]
): Promise<Devotional | null> {
  // Para uso no “Devocional do dia” na home.
  // Formato esperado deve combinar com o que foi salvo em data_devocional (ex.: "YYYY-MM-DD" string).
  const colRef = collection(firebaseDb, "devocionais");
  const q = query(
    colRef,
    where("status", "==", "publicado"),
    where("data_devocional", "==", dateValue),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  const data = docSnap.data() as Omit<Devotional, "id">;
  return { id: docSnap.id, ...data };
}

/**
 * Verifica se já existe devocional na mesma data. Pode receber ignoreId para edições.
 */
export async function isDevotionalDateAvailable(
  dateValue: Devotional["data_devocional"],
  ignoreId?: string
): Promise<boolean> {
  const colRef = collection(firebaseDb, "devocionais");
  const q = query(colRef, where("data_devocional", "==", dateValue));
  const snap = await getDocs(q);

  if (snap.empty) return true;
  if (!ignoreId) return false;

  const others = snap.docs.filter((docSnap) => docSnap.id !== ignoreId);
  return others.length === 0;
}

/**
 * Atalho para ajustar apenas status.
 */
export async function setDevotionalStatus(
  devotionalId: string,
  status: DevotionalStatus
) {
  const ref = doc(firebaseDb, "devocionais", devotionalId);
  const payload: Partial<Devotional> = {
    status,
    updated_at: serverTimestamp() as any,
  };
  if (status === "publicado") {
    payload.publicado_em = serverTimestamp() as any;
  }
  await updateDoc(ref, payload as any);
}

export async function archiveDevotional(devotionalId: string) {
  return setDevotionalStatus(devotionalId, "arquivado" as DevotionalStatus);
}

/**
 * Auto-save de rascunho do devocional.
 */
type SaveDevotionalDraftParams = {
  devotionalId: string;
  titulo?: string;
  conteudo_base?: string;
  data_devocional?: Devotional["data_devocional"];
  data_publicacao_auto?: Devotional["data_publicacao_auto"];
};

export async function saveDevotionalDraft(params: SaveDevotionalDraftParams) {
  const { devotionalId, ...updates } = params;
  const ref = doc(firebaseDb, "devocionais", devotionalId);

  const payload: Partial<Devotional> = {
    ...updates,
    rascunho_salvo_em: serverTimestamp() as any,
    updated_at: serverTimestamp() as any,
  };

  await updateDoc(ref, payload as any);
}
