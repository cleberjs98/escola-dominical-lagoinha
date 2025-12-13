// lib/audit.ts
// Auditoria mÃ­nima (console). Futuro: persistir em coleÃ§Ã£o "auditoria".
export type AuditAction =
  | "approve_user"
  | "reject_user"
  | "change_role"
  | "approve_reservation"
  | "reject_reservation"
  | "request_reservation"
  | "delete_sensitive";

export function logAudit(action: AuditAction, payload: Record<string, any>) {
  // TODO: enviar para coleÃ§Ã£o "auditoria" com serverTimestamp
  // eslint-disable-next-line no-console
  if (__DEV__) console.log(`[AUDIT] ${action}`);
}
