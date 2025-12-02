import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import type { Lesson } from "../../types/lesson";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";
import { useTheme } from "../../hooks/useTheme";
import { formatTimestamp } from "../../utils/date";

type Props = {
  lesson: Lesson;
  onPress?: () => void;
  showStatus?: boolean;
  style?: ViewStyle;
};

export function AulaCard({ lesson, onPress, showStatus = true, style }: Props) {
  const { themeSettings } = useTheme();
  const textColor = themeSettings?.cor_texto || "#e5e7eb";
  const muted = themeSettings?.cor_texto_secundario || "#94a3b8";

  return (
    <Card style={[styles.card, style]} onPress={onPress}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textColor }]}>{lesson.titulo}</Text>
        {showStatus ? <StatusBadge status={lesson.status} variant="lesson" /> : null}
      </View>
      <Text style={[styles.meta, { color: muted }]}>
        Data: {formatTimestamp((lesson as any).data_aula)}
      </Text>
      {lesson.professor_reservado_id ? (
        <Text style={[styles.meta, { color: muted }]}>
          Professor reservado: {lesson.professor_reservado_id}
        </Text>
      ) : null}
      {lesson.descricao_base ? (
        <Text numberOfLines={2} style={[styles.preview, { color: muted }]}>
          {lesson.descricao_base}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
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
