import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import type { User } from "../../types/user";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";
import { AppButton } from "../ui/AppButton";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  user: User;
  onPress?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
  style?: ViewStyle;
};

export function UserCard({
  user,
  onPress,
  onApprove,
  onReject,
  showActions = false,
  style,
}: Props) {
  const { themeSettings } = useTheme();
  const textColor = themeSettings?.cor_texto || "#e5e7eb";
  const muted = themeSettings?.cor_texto_secundario || "#94a3b8";

  return (
    <Card style={[styles.card, style]} onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={[styles.name, { color: textColor }]}>{user.nome || "Usuário"}</Text>
          <Text style={[styles.meta, { color: muted }]}>{user.email}</Text>
          {user.telefone ? (
            <Text style={[styles.meta, { color: muted }]}>Tel: {user.telefone}</Text>
          ) : null}
          <View style={styles.badgesRow}>
            <StatusBadge status={user.status || "vazio"} variant="user" />
            <StatusBadge status={user.papel || "desconhecido"} variant="user" />
          </View>
        </View>
      </View>
      {showActions ? (
        <View style={styles.actions}>
          {onReject ? (
            <AppButton title="Rejeitar" variant="outline" onPress={onReject} fullWidth={false} />
          ) : null}
          {onApprove ? (
            <AppButton title="Aprovar" variant="primary" onPress={onApprove} fullWidth={false} />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
  },
});
