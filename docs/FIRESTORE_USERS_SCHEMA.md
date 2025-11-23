# Schema da coleção `users` (Firestore)

Coleção: `users`
Um documento por usuário, com o id igual ao UID do Firebase Auth.

## Campos

- `id: string`
  - ID do usuário (igual ao UID do Firebase Authentication).

- `nome: string`
  - Nome completo do usuário.

- `email: string`
  - Email usado para login.

- `telefone: string | null`
  - Telefone do usuário com DDD. Pode ser nulo enquanto o usuário não completar o perfil.

- `data_nascimento: string | null`
  - Data de nascimento no formato `YYYY-MM-DD` (ex: `1990-05-21`).

- `papel: "aluno" | "professor" | "coordenador" | "administrador"`
  - Papel atual do usuário no sistema.

- `status: "vazio" | "pendente" | "aprovado" | "rejeitado"`
  - Situação do cadastro do usuário.

- `aprovado_por_id: string | null`
  - ID do usuário (coordenador/admin) que aprovou o cadastro.

- `aprovado_em: Timestamp | null`
  - Data/hora em que o cadastro foi aprovado.

- `alterado_por_id: string | null`
  - ID de quem fez a última alteração de papel/status.

- `alterado_em: Timestamp | null`
  - Data/hora da última alteração de papel/status.

- `papel_anterior: string | null`
  - Papel que o usuário tinha antes da última mudança.

- `motivo_rejeicao: string | null`
  - Motivo da rejeição do cadastro, quando `status = "rejeitado"`.

- `created_at: Timestamp`
  - Data/hora de criação do registro do usuário.

- `updated_at: Timestamp`
  - Data/hora da última atualização do registro.
