import type { User, UserRole, UserStatus } from "../types/user";

const role: UserRole = "aluno";
const status: UserStatus = "pendente";

const exemploUsuario: User = {
  id: "uid_123",
  nome: "João da Silva",
  email: "joao@example.com",
  telefone: "89999999999",
  data_nascimento: "1990-05-21",
  papel: role,
  status,
  aprovado_por_id: null,
  aprovado_em: null,
  alterado_por_id: null,
  alterado_em: null,
  papel_anterior: null,
  motivo_rejeicao: null,
  created_at: { seconds: 0, nanoseconds: 0 },
  updated_at: { seconds: 0, nanoseconds: 0 },
};
