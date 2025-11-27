import React from "react";
import { View, StyleSheet } from "react-native";
import { AppInput } from "../ui/AppInput";
import { StatusFilter } from "./StatusFilter";
import type { UserSearchFilters } from "../../lib/users";

type Props = {
  filters: UserSearchFilters;
  onChange: (next: UserSearchFilters) => void;
};

const papelOptions = [
  { value: "todos", label: "Todos" },
  { value: "aluno", label: "Alunos" },
  { value: "professor", label: "Professores" },
  { value: "coordenador", label: "Coordenadores" },
  { value: "administrador", label: "Admins" },
];

const statusOptions = [
  { value: "todos", label: "Todos" },
  { value: "vazio", label: "Vazio" },
  { value: "pendente", label: "Pendente" },
  { value: "aprovado", label: "Aprovado" },
  { value: "rejeitado", label: "Rejeitado" },
];

export function UserFilters({ filters, onChange }: Props) {
  return (
    <View style={styles.container}>
      <AppInput
        label="Buscar"
        placeholder="Nome, email ou telefone"
        value={filters.termo || ""}
        onChangeText={(text) => onChange({ ...filters, termo: text })}
      />
      <StatusFilter
        label="Papel"
        value={filters.papel || "todos"}
        onChange={(value) => onChange({ ...filters, papel: value as any })}
        options={papelOptions}
      />
      <StatusFilter
        label="Status"
        value={filters.status || "todos"}
        onChange={(value) => onChange({ ...filters, status: value as any })}
        options={statusOptions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 12,
  },
});
