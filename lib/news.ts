// lib/news.ts
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
import type { News, NewsStatus } from "../types/news";
import { createNotification } from "./notifications";
import {
  NotificationReferenceType,
  NotificationType,
} from "../types/notification";
import { listCoordinatorsAndAdminsIds } from "./users";

/**
 * Índices recomendados:
 * - "noticias" orderBy publicado_em
 * - "noticias" status + orderBy publicado_em
 * - Opcional: indexar data_expiracao para limpezas
 */

type CreateNewsDraftParams = {
  titulo: string;
  conteudo: string;
  autor_id: string;
  papel_autor: string;
};

export async function createNewsDraft(params: CreateNewsDraftParams) {
  const { titulo, conteudo, autor_id, papel_autor } = params;
  const colRef = collection(firebaseDb, "noticias");
  const now = serverTimestamp();

  const payload: Omit<News, "id"> = {
    titulo,
    conteudo,
    autor_id,
    papel_autor,
    status: "rascunho" as NewsStatus,
    publicado_em: null,
    data_expiracao: null,
    rascunho_salvo_em: now as any,
    created_at: now as any,
    updated_at: now as any,
  };

  const docRef = await addDoc(colRef, payload);
  // Nota: notificações serão disparadas somente ao publicar.
  return docRef.id;
}

type UpdateNewsBaseParams = {
  newsId: string;
  titulo?: string;
  conteudo?: string;
};

export async function updateNewsBase(params: UpdateNewsBaseParams) {
  const { newsId, ...updates } = params;
  const ref = doc(firebaseDb, "noticias", newsId);

  const payload: Partial<News> = {
    ...updates,
    rascunho_salvo_em: serverTimestamp() as any,
    updated_at: serverTimestamp() as any,
  };

  await updateDoc(ref, payload as any);
}

export async function publishNewsNow(newsId: string) {
  const ref = doc(firebaseDb, "noticias", newsId);
  const now = Timestamp.now();

  // expira em 5 dias
  const expiresAt = Timestamp.fromMillis(now.toMillis() + 5 * 24 * 60 * 60 * 1000);

  await updateDoc(ref, {
    status: "publicada" as NewsStatus,
    publicado_em: now,
    data_expiracao: expiresAt,
    updated_at: serverTimestamp() as any,
  });

  // Notificar coordenadores (e admins) sobre nova notícia do professor.
  try {
    const snap = await getDoc(ref);
    const title = snap.data()?.titulo ?? "Nova notícia";
    const adminIds = await listCoordinatorsAndAdminsIds();
    await Promise.all(
      adminIds.map((uid) =>
        createNotification({
          usuario_id: uid,
          tipo: NotificationType.NOVA_NOTICIA,
          titulo: "Nova notícia publicada",
          mensagem: title,
          tipo_referencia: NotificationReferenceType.NOTICIA,
          referencia_id: newsId,
        })
      )
    );
    // Opcional: para broadcast total, trocar adminIds por listApprovedUsersIds() no futuro.
  } catch (err) {
    console.error("Erro ao notificar sobre notícia publicada:", err);
  }
}

export async function getNewsById(newsId: string): Promise<News | null> {
  const ref = doc(firebaseDb, "noticias", newsId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<News, "id">;
  return { id: snap.id, ...data };
}

export async function listPublishedNews(): Promise<News[]> {
  const colRef = collection(firebaseDb, "noticias");
  const q = query(
    colRef,
    where("status", "==", "publicada"),
    orderBy("publicado_em", "desc")
  );
  const snap = await getDocs(q);

  const now = Timestamp.now();
  const list: News[] = [];

  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<News, "id">;
    const isExpired =
      data.data_expiracao != null &&
      (data.data_expiracao as Timestamp).toMillis() <= now.toMillis();

    if (!isExpired) {
      list.push({ id: docSnap.id, ...data });
    }
  });

  return list;
}

export async function listMyNews(authorId: string): Promise<News[]> {
  const colRef = collection(firebaseDb, "noticias");
  const q = query(
    colRef,
    where("autor_id", "==", authorId),
    orderBy("created_at", "desc")
  );
  const snap = await getDocs(q);

  const list: News[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<News, "id">;
    list.push({ id: docSnap.id, ...data });
  });

  return list;
}

export async function deleteNews(newsId: string) {
  const ref = doc(firebaseDb, "noticias", newsId);
  await deleteDoc(ref);
}

/**
 * Nota: Cloud Function agendada pode limpar/arquivar notícias expiradas.
 */
