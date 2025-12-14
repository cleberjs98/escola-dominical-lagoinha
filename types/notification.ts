// types/notification.ts
import type { Timestamp } from "firebase/firestore";

// Tipos de notificação conforme plano da Fase 7.1
export enum NotificationType {
  NOVA_RESERVA = "nova_reserva",
  RESERVA_APROVADA = "reserva_aprovada",
  RESERVA_REJEITADA = "reserva_rejeitada",
  NOVO_AVISO = "novo_aviso",
  NOVA_AULA = "nova_aula",
  NOVO_DEVOCIONAL = "novo_devocional",
  NOVO_USUARIO_PENDENTE = "novo_usuario_pendente",
  USUARIO_APROVADO = "usuario_aprovado",
  USUARIO_REJEITADO = "usuario_rejeitado",
  AULA_DISPONIVEL = "aula_disponivel",
  AULA_PUBLICADA = "aula_publicada",
  AULA_RESERVADA = "aula_reservada",
}

export enum NotificationReferenceType {
  AULA = "aula",
  DEVOCIONAL = "devocional",
  AVISO = "aviso",
  RESERVA = "reserva",
  OUTRO = "outro",
}

export interface Notification {
  id: string;
  usuario_id: string; // destinatario
  tipo: NotificationType;
  titulo: string;
  mensagem: string;
  tipo_referencia?: NotificationReferenceType | null;
  referencia_id?: string | null;
  lida: boolean;
  lida_em?: Timestamp | null;
  created_at: Timestamp;
}
