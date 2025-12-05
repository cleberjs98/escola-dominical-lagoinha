// lib/users.ts
/* Ajustes fase de testes — Home, notificações, gestão de papéis e permissões */
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
import { logAudit } from "./audit";

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

  if (!targetUserId) throw new Error("ID do usuario alvo e obrigatorio.");
  if (!approverId) throw new Error("ID do aprovador e obrigatorio.");

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
  logAudit("approve_user", { targetUserId, approverId, newRole: finalRole });
}

export async function rejectUser(params: RejectUserParams) {
  const { targetUserId, approverId, reason } = params;

  if (!targetUserId) throw new Error("ID do usuario alvo e obrigatorio.");
  if (!approverId) throw new Error("ID do aprovador e obrigatorio.");

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
  logAudit("reject_user", { targetUserId, approverId, reason });
}

export async function updateUserRole(params: UpdateUserRoleParams) {
  const { targetUserId, approverId, newRole } = params;

  if (!targetUserId) throw new Error("ID do usuario alvo e obrigatorio.");
  if (!approverId) throw new Error("ID do aprovador e obrigatorio.");

  const userRef = doc(firebaseDb, "users", targetUserId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    throw new Error("Usuario nao encontrado para alteracao de papel.");
  }

  const approverRef = doc(firebaseDb, "users", approverId);
  const approverSnap = await getDoc(approverRef);
  if (!approverSnap.exists()) {
    throw new Error("Aprovador nao encontrado.");
  }

  const existing = snap.data() as User;
  const approver = approverSnap.data() as User;

  if (approver.papel !== "administrador" && approver.papel !== "coordenador") {
    throw new Error("Apenas coordenador ou administrador podem alterar papeis.");
  }
  if (approver.papel === "coordenador") {
    if (newRole === "administrador") {
      throw new Error("Coordenador nao pode definir administrador.");
    }
    if (existing.papel === "administrador") {
      throw new Error("Coordenador nao pode alterar administrador.");
    }
  }
  if (approver.papel === "administrador" && approverId === targetUserId && newRole !== "administrador") {
    throw new Error("Admin nao pode alterar o proprio papel para fora de administrador.");
  }

  const now = serverTimestamp();

  const payload: Partial<User> = {
    papel: newRole,
    papel_anterior: existing.papel,
    alterado_por_id: approverId,
    alterado_em: now as any,
    updated_at: now as any,
  };

  await updateDoc(userRef, payload as any);
  logAudit("change_role", { targetUserId, approverId, newRole, previous: existing.papel });
}

/**
 * Lista IDs de coordenadores e administradores para acionar notificacoes.
 * Observacao: requer permissoes de leitura/listagem em /users.
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
 * Lista IDs de todos os usuarios aprovados (para broadcast de aulas/devocionais/avisos).
 * Observacao: apenas coord/admin devem usar para evitar leitura ampla por perfis restritos.
 */
export async function listApprovedUsersIds(): Promise<string[]> {
  const colRef = collection(firebaseDb, "users");
  const q = query(colRef, where("status", "==", "aprovado"));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => docSnap.id);
}

type UpdateUserProfileParams = {
  userId: string;
  nome?: string;
  telefone?: string | null;
};

/**
 * Atualiza dados basicos do perfil (nome/telefone) do usuario.
 * Evita enviar campos undefined para o Firestore.
 */
export async function updateUserProfile(params: UpdateUserProfileParams) {
  const { userId, nome, telefone } = params;
  if (!userId) throw new Error("ID do usuario obrigatorio.");

  const payload: Partial<User> = {};
  if (typeof nome === "string") payload.nome = nome;
  if (telefone !== undefined) payload.telefone = telefone;
  payload.updated_at = serverTimestamp() as any;

  const { updated_at, ...rest } = payload;
  if (Object.keys(rest).length === 0) {
    // nada para atualizar alem de updated_at
    return;
  }

  await updateDoc(doc(firebaseDb, "users", userId), payload as any);
}

// ---------- Busca de usuarios ----------
export type UserSearchFilters = {
  termo?: string;
  papel?: UserRole | "todos";
  status?: UserStatus | "todos";
};

export async function searchUsers(filters: UserSearchFilters): Promise<User[]> {
  const { termo, papel, status } = filters;
  const colRef = collection(firebaseDb, "users");
  const conditions = [];
  if (papel && papel !== "todos") {
    conditions.push(where("papel", "==", papel));
  }
  if (status && status !== "todos") {
    conditions.push(where("status", "==", status));
  }

  const q = conditions.length ? query(colRef, ...conditions) : query(colRef);
  const snap = await getDocs(q);
  const list: User[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<User, "id">;
    list.push({ id: docSnap.id, ...data });
  });

  if (termo) {
    const term = termo.toLowerCase();
    return list.filter((u) => {
      const nome = u.nome?.toLowerCase?.() || "";
      const email = (u as any).email?.toLowerCase?.() || "";
      const tel = (u.telefone as any)?.toLowerCase?.() || "";
      return (
        nome.includes(term) ||
        email.includes(term) ||
        tel.includes(term)
      );
    });
  }

  return list;
}
