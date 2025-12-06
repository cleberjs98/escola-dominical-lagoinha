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
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";
import type { Aviso, AvisoDestino, AvisoStatus, AvisoTipo } from "../types/aviso";
import type { User } from "../types/user";
import { sanitizeText } from "../utils/sanitize";
import { createNotification } from "./notifications";
import { listCoordinatorsAndAdminsIds } from "./users";
import { NotificationReferenceType, NotificationType } from "../types/notification";

const collectionName = "avisos";

type CreateAvisoInput = {
  titulo: string;
  conteudo: string;
  destino: AvisoDestino;
  tipo: AvisoTipo;
  status: AvisoStatus;
  fixado?: boolean;
  anexos?: Aviso["anexos"];
};

type UpdateAvisoInput = Partial<
  Pick<Aviso, "titulo" | "conteudo" | "destino" | "tipo" | "status" | "fixado" | "anexos">
>;

export async function createAviso(
  data: CreateAvisoInput,
  author: { id: string; nome: string; papel: User["papel"] }
) {
  console.log("[AvisosLib] createAviso", data);
  const colRef = collection(firebaseDb, collectionName);
  const now = serverTimestamp();

  const payload: Omit<Aviso, "id"> = {
    titulo: sanitizeText(data.titulo),
    conteudo: sanitizeText(data.conteudo),
    destino: data.destino,
    tipo: data.tipo,
    status: data.status,
    fixado: data.fixado ?? false,
    anexos: data.anexos ?? [],
    criado_por_id: author.id,
    criado_por_nome: author.nome,
    criado_por_papel: mapAuthorRole(author.papel),
    criado_em: now as any,
    atualizado_em: null,
  };

  const docRef = await addDoc(colRef, payload as any);
  if (data.status === "publicado") {
    await notifyAdminsAboutAviso(docRef.id, payload.titulo);
  }
  return docRef.id;
}

export async function updateAviso(id: string, data: UpdateAvisoInput) {
  const ref = doc(firebaseDb, collectionName, id);
  const sanitized: UpdateAvisoInput = { ...data };
  if (sanitized.titulo) sanitized.titulo = sanitizeText(sanitized.titulo);
  if (sanitized.conteudo) sanitized.conteudo = sanitizeText(sanitized.conteudo);

  await updateDoc(ref, {
    ...sanitized,
    atualizado_em: serverTimestamp() as any,
  });

  if (sanitized.status === "publicado") {
    await notifyAdminsAboutAviso(id, sanitized.titulo || "Aviso publicado");
  }
}

export async function deleteAviso(id: string) {
  console.log("[AvisosLib] deleteAviso", id);
  const ref = doc(firebaseDb, collectionName, id);
  await deleteDoc(ref);
}

export async function getAvisoById(id: string): Promise<Aviso | null> {
  const ref = doc(firebaseDb, collectionName, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapAvisoSnap(snap.id, snap.data() as Omit<Aviso, "id">);
}

export async function listAvisosForUser(user: User | null): Promise<Aviso[]> {
  if (!user) return [];
  const role = user.papel;
  const userId = (user as any)?.id || (user as any)?.uid || "";
  const colRef = collection(firebaseDb, collectionName);

  if (role === "administrador" || role === "coordenador") {
    const q = query(colRef, orderBy("fixado", "desc"), orderBy("criado_em", "desc"));
    const snap = await getDocs(q);
    return mapAvisoList(snap.docs);
  }

  if (role === "professor") {
    if (!userId) return [];
    const publishedQ = query(
      colRef,
      where("status", "==", "publicado"),
      where("destino", "in", ["todos", "professores"]),
      orderBy("criado_em", "desc")
    );
    const mineQ = query(
      colRef,
      where("criado_por_id", "==", userId),
      orderBy("criado_em", "desc")
    );
    const [publishedSnap, mineSnap] = await Promise.all([getDocs(publishedQ), getDocs(mineQ)]);
    return mergeUnique([...mapAvisoList(publishedSnap.docs), ...mapAvisoList(mineSnap.docs)]);
  }

  const allowedDestinos: AvisoDestino[] = ["todos", "alunos"];
  const alunoQ = query(
    colRef,
    where("status", "==", "publicado"),
    where("destino", "in", allowedDestinos),
    orderBy("criado_em", "desc")
  );
  const snap = await getDocs(alunoQ);
  return mapAvisoList(snap.docs);
}

export async function listRecentAvisosForUser(user: User | null, limitCount = 3): Promise<Aviso[]> {
  console.log("[AvisosLib] listRecentAvisosForUser", user?.papel);
  if (!user) return [];
  const role = user.papel;
  const userId = (user as any)?.id || (user as any)?.uid || "";
  const colRef = collection(firebaseDb, collectionName);
  const limitConstraint = limit(limitCount);

  if (role === "administrador" || role === "coordenador") {
    const q = query(colRef, orderBy("criado_em", "desc"), limitConstraint);
    const snap = await getDocs(q);
    const list = mapAvisoList(snap.docs);
    return sortAvisos(list).slice(0, limitCount);
  }

  if (role === "professor") {
    if (!userId) return [];
    const publishedQ = query(
      colRef,
      where("status", "==", "publicado"),
      where("destino", "in", ["todos", "professores"]),
      orderBy("criado_em", "desc"),
      limitConstraint
    );
    const mineQ = query(
      colRef,
      where("criado_por_id", "==", userId),
      orderBy("criado_em", "desc"),
      limitConstraint
    );
    const [publishedSnap, mineSnap] = await Promise.all([getDocs(publishedQ), getDocs(mineQ)]);
    return mergeUnique([
      ...mapAvisoList(publishedSnap.docs),
      ...mapAvisoList(mineSnap.docs),
    ]).slice(0, limitCount);
  }

  const alunoQ = query(
    colRef,
    where("status", "==", "publicado"),
    where("destino", "in", ["todos", "alunos"]),
    orderBy("criado_em", "desc"),
    limitConstraint
  );
  const snap = await getDocs(alunoQ);
  return mapAvisoList(snap.docs);
}

function mapAvisoList(docs: { id: string; data: () => any }[]): Aviso[] {
  return sortAvisos(
    docs.map((docSnap) => mapAvisoSnap(docSnap.id, docSnap.data() as Omit<Aviso, "id">))
  );
}

function mapAvisoSnap(id: string, data: Omit<Aviso, "id">): Aviso {
  return {
    id,
    ...data,
  };
}

function mergeUnique(list: Aviso[]): Aviso[] {
  const seen = new Set<string>();
  const result: Aviso[] = [];
  list.forEach((item) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    result.push(item);
  });
  return sortAvisos(result);
}

function sortAvisos(list: Aviso[]): Aviso[] {
  return [...list].sort((a, b) => {
    const aFix = a.fixado ? 1 : 0;
    const bFix = b.fixado ? 1 : 0;
    if (aFix !== bFix) return bFix - aFix;
    const aDate = toMillis(a.criado_em);
    const bDate = toMillis(b.criado_em);
    return bDate - aDate;
  });
}

function toMillis(value: any): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if ((value as Timestamp)?.toMillis) return (value as Timestamp).toMillis();
  return Number(value) || 0;
}

function mapAuthorRole(papel: User["papel"]): Aviso["criado_por_papel"] {
  if (papel === "coordenador" || papel === "administrador") return papel;
  return "professor";
}

async function notifyAdminsAboutAviso(avisoId: string, titulo: string) {
  try {
    const adminIds = await listCoordinatorsAndAdminsIds();
    await Promise.all(
      adminIds.map((uid) =>
        createNotification({
          usuario_id: uid,
          tipo: NotificationType.NOVO_AVISO,
          titulo: "Novo aviso publicado",
          mensagem: titulo,
          tipo_referencia: NotificationReferenceType.AVISO,
          referencia_id: avisoId,
        })
      )
    );
  } catch (err) {
    console.error("[AvisosLib] erro ao notificar admins sobre aviso:", err);
  }
}
