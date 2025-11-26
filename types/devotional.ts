// types/devotional.ts
import type { Timestamp } from "firebase/firestore";

export enum DevotionalStatus {
  RASCUNHO = "rascunho",
  DISPONIVEL = "disponivel",
  PUBLICADO = "publicado",
  ARQUIVADO = "arquivado",
}

export interface Devotional {
  id: string;
  titulo: string;
  conteudo_base: string;
  // Para consistência com demais datas do projeto, usamos Timestamp do Firestore.
  // Se preferir string ISO, alinhe aqui e na escrita/leitura do Firestore.
  data_devocional: Timestamp | string;
  data_publicacao_auto?: Timestamp | string | null;
  status: DevotionalStatus;
  criado_por_id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  publicado_em?: Timestamp | null;
  rascunho_salvo_em?: Timestamp | null;
}
