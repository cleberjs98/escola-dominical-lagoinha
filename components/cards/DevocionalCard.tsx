import React from "react";
import { Text, StyleSheet, ViewStyle } from "react-native";
import type { Devotional } from "../../types/devotional";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  devotional: Devotional;
  onPress?: () => void;
  showStatus?: boolean;
  style?: ViewStyle;
};

export function DevocionalCard({
  devotional,
  onPress,
  showStatus = false,
  style,
}: Props) {
  const { themeSettings } = useTheme();
  const textColor = themeSettings?.cor_texto || "#e5e7eb";
  const muted = themeSettings?.cor_texto_secundario || "#94a3b8";

  return (
    <Card style={[styles.card, style]} onPress={onPress}>
      <Text style={[styles.title, { color: textColor }]}>{devotional.titulo}</Text>
      <Text style={[styles.meta, { color: muted }]}>Data: {devotional.data_devocional as any}</Text>
      {showStatus ? (
        <StatusBadge status={devotional.status} variant="devotional" />
      ) : null}
      {devotional.conteudo_base ? (
        <Text numberOfLines={2} style={[styles.preview, { color: muted }]}>
          {devotional.conteudo_base}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    fontSize: 12,
    marginTop: 4,
  },
  preview: {
    fontSize: 12,
    marginTop: 6,
  },
});
