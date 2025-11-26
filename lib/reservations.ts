// lib/reservations.ts
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";
import type { Reservation, ReservationStatus } from "../types/reservation";

/**
 * Índices recomendados (criar no console do Firestore):
 * - Collection "reservas_aula" com filtro aula_id (where aula_id == ...) -> índice em aula_id.
 * - Collection "reservas_aula" com filtro status e orderBy solicitado_em -> índice composto (status, solicitado_em).
 */

type RequestReservationParams = {
  lessonId: string;
  professorId: string;
};

export async function requestLessonReservation(params: RequestReservationParams) {
  const { lessonId, professorId } = params;

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
}

type RejectReservationParams = {
  reservationId: string;
  aprovadorId: string;
  motivo: string;
};

export async function rejectReservation(params: RejectReservationParams) {
  const { reservationId, aprovadorId, motivo } = params;
  const ref = doc(firebaseDb, "reservas_aula", reservationId);

  await updateDoc(ref, {
    status: "rejeitada" as ReservationStatus,
    aprovado_por_id: aprovadorId,
    aprovado_em: serverTimestamp(),
    motivo_rejeicao: motivo,
  });
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

  // Buscar reserva
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

  // Atualizar reserva
  await updateDoc(reservationRef, {
    status: "aprovada" as ReservationStatus,
    aprovado_por_id: aprovadorId,
    aprovado_em: serverTimestamp(),
  });

  // Atualizar aula
  const lessonRef = doc(firebaseDb, "aulas", aula_id);
  await updateDoc(lessonRef, {
    status: "reservada",
    professor_reservado_id: professor_id,
    updated_at: serverTimestamp(),
  });
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

  await updateDoc(reservationRef, {
    status: "rejeitada" as ReservationStatus,
    aprovado_por_id: aprovadorId,
    aprovado_em: serverTimestamp(),
    motivo_rejeicao: motivo,
  });
}
