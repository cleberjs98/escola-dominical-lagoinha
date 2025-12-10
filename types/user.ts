// types/user.ts

// Vamos usar esse tipo para representar datas do Firestore.
// Depois, quando conectarmos de fato com o Firebase, podemos
// importar o tipo Timestamp oficial e ajustar aqui.
export type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
};

export type UserRole = "aluno" | "professor" | "coordenador" | "administrador";

export type UserStatus = "vazio" | "pendente" | "aprovado" | "rejeitado";

export interface User {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  data_nascimento: string | null; // formato YYYY-MM-DD
  photoURL?: string | null;

  papel: UserRole;
  status: UserStatus;

  aprovado_por_id: string | null;
  aprovado_em: FirestoreTimestamp | null;

  alterado_por_id: string | null;
  alterado_em: FirestoreTimestamp | null;

  papel_anterior: UserRole | null;
  motivo_rejeicao: string | null;

  created_at: FirestoreTimestamp;
  updated_at: FirestoreTimestamp;
}

// Tipo auxiliar que podemos usar em formulários de cadastro/edição
export interface UserFormValues {
  nome: string;
  email: string;
  telefone: string;
  data_nascimento: string;
}
