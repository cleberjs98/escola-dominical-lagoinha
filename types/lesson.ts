// types/lesson.ts
import type { Timestamp } from "firebase/firestore";

// Status das aulas conforme plano da Fase 4.1
export enum LessonStatus {
  RASCUNHO = "rascunho",
  DISPONIVEL = "disponivel",
  PENDENTE_RESERVA = "pendente_reserva",
  RESERVADA = "reservada",
  PUBLICADA = "publicada",
  ARQUIVADA = "arquivada",
}

export interface Lesson {
  id: string;
  titulo: string;
  descricao_base: string;
  referencia_biblica?: string | null;
  // Para datas no Firestore, recomendação: usar Timestamp (do firebase/firestore).
  // Se optar por ISO string, alinhar com o restante da base. Aqui usamos Timestamp.
  data_aula: Timestamp | string;
  data_publicacao_auto: Timestamp | string | null;
  publish_at?: Timestamp | string | null;
  status: LessonStatus;
  criado_por_id: string;
  professor_reservado_id?: string | null;
  complemento_professor?: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  publicado_em?: Timestamp | null;
  rascunho_salvo_em?: Timestamp | null;
}
