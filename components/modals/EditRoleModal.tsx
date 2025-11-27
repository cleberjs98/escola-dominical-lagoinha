import React, { useState } from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import type { User } from "../../types/user";
import { AppButton } from "../ui/AppButton";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  visible: boolean;
  user: User;
  onClose: () => void;
  onSave: (newRole: User["papel"]) => void;
};

const ROLES: Array<{ value: User["papel"]; label: string }> = [
  { value: "aluno", label: "Aluno" },
  { value: "professor", label: "Professor" },
  { value: "coordenador", label: "Coordenador" },
  { value: "administrador", label: "Administrador" },
];

export function EditRoleModal({ visible, user, onClose, onSave }: Props) {
  const [role, setRole] = useState<User["papel"]>(user?.papel || "aluno");
  const { themeSettings } = useTheme();
  const textColor = themeSettings?.cor_texto || "#e5e7eb";

  const isSelected = (val: User["papel"]) => role === val;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={[styles.title, { color: textColor }]}>Alterar papel</Text>
          <Text style={[styles.subtitle, { color: themeSettings?.cor_texto_secundario || "#94a3b8" }]}>
            Usuário: {user?.nome || user?.email}
          </Text>

          <View style={styles.options}>
            {ROLES.map((r) => (
              <AppButton
                key={r.value}
                title={r.label}
                variant={isSelected(r.value) ? "primary" : "secondary"}
                onPress={() => setRole(r.value)}
                fullWidth={false}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <AppButton title="Cancelar" variant="outline" onPress={onClose} fullWidth={false} />
            <AppButton title="Salvar" variant="primary" onPress={() => onSave(role)} fullWidth={false} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#0b1224",
    borderRadius: 14,
    padding: 16,
    width: "100%",
    maxWidth: 480,
    borderWidth: 1,
    borderColor: "#1f2937",
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
