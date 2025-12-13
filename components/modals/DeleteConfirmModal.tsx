import React from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import { AppButton } from "../ui/AppButton";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmModal({
  visible,
  title = "Confirmar exclusão",
  message = "Tem certeza que deseja excluir este item?",
  onClose,
  onConfirm,
}: Props) {
  const { themeSettings } = useTheme();
  const textColor = themeSettings?.cor_texto || "#e5e7eb";
  const muted = themeSettings?.cor_texto_secundario || "#94a3b8";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          <Text style={[styles.message, { color: muted }]}>{message}</Text>
          <View style={styles.actions}>
            <AppButton title="Cancelar" variant="secondary" onPress={onClose} fullWidth={false} />
            <AppButton title="Deletar" variant="danger" onPress={onConfirm} fullWidth={false} />
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
    backgroundColor: "#2A0E12",
    borderRadius: 14,
    padding: 16,
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderColor: "#1f2937",
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  message: {
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});

