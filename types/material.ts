// types/material.ts
import type { Timestamp } from "firebase/firestore";

export enum MaterialReferenceType {
  AULA = "aula",
  DEVOCIONAL = "devocional",
  AVISO = "aviso",
}

export enum MaterialType {
  VIDEO = "video",
  PDF = "pdf",
  IMAGEM = "imagem",
  APRESENTACAO = "apresentacao",
  DOCUMENTO = "documento",
  LINK = "link",
  OUTRO = "outro",
}

export interface SupportMaterial {
  id: string;
  tipo_referencia: MaterialReferenceType;
  referencia_id: string; // id da aula/devocional/aviso
  tipo_material: MaterialType;
  nome: string;
  descricao?: string | null;
  caminho_storage?: string | null; // path no Storage (se arquivo)
  url_externa?: string | null; // se for link externo (YouTube, site etc.)
  tamanho_bytes?: number | null;
  mime_type?: string | null;
  enviado_por_id: string; // UID de quem enviou
  enviado_em: Timestamp;
  ordem_exibicao?: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}
