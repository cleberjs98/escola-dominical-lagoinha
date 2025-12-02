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
  const q = query(colRef, where("status", "==", "publicada"), orderBy("data_aula", "desc"));
  const snap = await getDocs(q);

  const list: Lesson[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Lesson, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

// Lista considerando publish_at (publicada ou agendada já liberada)
export async function listLessonsByStatusAndVisibility(): Promise<Lesson[]> {
  const colRef = collection(firebaseDb, "aulas");
  // duas queries: publicadas e agendadas com publish_at <= now
  const now = new Date();
  const publishedQuery = query(colRef, where("status", "==", "publicada"), orderBy("data_aula", "desc"));
  const scheduledQuery = query(
    colRef,
    where("status", "==", "publicada_agendada"),
    orderBy("publish_at", "desc")
  );

  const [pubSnap, schedSnap] = await Promise.all([getDocs(publishedQuery), getDocs(scheduledQuery)]);
  const list: Lesson[] = [];

  pubSnap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Lesson, "id">;
    list.push({ id: docSnap.id, ...data });
  });

  schedSnap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Lesson, "id">;
    const publishAt = (data as any).publish_at;
    const publishDate =
      publishAt?.toDate?.() ??
      (typeof publishAt === "string" ? new Date(publishAt) : null);
    if (publishDate && publishDate.getTime() <= now.getTime()) {
      list.push({ id: docSnap.id, ...data });
    }
  });

  return list.sort((a, b) => {
    const da = (a.data_aula as any)?.toDate?.() ?? new Date(a.data_aula as any);
    const db = (b.data_aula as any)?.toDate?.() ?? new Date(b.data_aula as any);
    return db.getTime() - da.getTime();
  });
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

// Aulas em preparação para professor (sem rascunho), próprias ou reservadas
export async function listLessonsForProfessorPreparation(
  professorId: string
): Promise<Lesson[]> {
  const colRef = collection(firebaseDb, "aulas");
  const statuses: LessonStatus[] = [
    "disponivel",
    "pendente_reserva",
    "reservada",
    "publicada_agendada",
  ];

  const q = query(colRef, where("status", "in", statuses));
  const snap = await getDocs(q);
  const now = Date.now();
  const list: Lesson[] = [];

  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Lesson, "id">;
    const isMine =
      data.professor_reservado_id === professorId ||
      data.criado_por_id === professorId;
    if (!isMine) return;
    // aplica visibilidade de publish_at para agendadas
    if (data.status === "publicada_agendada") {
      const publishAt = (data as any).publish_at;
      const ts =
        publishAt?.toDate?.()?.getTime?.() ??
        (typeof publishAt === "string" ? Date.parse(publishAt) : now);
      if (ts > now) {
        // ainda não liberada, mas professor pode ver
        list.push({ id: docSnap.id, ...data });
        return;
      }
    }
    list.push({ id: docSnap.id, ...data });
  });

  // ordena por data_aula asc (mais próximas primeiro)
  return list.sort((a, b) => {
    const da = (a.data_aula as any)?.toDate?.() ?? new Date(a.data_aula as any);
    const db = (b.data_aula as any)?.toDate?.() ?? new Date(b.data_aula as any);
    return da.getTime() - db.getTime();
  });
}

// Manager (coord/admin) - separa rascunhos e preparação
export async function listLessonsForManager(): Promise<{
  drafts: Lesson[];
  preparation: Lesson[];
}> {
  const colRef = collection(firebaseDb, "aulas");
  const statusesPrep: LessonStatus[] = [
    "disponivel",
    "pendente_reserva",
    "reservada",
    "publicada_agendada",
  ];

  const draftsSnap = await getDocs(query(colRef, where("status", "==", "rascunho")));
  const prepSnap = await getDocs(query(colRef, where("status", "in", statusesPrep)));

  const drafts: Lesson[] = [];
  draftsSnap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Lesson, "id">;
    drafts.push({ id: docSnap.id, ...data });
  });

  const preparation: Lesson[] = [];
  prepSnap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Lesson, "id">;
    preparation.push({ id: docSnap.id, ...data });
  });

  drafts.sort((a, b) => {
    const ua = (a.updated_at as any)?.toDate?.()?.getTime?.() ?? Date.now();
    const ub = (b.updated_at as any)?.toDate?.()?.getTime?.() ?? Date.now();
    return ub - ua;
  });

  preparation.sort((a, b) => {
    const da = (a.data_aula as any)?.toDate?.() ?? new Date(a.data_aula as any);
    const db = (b.data_aula as any)?.toDate?.() ?? new Date(b.data_aula as any);
    return da.getTime() - db.getTime();
  });

  return { drafts, preparation };
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
