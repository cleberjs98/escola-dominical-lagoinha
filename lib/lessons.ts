// Serviço central de aulas: criação, reserva, publicação, listagens e helpers de data.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  limit,
  query,
  QuerySnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  DocumentData,
} from "firebase/firestore";
import type { Lesson, LessonStatus } from "../types/lesson";
import { sanitizeText } from "../utils/sanitize";
import { firebaseDb } from "./firebase";
import {
  formatDateTime,
  formatTimestampToDateInput,
  formatTimestampToDateTimeInput,
  parseDateTimeToTimestamp,
  parseDateToTimestamp,
} from "../utils/publishAt";

type LessonInput = {
  titulo: string;
  referencia_biblica: string;
  descricao_base: string;
  data_aula_text: string;
  publish_at_text?: string | null;
};

type LessonUpdateInput = Partial<LessonInput> & {
  status?: LessonStatus;
  professor_reservado_id?: string | null;
  complemento_professor?: string | null;
};

type ListSectionsAdmin = {
  drafts: Lesson[];
  available: Lesson[];
  pendingOrReserved: Lesson[];
  published: Lesson[];
};

type ListSectionsProfessor = {
  available: Lesson[];
  mine: Lesson[];
  published: Lesson[];
};

const collectionName = "aulas";

function parseDataAula(text: string): Timestamp {
  const parsed = parseDateToTimestamp(text);
  if (!parsed) throw new Error("Data da aula inválida. Use dd/mm/aaaa.");
  return parsed;
}

function parsePublishAt(text?: string | null): {
  publish_at: Timestamp | null;
  data_publicacao_auto: string | null;
} {
  if (!text) return { publish_at: null, data_publicacao_auto: null };
  const parsed = parseDateTimeToTimestamp(text);
  if (!parsed) throw new Error("Data/hora de publicação automática inválida (dd/mm/aaaa hh:mm).");
  return { publish_at: parsed.timestamp, data_publicacao_auto: parsed.display };
}

function basePayload(input: LessonInput) {
  const dataAula = parseDataAula(input.data_aula_text);
  const publishData = parsePublishAt(input.publish_at_text);
  return {
    titulo: sanitizeText(input.titulo),
    referencia_biblica: sanitizeText(input.referencia_biblica),
    descricao_base: sanitizeText(input.descricao_base),
    data_aula: dataAula,
    publish_at: publishData.publish_at,
    data_publicacao_auto: publishData.data_publicacao_auto,
  };
}

export async function createLessonDraft(input: LessonInput, criadoPorId: string) {
  if (__DEV__) console.log("[lessons] createLessonDraft");
  return createLessonWithStatus(input, "rascunho", criadoPorId);
}

export async function createLessonAvailable(input: LessonInput, criadoPorId: string) {
  if (__DEV__) console.log("[lessons] createLessonAvailable");
  return createLessonWithStatus(input, "disponivel", criadoPorId);
}

async function createLessonWithStatus(
  input: LessonInput,
  status: LessonStatus,
  criadoPorId: string
) {
  const payload = basePayload(input);
  const colRef = collection(firebaseDb, collectionName);
  const now = serverTimestamp();
  const docRef = await addDoc(colRef, {
    ...payload,
    status,
    criado_por_id: criadoPorId,
    professor_reservado_id: null,
    reservado_em: null,
    reserva_aprovada_por_id: null,
    reserva_aprovada_em: null,
    reserva_motivo_rejeicao: null,
    publicado_em: null,
    publicado_por_id: null,
    complemento_professor: null,
    created_at: now,
    updated_at: now,
  } as Omit<Lesson, "id">);
  return docRef.id;
}

export async function updateLessonFields(lessonId: string, input: LessonUpdateInput) {
  if (__DEV__) console.log("[lessons] updateLessonFields", { lessonId });
  const ref = doc(firebaseDb, collectionName, lessonId);
  const updates: Partial<Lesson> = {};

  if (input.titulo !== undefined) updates.titulo = sanitizeText(input.titulo);
  if (input.referencia_biblica !== undefined) {
    updates.referencia_biblica = sanitizeText(input.referencia_biblica);
  }
  if (input.descricao_base !== undefined) {
    updates.descricao_base = sanitizeText(input.descricao_base);
  }
  if (input.data_aula_text !== undefined) {
    updates.data_aula = parseDataAula(input.data_aula_text);
  }
  if (input.publish_at_text !== undefined) {
    const publishData = parsePublishAt(input.publish_at_text);
    updates.publish_at = publishData.publish_at;
    updates.data_publicacao_auto = publishData.data_publicacao_auto;
  }
  if (input.status) updates.status = input.status;
  if (input.professor_reservado_id !== undefined) {
    updates.professor_reservado_id = input.professor_reservado_id;
  }
  if (input.complemento_professor !== undefined) {
    updates.complemento_professor = sanitizeText(input.complemento_professor);
  }

  updates.updated_at = serverTimestamp() as any;
  await updateDoc(ref, updates as any);
}

export async function setLessonStatus(lessonId: string, status: LessonStatus) {
  if (__DEV__) console.log("[lessons] setLessonStatus", { lessonId, status });
  const ref = doc(firebaseDb, collectionName, lessonId);
  await updateDoc(ref, {
    status,
    updated_at: serverTimestamp() as any,
  });
}

export async function reserveLesson(lessonId: string, professorId: string) {
  if (__DEV__) console.log("[lessons] reserveLesson", { lessonId, professorId });
  const ref = doc(firebaseDb, collectionName, lessonId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Aula não encontrada.");
  const data = snap.data() as Lesson;
  if (data.status !== "disponivel") throw new Error("Aula não está disponível para reserva.");
  if (data.professor_reservado_id) throw new Error("Aula já possui professor reservado.");

  await updateDoc(ref, {
    status: "pendente_reserva",
    professor_reservado_id: professorId,
    reservado_em: serverTimestamp() as any,
    reserva_aprovada_por_id: null,
    reserva_aprovada_em: null,
    reserva_motivo_rejeicao: null,
    updated_at: serverTimestamp() as any,
  });
}

export async function approveReservation(lessonId: string, approverId: string) {
  if (__DEV__) console.log("[lessons] approveReservation", { lessonId, approverId });
  const ref = doc(firebaseDb, collectionName, lessonId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Aula não encontrada.");
  const data = snap.data() as Lesson;
  if (data.status !== "pendente_reserva") throw new Error("Reserva não está pendente.");
  await updateDoc(ref, {
    status: "reservada",
    reserva_aprovada_por_id: approverId,
    reserva_aprovada_em: serverTimestamp() as any,
    updated_at: serverTimestamp() as any,
  });
}

export async function rejectReservation(lessonId: string, approverId: string, motivo?: string) {
  if (__DEV__) console.log("[lessons] rejectReservation", { lessonId, approverId });
  const ref = doc(firebaseDb, collectionName, lessonId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Aula não encontrada.");
  const data = snap.data() as Lesson;
  if (data.status !== "pendente_reserva") throw new Error("Reserva não está pendente.");
  await updateDoc(ref, {
    status: "disponivel",
    professor_reservado_id: null,
    reservado_em: null,
    reserva_aprovada_por_id: approverId,
    reserva_aprovada_em: serverTimestamp() as any,
    reserva_motivo_rejeicao: motivo ? sanitizeText(motivo) : null,
    updated_at: serverTimestamp() as any,
  });
}

export async function publishLessonNow(lessonId: string, userId: string) {
  if (__DEV__) console.log("[lessons] publishLessonNow", { lessonId, userId });
  const ref = doc(firebaseDb, collectionName, lessonId);
  await updateDoc(ref, {
    status: "publicada",
    publicado_em: serverTimestamp() as any,
    publicado_por_id: userId,
    publish_at: null,
    data_publicacao_auto: null,
    updated_at: serverTimestamp() as any,
  });
}

// Exclusão única de aula (coleção "aulas")
export async function deleteLesson(lessonId: string): Promise<void> {
  if (__DEV__) console.log("[LessonsService] deleteLesson called for", { lessonId });
  const ref = doc(firebaseDb, collectionName, lessonId);
  try {
    await deleteDoc(ref);
    if (__DEV__) console.log("[LessonsService] deleteLesson success", { lessonId });
  } catch (error) {
    console.error("[LessonsService] deleteLesson error", error);
    throw error;
  }
}

export async function updateProfessorComplement(
  lessonId: string,
  professorId: string,
  texto: string
) {
  if (__DEV__) console.log("[lessons] updateProfessorComplement", { lessonId, professorId });
  const ref = doc(firebaseDb, collectionName, lessonId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Aula não encontrada.");
  const data = snap.data() as Lesson;
  const isOwner = data.professor_reservado_id === professorId;
  const canEditStatus = data.status === "reservada" || data.status === "publicada";
  if (!isOwner || !canEditStatus) {
    throw new Error("Você não pode editar esta aula.");
  }
  await updateDoc(ref, {
    complemento_professor: sanitizeText(texto),
    updated_at: serverTimestamp() as any,
  });
}

export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  const ref = doc(firebaseDb, collectionName, lessonId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Lesson, "id">) };
}

function mapList(snapshots: QuerySnapshot<DocumentData>): Lesson[] {
  const list: Lesson[] = [];
  snapshots.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Lesson, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

export async function listLessonsForAdminCoordinator(): Promise<ListSectionsAdmin> {
  const colRef = collection(firebaseDb, collectionName);
  const [draftsSnap, availableSnap, pendingSnap, reservedSnap, publishedSnap] = await Promise.all([
    getDocs(query(colRef, where("status", "==", "rascunho"), orderBy("data_aula", "asc"))),
    getDocs(query(colRef, where("status", "==", "disponivel"), orderBy("data_aula", "asc"))),
    getDocs(query(colRef, where("status", "==", "pendente_reserva"), orderBy("data_aula", "asc"))),
    getDocs(query(colRef, where("status", "==", "reservada"), orderBy("data_aula", "asc"))),
    getDocs(query(colRef, where("status", "==", "publicada"), orderBy("data_aula", "desc"))),
  ]);

  return {
    drafts: mapList(draftsSnap),
    available: mapList(availableSnap),
    pendingOrReserved: [...mapList(pendingSnap), ...mapList(reservedSnap)],
    published: mapList(publishedSnap),
  };
}

export async function listLessonsForProfessor(
  professorId: string
): Promise<ListSectionsProfessor> {
  const colRef = collection(firebaseDb, collectionName);
  const [availableSnap, mineSnap, publishedSnap] = await Promise.all([
    getDocs(query(colRef, where("status", "==", "disponivel"), orderBy("data_aula", "asc"))),
    getDocs(
      query(
        colRef,
        where("professor_reservado_id", "==", professorId),
        where("status", "in", ["pendente_reserva", "reservada"])
      )
    ),
    getDocs(query(colRef, where("status", "==", "publicada"), orderBy("data_aula", "desc"))),
  ]);

  return {
    available: mapList(availableSnap),
    mine: mapList(mineSnap),
    published: mapList(publishedSnap),
  };
}

export async function listPublishedLessons(): Promise<Lesson[]> {
  const colRef = collection(firebaseDb, collectionName);
  const snap = await getDocs(query(colRef, where("status", "==", "publicada"), orderBy("data_aula", "desc")));
  return mapList(snap);
}

// Lista aulas disponíveis ou publicadas (ordenadas asc) com limite
export async function listAvailableAndPublished(limitCount = 3): Promise<Lesson[]> {
  const colRef = collection(firebaseDb, collectionName);
  const snap = await getDocs(query(colRef, where("status", "in", ["disponivel", "publicada"]), limit(limitCount * 2)));
  const list = mapList(snap);
  return list
    .sort((a, b) => {
      const aDate = (a.data_aula as any)?.toDate?.() ?? new Date(a.data_aula as any);
      const bDate = (b.data_aula as any)?.toDate?.() ?? new Date(b.data_aula as any);
      return aDate.getTime() - bDate.getTime();
    })
    .slice(0, limitCount);
}

// Lista próximas aulas publicadas (ordenadas por data asc) com limite
export async function listNextPublishedLessons(limitCount = 3): Promise<Lesson[]> {
  const colRef = collection(firebaseDb, collectionName);
  const snap = await getDocs(
    query(colRef, where("status", "==", "publicada"), orderBy("data_aula", "asc"), limit(limitCount))
  );
  return mapList(snap);
}

// Utilitários para preencher formulário com dados existentes
export function lessonToFormData(lesson: Lesson): LessonInput {
  return {
    titulo: lesson.titulo,
    referencia_biblica: lesson.referencia_biblica || "",
    descricao_base: lesson.descricao_base,
    data_aula_text: formatTimestampToDateInput(lesson.data_aula as Timestamp),
    publish_at_text: formatTimestampToDateTimeInput(lesson.publish_at as Timestamp | null) || "",
  };
}

export function createPublishStringsFromTimestamp(ts: Timestamp | null): {
  publish_at: Timestamp | null;
  data_publicacao_auto: string | null;
} {
  if (!ts) return { publish_at: null, data_publicacao_auto: null };
  return {
    publish_at: ts,
    data_publicacao_auto: formatDateTime(ts.toDate()),
  };
}
