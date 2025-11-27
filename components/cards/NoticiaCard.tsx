import React from "react";
import { Text, StyleSheet, ViewStyle } from "react-native";
import type { News } from "../../types/news";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  news: News;
  onPress?: () => void;
  showStatus?: boolean;
  style?: ViewStyle;
};

export function NoticiaCard({ news, onPress, showStatus = false, style }: Props) {
  const { themeSettings } = useTheme();
  const textColor = themeSettings?.cor_texto || "#e5e7eb";
  const muted = themeSettings?.cor_texto_secundario || "#94a3b8";

  return (
    <Card style={[styles.card, style]} onPress={onPress}>
      <Text style={[styles.title, { color: textColor }]}>{news.titulo}</Text>
      <Text style={[styles.meta, { color: muted }]}>
        Publicado em: {(news.publicado_em as any) || "—"}
      </Text>
      {showStatus ? <StatusBadge status={news.status} variant="news" /> : null}
      {news.conteudo ? (
        <Text numberOfLines={2} style={[styles.preview, { color: muted }]}>
          {news.conteudo}
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
