import React, { useState } from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import { AppButton } from "../ui/AppButton";
import { AppInput } from "../ui/AppInput";
import { Card } from "../ui/Card";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  visible: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onApprove: () => void;
  onReject: (motivo?: string) => void;
  showReason?: boolean;
};

export function ApprovalModal({
  visible,
  title = "Aprovar usuario",
  description,
  onClose,
  onApprove,
  onReject,
  showReason = true,
}: Props) {
  const [motivo, setMotivo] = useState("");
  const { themeSettings } = useTheme();
  const textColor = themeSettings?.cor_texto || "#e5e7eb";
  const muted = themeSettings?.cor_texto_secundario || "#94a3b8";

  function handleClose() {
    setMotivo("");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Card style={styles.modalCard}>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          {description ? <Text style={[styles.desc, { color: muted }]}>{description}</Text> : null}

          {showReason ? (
            <AppInput
              label="Motivo da rejeição"
              value={motivo}
              onChangeText={setMotivo}
              multiline
              placeholder="Opcional"
            />
          ) : null}

          <View style={styles.actions}>
            <AppButton title="Cancelar" variant="secondary" onPress={handleClose} fullWidth={false} />
            <AppButton title="Rejeitar" variant="outline" onPress={() => onReject(motivo)} fullWidth={false} />
            <AppButton title="Aprovar" variant="primary" onPress={onApprove} fullWidth={false} />
          </View>
        </Card>
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
  modalCard: {
    width: "100%",
    maxWidth: 500,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  desc: {
    fontSize: 13,
    marginBottom: 10,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
});
