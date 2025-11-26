// lib/users.ts
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";
import type { User, UserRole } from "../types/user";

type ApproveUserParams = {
  targetUserId: string;
  approverId: string;
  newRole?: UserRole;
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
  const ref = doc(firebaseDb, "users", targetUserId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Usuario nao encontrado para aprovacao.");
  }

  const data = snap.data() as User;
  const now = serverTimestamp();

  const payload: Record<string, unknown> = {
    status: "aprovado",
    aprovado_por_id: approverId,
    aprovado_em: now,
    motivo_rejeicao: null,
    alterado_por_id: approverId,
    alterado_em: now,
    updated_at: now,
  };

  if (newRole && newRole !== data.papel) {
    payload.papel_anterior = data.papel;
    payload.papel = newRole;
  }

  await updateDoc(ref, payload);
}

export async function rejectUser(params: RejectUserParams) {
  const { targetUserId, approverId, reason } = params;
  const ref = doc(firebaseDb, "users", targetUserId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Usuario nao encontrado para rejeicao.");
  }

  const now = serverTimestamp();

  const payload: Record<string, unknown> = {
    status: "rejeitado",
    aprovado_por_id: null,
    aprovado_em: null,
    motivo_rejeicao: reason,
    alterado_por_id: approverId,
    alterado_em: now,
    updated_at: now,
  };

  await updateDoc(ref, payload);
}

export async function updateUserRole(params: UpdateUserRoleParams) {
  const { targetUserId, approverId, newRole } = params;
  const ref = doc(firebaseDb, "users", targetUserId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Usuario nao encontrado para atualizar papel.");
  }

  const data = snap.data() as User;
  const now = serverTimestamp();

  if (data.papel === newRole) {
    await updateDoc(ref, {
      alterado_por_id: approverId,
      alterado_em: now,
      updated_at: now,
    });
    return;
  }

  await updateDoc(ref, {
    papel_anterior: data.papel,
    papel: newRole,
    alterado_por_id: approverId,
    alterado_em: now,
    updated_at: now,
  });
}
