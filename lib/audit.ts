// lib/audit.ts
// Auditoria mínima (console). Futuro: persistir em coleção "auditoria".
export type AuditAction =
  | "approve_user"
  | "reject_user"
  | "change_role"
  | "approve_reservation"
  | "reject_reservation"
  | "request_reservation"
  | "delete_sensitive";

export function logAudit(action: AuditAction, payload: Record<string, any>) {
  // TODO: enviar para coleção "auditoria" com serverTimestamp
  // eslint-disable-next-line no-console
  console.log(`[AUDIT] ${action}`, payload);
}
