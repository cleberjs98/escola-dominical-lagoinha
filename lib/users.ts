// lib/users.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  where,
  query,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";
import type { User, UserRole, UserStatus } from "../types/user";

type ApproveUserParams = {
  targetUserId: string; // id do doc em "users" (UID)
  approverId: string; // UID de quem aprova
  newRole?: UserRole; // opcional: novo papel final
};

type RejectUserParams = {
  targetUserId: string;
  approverId: string;
  reason: string;
};

type UpdateUserRoleParams = {
  targetUserId: string;
  approverId: string;
  newRole: UserRole;
};

export async function approveUser(params: ApproveUserParams) {
  const { targetUserId, approverId, newRole } = params;

  if (!targetUserId) throw new Error("ID do usuario alvo é obrigatório.");
  if (!approverId) throw new Error("ID do aprovador é obrigatório.");

  const userRef = doc(firebaseDb, "users", targetUserId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    throw new Error("Usuario nao encontrado para aprovacao.");
  }

  const existing = snap.data() as User;
  const now = serverTimestamp();

  const finalRole: UserRole = newRole ?? existing.papel;

  const payload: Partial<User> = {
    papel: finalRole,
    status: "aprovado" as UserStatus,
    aprovado_por_id: approverId,
    aprovado_em: now as any,
    alterado_por_id: approverId,
    alterado_em: now as any,
    updated_at: now as any,
  };

  if (newRole && newRole !== existing.papel) {
    payload.papel_anterior = existing.papel;
  }

  await updateDoc(userRef, payload as any);
}

export async function rejectUser(params: RejectUserParams) {
  const { targetUserId, approverId, reason } = params;

  if (!targetUserId) throw new Error("ID do usuario alvo é obrigatório.");
  if (!approverId) throw new Error("ID do aprovador é obrigatório.");

  const userRef = doc(firebaseDb, "users", targetUserId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    throw new Error("Usuario nao encontrado para rejeicao.");
  }

  const now = serverTimestamp();

  const payload: Partial<User> = {
    status: "rejeitado",
    motivo_rejeicao: reason,
    aprovado_por_id: null,
    aprovado_em: null,
    alterado_por_id: approverId,
    alterado_em: now as any,
    updated_at: now as any,
  };

  await updateDoc(userRef, payload as any);
}

export async function updateUserRole(params: UpdateUserRoleParams) {
  const { targetUserId, approverId, newRole } = params;

  if (!targetUserId) throw new Error("ID do usuario alvo é obrigatório.");
  if (!approverId) throw new Error("ID do aprovador é obrigatório.");

  const userRef = doc(firebaseDb, "users", targetUserId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    throw new Error("Usuario nao encontrado para alteracao de papel.");
  }

  const existing = snap.data() as User;
  const now = serverTimestamp();

  const payload: Partial<User> = {
    papel: newRole,
    papel_anterior: existing.papel,
    alterado_por_id: approverId,
    alterado_em: now as any,
    updated_at: now as any,
  };

  await updateDoc(userRef, payload as any);
}

/**
 * Lista IDs de coordenadores e administradores para acionar notifica��es.
 * Observa��ǜo: requer permiss��es de leitura/listagem em /users.
 */
export async function listCoordinatorsAndAdminsIds(): Promise<string[]> {
  const colRef = collection(firebaseDb, "users");
  const q = query(
    colRef,
    where("papel", "in", ["coordenador", "administrador"]),
    where("status", "==", "aprovado")
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => docSnap.id);
}

/**
 * Lista IDs de todos os usu��rios aprovados (para broadcast de aulas/devocionais/not��cias).
 * Observa��ǜo: apenas coord/admin devem usar para evitar leitura ampla por perfis restritos.
 */
export async function listApprovedUsersIds(): Promise<string[]> {
  const colRef = collection(firebaseDb, "users");
  const q = query(colRef, where("status", "==", "aprovado"));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => docSnap.id);
}
