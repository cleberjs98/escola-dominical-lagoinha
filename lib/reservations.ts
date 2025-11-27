// lib/reservations.ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";
import type { Reservation, ReservationStatus } from "../types/reservation";
import { createNotification } from "./notifications";
import { listCoordinatorsAndAdminsIds } from "./users";
import {
  NotificationReferenceType,
  NotificationType,
} from "../types/notification";
import { logAudit } from "./audit";

/**
 * Índices recomendados (criar no console do Firestore):
 * - Collection "reservas_aula" com filtro aula_id (where aula_id == ...) -> índice em aula_id.
 * - Collection "reservas_aula" com filtro status e orderBy solicitado_em -> índice composto (status, solicitado_em).
 * - Collection "reservas_aula" com filtros aula_id + professor_id + status (pendente/aprovada) para evitar duplicidade.
 */

type RequestReservationParams = {
  lessonId: string;
  professorId: string;
};

export async function requestLessonReservation(params: RequestReservationParams) {
  const { lessonId, professorId } = params;

  const duplicateSnap = await getDocs(
    query(
      collection(firebaseDb, "reservas_aula"),
      where("aula_id", "==", lessonId),
      where("professor_id", "==", professorId),
      where("status", "in", ["pendente", "aprovada"])
    )
  );
  if (!duplicateSnap.empty) {
    throw new Error("Já existe uma reserva pendente ou aprovada para esta aula por este professor.");
  }

  const colRef = collection(firebaseDb, "reservas_aula");
  const now = serverTimestamp();

  const payload: Omit<Reservation, "id"> = {
    aula_id: lessonId,
    professor_id: professorId,
    status: "pendente" as ReservationStatus,
    aprovado_por_id: null,
    aprovado_em: null,
    motivo_rejeicao: null,
    solicitado_em: now as any,
  };

  const docRef = await addDoc(colRef, payload);
  logAudit("request_reservation", { reservationId: docRef.id, lessonId, professorId });

  try {
    const adminIds = await listCoordinatorsAndAdminsIds();
    await Promise.all(
      adminIds.map((uid) =>
        createNotification({
          usuario_id: uid,
          tipo: NotificationType.NOVA_RESERVA,
          titulo: "Nova solicitação de reserva",
          mensagem: "Um professor solicitou reserva de aula.",
          tipo_referencia: NotificationReferenceType.RESERVA,
          referencia_id: docRef.id,
        })
      )
    );
  } catch (err) {
    console.error("Erro ao notificar coordenadores/admins sobre nova reserva:", err);
  }

  return docRef.id;
}

type ApproveReservationParams = {
  reservationId: string;
  aprovadorId: string;
};

export async function approveReservation(params: ApproveReservationParams) {
  const { reservationId, aprovadorId } = params;
  const ref = doc(firebaseDb, "reservas_aula", reservationId);

  await updateDoc(ref, {
    status: "aprovada" as ReservationStatus,
    aprovado_por_id: aprovadorId,
    aprovado_em: serverTimestamp(),
  });
  logAudit("approve_reservation", { reservationId, aprovadorId });
}

type RejectReservationParams = {
  reservationId: string;
  aprovadorId: string;
  motivo: string;
};

export async function rejectReservation(params: RejectReservationParams) {
  const { reservationId, aprovadorId, motivo } = params;
  const ref = doc(firebaseDb, "reservas_aula", reservationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Reserva não encontrada para rejeição.");
  }
  const reservationData = snap.data() as Reservation;

  await updateDoc(ref, {
    status: "rejeitada" as ReservationStatus,
    aprovado_por_id: aprovadorId,
    aprovado_em: serverTimestamp(),
    motivo_rejeicao: motivo,
  });
  logAudit("reject_reservation", { reservationId, aprovadorId, motivo });

  try {
    await createNotification({
      usuario_id: reservationData.professor_id,
      tipo: NotificationType.RESERVA_REJEITADA,
      titulo: "Reserva rejeitada",
      mensagem: `Sua solicitação foi rejeitada. Motivo: ${motivo}`,
      tipo_referencia: NotificationReferenceType.RESERVA,
      referencia_id: reservationId,
    });
  } catch (err) {
    console.error("Erro ao notificar professor sobre rejeição da reserva:", err);
  }
}

export async function getReservationsForLesson(
  lessonId: string
): Promise<Reservation[]> {
  const colRef = collection(firebaseDb, "reservas_aula");
  const q = query(colRef, where("aula_id", "==", lessonId));
  const snap = await getDocs(q);

  const list: Reservation[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Reservation, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

export async function listPendingReservations(): Promise<Reservation[]> {
  const colRef = collection(firebaseDb, "reservas_aula");
  const q = query(
    colRef,
    where("status", "==", "pendente"),
    orderBy("solicitado_em")
  );

  const snap = await getDocs(q);
  const list: Reservation[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Reservation, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

type ApproveReservationAndUpdateLessonParams = {
  reservationId: string;
  aprovadorId: string;
};

/**
 * Aprova a reserva e atualiza a aula como reservada pelo professor.
 * Observação: aqui fazemos duas operações em sequência (não é transaction).
 * Em produção, o ideal seria usar runTransaction para consistência.
 */
export async function approveReservationAndUpdateLesson(
  params: ApproveReservationAndUpdateLessonParams
) {
  const { reservationId, aprovadorId } = params;

  const reservationRef = doc(firebaseDb, "reservas_aula", reservationId);
  const reservationSnap = await getDoc(reservationRef);
  if (!reservationSnap.exists()) {
    throw new Error("Reserva não encontrada.");
  }
  const reservationData = reservationSnap.data() as Reservation;

  const { aula_id, professor_id } = reservationData;
  if (!aula_id || !professor_id) {
    throw new Error("Dados da reserva incompletos (aula_id ou professor_id ausente).");
  }

  const lessonRef = doc(firebaseDb, "aulas", aula_id);
  const currentLesson = await getDoc(lessonRef);
  if (currentLesson.exists()) {
    const lessonData = currentLesson.data() as any;
    if (
      lessonData.status === "reservada" &&
      lessonData.professor_reservado_id &&
      lessonData.professor_reservado_id !== professor_id
    ) {
      throw new Error("Aula já reservada para outro professor.");
    }
  }

  await updateDoc(reservationRef, {
    status: "aprovada" as ReservationStatus,
    aprovado_por_id: aprovadorId,
    aprovado_em: serverTimestamp(),
  });

  await updateDoc(lessonRef, {
    status: "reservada",
    professor_reservado_id: professor_id,
    updated_at: serverTimestamp(),
  });
  logAudit("approve_reservation", { reservationId, aprovadorId, lessonId: aula_id });

  try {
    await createNotification({
      usuario_id: professor_id,
      tipo: NotificationType.RESERVA_APROVADA,
      titulo: "Reserva aprovada",
      mensagem: "Sua solicitação de reserva foi aprovada.",
      tipo_referencia: NotificationReferenceType.RESERVA,
      referencia_id: reservationId,
    });
  } catch (err) {
    console.error("Erro ao notificar professor sobre aprovação da reserva:", err);
  }
}

type RejectReservationAndKeepLessonParams = {
  reservationId: string;
  aprovadorId: string;
  motivo: string;
};

/**
 * Rejeita a reserva, mantendo a aula como disponível.
 */
export async function rejectReservationAndKeepLesson(
  params: RejectReservationAndKeepLessonParams
) {
  const { reservationId, aprovadorId, motivo } = params;
  const reservationRef = doc(firebaseDb, "reservas_aula", reservationId);
  const reservationSnap = await getDoc(reservationRef);
  if (!reservationSnap.exists()) {
    throw new Error("Reserva não encontrada.");
  }
  const reservationData = reservationSnap.data() as Reservation;

  await updateDoc(reservationRef, {
    status: "rejeitada" as ReservationStatus,
    aprovado_por_id: aprovadorId,
    aprovado_em: serverTimestamp(),
    motivo_rejeicao: motivo,
  });
  logAudit("reject_reservation", { reservationId, aprovadorId, motivo });

  try {
    await createNotification({
      usuario_id: reservationData.professor_id,
      tipo: NotificationType.RESERVA_REJEITADA,
      titulo: "Reserva rejeitada",
      mensagem: `Sua solicitação foi rejeitada. Motivo: ${motivo}`,
      tipo_referencia: NotificationReferenceType.RESERVA,
      referencia_id: reservationId,
    });
  } catch (err) {
    console.error("Erro ao notificar professor sobre rejeição da reserva:", err);
  }
}
