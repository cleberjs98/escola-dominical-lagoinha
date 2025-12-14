// lib/notifications.ts
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
import type {
  Notification,
  NotificationReferenceType,
  NotificationType,
} from "../types/notification";

/**
 * Estas funções serão usadas nas próximas fases (7.2+) para:
 * - notificar coordenadores sobre novas reservas
 * - avisar professores quando reservas forem aprovadas/rejeitadas
 * - avisar usuários sobre novas aulas/devocionais/notícias publicadas
 * No futuro podemos acoplar onSnapshot/FCM para tempo real.
 */

type CreateNotificationParams = {
  usuario_id: string;
  tipo: NotificationType;
  titulo: string;
  mensagem: string;
  tipo_referencia?: NotificationReferenceType;
  referencia_id?: string;
};

export async function createNotification(params: CreateNotificationParams) {
  const {
    usuario_id,
    tipo,
    titulo,
    mensagem,
    tipo_referencia = null,
    referencia_id = null,
  } = params;

  const colRef = collection(firebaseDb, "notificacoes");
  const now = serverTimestamp();

  const payload: Omit<Notification, "id"> = {
    usuario_id,
    tipo,
    titulo,
    mensagem,
    tipo_referencia,
    referencia_id,
    lida: false,
    lida_em: null,
    created_at: now as any,
  };

  const docRef = await addDoc(colRef, payload);
  return docRef.id;
}

export async function markNotificationAsRead(notificationId: string) {
  const refDoc = doc(firebaseDb, "notificacoes", notificationId);
  await updateDoc(refDoc, {
    lida: true,
    lida_em: serverTimestamp() as any,
  });
}

export async function markAllNotificationsAsRead(usuarioId: string) {
  const colRef = collection(firebaseDb, "notificacoes");
  const q = query(
    colRef,
    where("usuario_id", "==", usuarioId),
    where("lida", "==", false)
  );
  const snap = await getDocs(q);

  // Simples loop; em produção ideal usar batch/transaction para atomizar.
  const updates = snap.docs.map((docSnap) =>
    updateDoc(docSnap.ref, {
      lida: true,
      lida_em: serverTimestamp() as any,
    })
  );

  await Promise.all(updates);
}

export async function listUserNotifications(
  usuarioId: string,
  limitCount = 50
): Promise<Notification[]> {
  const colRef = collection(firebaseDb, "notificacoes");
  const q = query(
    colRef,
    where("usuario_id", "==", usuarioId),
    orderBy("created_at", "desc"),
    limit(limitCount)
  );

  const snap = await getDocs(q);
  const list: Notification[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Notification, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

export async function listUnreadNotifications(
  usuarioId: string
): Promise<Notification[]> {
  const colRef = collection(firebaseDb, "notificacoes");
  const q = query(
    colRef,
    where("usuario_id", "==", usuarioId),
    where("lida", "==", false),
    orderBy("created_at", "desc")
  );

  const snap = await getDocs(q);
  const list: Notification[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Notification, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

export async function getNotificationById(
  notificationId: string
): Promise<Notification | null> {
  const refDoc = doc(firebaseDb, "notificacoes", notificationId);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<Notification, "id">;
  return { id: snap.id, ...data };
}
