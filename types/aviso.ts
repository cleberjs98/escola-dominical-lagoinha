import type { Timestamp } from "firebase/firestore";
import type { UserRole } from "./user";

export type AvisoDestino = "todos" | "alunos" | "professores" | "coordenadores" | "admin";
export type AvisoTipo = "informativo" | "urgente" | "interno" | "espiritual";
export type AvisoStatus = "rascunho" | "publicado";

type AdminLikeRole = Extract<UserRole, "professor" | "coordenador" | "administrador">;

export interface Aviso {
  id: string;
  titulo: string;
  conteudo: string;
  criado_por_id: string;
  criado_por_nome: string;
  criado_por_papel: AdminLikeRole;
  criado_em: Timestamp | Date;
  atualizado_em?: Timestamp | Date | null;
  destino: AvisoDestino;
  status: AvisoStatus;
  tipo: AvisoTipo;
  fixado: boolean;
  anexos?: {
    tipo: "pdf" | "imagem" | "video" | "outro";
    url: string;
    nome: string;
  }[];
}
