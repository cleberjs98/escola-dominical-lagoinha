// types/news.ts
import type { Timestamp } from "firebase/firestore";

export enum NewsStatus {
  RASCUNHO = "rascunho",
  PUBLICADA = "publicada",
}

export interface News {
  id: string;
  titulo: string;
  conteudo: string;
  autor_id: string; // UID do autor
  papel_autor: string; // papel do autor (professor, coordenador, administrador)
  status: NewsStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
  publicado_em?: Timestamp | null;
  data_expiracao?: Timestamp | null;
  rascunho_salvo_em?: Timestamp | null;
}
