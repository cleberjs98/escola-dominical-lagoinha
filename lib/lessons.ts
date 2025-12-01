// lib/lessons.ts
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
import type { Lesson, LessonStatus } from "../types/lesson";
import { listApprovedUsersIds } from "./users";
import { createNotification } from "./notifications";
import {
  NotificationReferenceType,
  NotificationType,
} from "../types/notification";
import { sanitizeText } from "../utils/sanitize";

/**
 * Índices recomendados (criar no console do Firestore):
 * - Collection "aulas" ordenada por data_aula (orderBy data_aula).
 * - Collection "aulas" filtrando status + orderBy data_aula (status, data_aula).
 */

type CreateLessonParams = {
  titulo: string;
  descricao_base: string;
  data_aula: Lesson["data_aula"];
  data_publicacao_auto?: Lesson["data_publicacao_auto"];
  referencia_biblica?: string | null;
  publish_at?: Lesson["publish_at"];
  criado_por_id: string;
  status: LessonStatus;
  publishNow?: boolean;
};

export async function createLesson(params: CreateLessonParams) {
  const {
    titulo,
    descricao_base,
    data_aula,
    data_publicacao_auto = null,
    referencia_biblica = null,
    publish_at = null,
    criado_por_id,
    status,
    publishNow = false,
  } = params;

  const safeTitle = sanitizeText(titulo);
  const safeDescription = sanitizeText(descricao_base);
  const safeReference = referencia_biblica ? sanitizeText(referencia_biblica) : null;
  const safePublishAt = publish_at || null;

  const colRef = collection(firebaseDb, "aulas");
  const now = serverTimestamp();

  const payload: Omit<Lesson, "id"> = {
    titulo: safeTitle,
    descricao_base: safeDescription,
    referencia_biblica: safeReference,
    data_aula,
    data_publicacao_auto,
    publish_at: safePublishAt,
    status,
    criado_por_id,
    professor_reservado_id: null,
    complemento_professor: null,
    created_at: now as any,
    updated_at: now as any,
    publicado_em: status === "publicada" || publishNow ? (now as any) : null,
    rascunho_salvo_em: status === "rascunho" ? (now as any) : null,
  };

  const docRef = await addDoc(colRef, payload);
  if (status === "publicada" || publishNow) {
    void notifyLessonPublished(docRef.id, titulo);
  }
  return docRef.id;
}

type CreateLessonDraftParams = {
  titulo: string;
  descricao_base: string;
  data_aula: Lesson["data_aula"];
  data_publicacao_auto?: Lesson["data_publicacao_auto"];
  criado_por_id: string;
};

export async function createLessonDraft(params: CreateLessonDraftParams) {
  return createLesson({ ...params, status: "rascunho" as LessonStatus });
}

type UpdateLessonBaseParams = {
  lessonId: string;
  titulo?: string;
  descricao_base?: string;
  data_aula?: Lesson["data_aula"];
  data_publicacao_auto?: Lesson["data_publicacao_auto"];
  rascunho_salvo_em?: Lesson["rascunho_salvo_em"];
};

export async function updateLessonBase(params: UpdateLessonBaseParams) {
  const { lessonId, ...updates } = params;
  const ref = doc(firebaseDb, "aulas", lessonId);

  const payload: Partial<Lesson> = {
    ...updates,
    updated_at: serverTimestamp() as any,
  };

  if (payload.titulo) payload.titulo = sanitizeText(payload.titulo as any);
  if (payload.descricao_base) {
    payload.descricao_base = sanitizeText(payload.descricao_base as any);
  }

  await updateDoc(ref, payload as any);
}

type UpdateLessonParams = {
  lessonId: string;
  titulo?: string;
  descricao_base?: string;
  data_aula?: Lesson["data_aula"];
  data_publicacao_auto?: Lesson["data_publicacao_auto"];
  status?: LessonStatus;
  setPublishedNow?: boolean;
  clearPublished?: boolean;
  setDraftSavedNow?: boolean;
};

export async function updateLesson(params: UpdateLessonParams) {
  const { lessonId, setPublishedNow, clearPublished, setDraftSavedNow, ...fields } =
    params;
  const ref = doc(firebaseDb, "aulas", lessonId);
  let publishedNow = setPublishedNow === true || fields.status === "publicada";

  const payload: Partial<Lesson> = {
    ...fields,
    updated_at: serverTimestamp() as any,
  };

  if (payload.titulo) payload.titulo = sanitizeText(payload.titulo as any);
  if (payload.descricao_base) {
    payload.descricao_base = sanitizeText(payload.descricao_base as any);
  }

  if (setPublishedNow) {
    payload.publicado_em = serverTimestamp() as any;
    publishedNow = true;
  } else if (clearPublished) {
    payload.publicado_em = null as any;
  }

  if (setDraftSavedNow) {
    payload.rascunho_salvo_em = serverTimestamp() as any;
  }

  await updateDoc(ref, payload as any);

  if (publishedNow) {
    const currentTitle =
      fields.titulo ??
      (await getDoc(ref)).data()?.titulo ??
      "Aula publicada";
    void notifyLessonPublished(lessonId, currentTitle as string);
  }
}

export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  const ref = doc(firebaseDb, "aulas", lessonId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return null;
  }

  const data = snap.data() as Omit<Lesson, "id">;
  return { id: snap.id, ...data };
}

export async function listLessonsForCoordinator(): Promise<Lesson[]> {
  const colRef = collection(firebaseDb, "aulas");
  const q = query(colRef, orderBy("data_aula"));
  const snap = await getDocs(q);

  const list: Lesson[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Lesson, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

export async function listPublishedLessons(): Promise<Lesson[]> {
  const colRef = collection(firebaseDb, "aulas");
  const q = query(
    colRef,
    where("status", "==", "publicada"),
    orderBy("data_aula", "desc")
  );
  const snap = await getDocs(q);

  const list: Lesson[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Lesson, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

export async function listNextPublishedLessons(max: number): Promise<Lesson[]> {
  const colRef = collection(firebaseDb, "aulas");
  const q = query(
    colRef,
    where("status", "==", "publicada"),
    orderBy("data_aula", "asc"),
    limit(max)
  );
  const snap = await getDocs(q);

  const list: Lesson[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Lesson, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

/**
 * Lista aulas reservadas/publicadas de um professor.
 * Observação: se precisar filtrar status, ajustamos no futuro; hoje mantemos as retornadas.
 */
export async function listLessonsForProfessor(
  professorId: string
): Promise<Lesson[]> {
  const colRef = collection(firebaseDb, "aulas");
  const q = query(
    colRef,
    where("professor_reservado_id", "==", professorId),
    orderBy("data_aula", "asc")
  );
  const snap = await getDocs(q);

  const list: Lesson[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Lesson, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

// ---------- Busca de aulas ----------
export type LessonSearchFilters = {
  titulo?: string;
  status?: LessonStatus | "todas";
  dataMinima?: Date | null;
  professorId?: string | null;
  somentePublicadas?: boolean;
  somenteFuturas?: boolean;
};

export async function searchLessons(filters: LessonSearchFilters): Promise<Lesson[]> {
  const {
    titulo,
    status,
    dataMinima,
    professorId,
    somentePublicadas = true,
    somenteFuturas = false,
  } = filters;

  const colRef = collection(firebaseDb, "aulas");
  const conditions = [];
  if (status && status !== "todas") {
    conditions.push(where("status", "==", status));
  } else if (somentePublicadas) {
    conditions.push(where("status", "==", "publicada"));
  }
  if (professorId) {
    conditions.push(where("professor_reservado_id", "==", professorId));
  }

  const q = conditions.length
    ? query(colRef, ...conditions, orderBy("data_aula", "desc"))
    : query(colRef, orderBy("data_aula", "desc"));

  const snap = await getDocs(q);
  const list: Lesson[] = [];
  const now = Date.now();
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Lesson, "id">;
    // filtro data futura
    if (somenteFuturas) {
      const millis =
        (data.data_aula as any)?.toMillis?.() ??
        (typeof data.data_aula === "string" ? Date.parse(data.data_aula) : now);
      if (millis < now) return;
    }
    // filtro data minima
    if (dataMinima) {
      const millis =
        (data.data_aula as any)?.toMillis?.() ??
        (typeof data.data_aula === "string" ? Date.parse(data.data_aula) : 0);
      if (millis < dataMinima.getTime()) return;
    }
    list.push({ id: docSnap.id, ...data });
  });

  if (titulo) {
    const term = titulo.toLowerCase();
    return list.filter((l) => l.titulo.toLowerCase().includes(term));
  }
  return list;
}

/**
 * Atualiza o complemento do professor em uma aula reservada/publicada.
 * Usa serverTimestamp para rascunho_salvo_em e updated_at.
 */
export async function updateLessonComplement(
  lessonId: string,
  complemento: string
) {
  const ref = doc(firebaseDb, "aulas", lessonId);
  await updateDoc(ref, {
    complemento_professor: sanitizeText(complemento),
    rascunho_salvo_em: serverTimestamp() as any,
    updated_at: serverTimestamp() as any,
  });
}

/**
 * Auto-save de rascunho da aula (título, datas, descrição base).
 */
type SaveLessonDraftParams = {
  lessonId: string;
  titulo?: string;
  descricao_base?: string;
  data_aula?: Lesson["data_aula"];
  data_publicacao_auto?: Lesson["data_publicacao_auto"];
};

export async function saveLessonDraft(params: SaveLessonDraftParams) {
  const { lessonId, ...updates } = params;
  const ref = doc(firebaseDb, "aulas", lessonId);

  const payload: Partial<Lesson> = {
    ...updates,
    rascunho_salvo_em: serverTimestamp() as any,
    updated_at: serverTimestamp() as any,
  };

  if (payload.titulo) payload.titulo = sanitizeText(payload.titulo as any);
  if (payload.descricao_base) {
    payload.descricao_base = sanitizeText(payload.descricao_base as any);
  }

  await updateDoc(ref, payload as any);
}

async function notifyLessonPublished(lessonId: string, titulo: string) {
  try {
    const userIds = await listApprovedUsersIds();
    await Promise.all(
      userIds.map((uid) =>
        createNotification({
          usuario_id: uid,
          tipo: NotificationType.NOVA_AULA,
          titulo: "Nova aula publicada",
          mensagem: titulo,
          tipo_referencia: NotificationReferenceType.AULA,
          referencia_id: lessonId,
        })
      )
    );
  } catch (err) {
    console.error("Erro ao notificar usuários sobre aula publicada:", err);
  }
}
