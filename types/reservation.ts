// types/reservation.ts
import type { Timestamp } from "firebase/firestore";

export enum ReservationStatus {
  PENDENTE = "pendente",
  APROVADA = "aprovada",
  REJEITADA = "rejeitada",
}

export interface Reservation {
  id: string;
  aula_id: string; // referencia ao doc da aula (colecao "aulas")
  professor_id: string; // UID do professor solicitante
  status: ReservationStatus;
  aprovado_por_id?: string | null;
  aprovado_em?: Timestamp | null;
  motivo_rejeicao?: string | null;
  solicitado_em: Timestamp;
}
