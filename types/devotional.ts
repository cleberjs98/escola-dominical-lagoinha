// types/devotional.ts
import type { Timestamp } from "firebase/firestore";

export enum DevotionalStatus {
  RASCUNHO = "rascunho",
  DISPONIVEL = "disponivel",
  PUBLICADO = "publicado",
}

export interface Devotional {
  id: string;
  titulo: string;
  referencia_biblica: string;
  devocional_texto: string;
  conteudo_base?: string;
  data_devocional: string; // sempre "YYYY-MM-DD"
  status: DevotionalStatus;
  publish_at: Timestamp | null;
  data_publicacao_auto: string | null;
  criado_por_id: string;
  publicado_em: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  rascunho_salvo_em?: Timestamp | null;
}
