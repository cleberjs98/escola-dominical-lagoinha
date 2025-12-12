import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  status: string;
};

export function StatusBadge({ status }: Props) {
  const { theme } = useTheme();
  const statusColors = theme.colors.status;

  function getPalette() {
    const s = status.toLowerCase();
    if (["aprovado", "publicada", "publicado", "aprovada", "ativa"].includes(s)) {
      return { bg: statusColors?.successBg, text: statusColors?.successText };
    }
    if (["rejeitado", "rejeitada", "erro"].includes(s)) {
      return { bg: statusColors?.dangerBg, text: statusColors?.dangerText };
    }
    if (["pendente", "pendente de aprovacao", "disponivel", "rascunho"].includes(s)) {
      return { bg: statusColors?.warningBg, text: statusColors?.warningText };
    }
    return { bg: statusColors?.infoBg, text: statusColors?.infoText };
  }

  const palette = getPalette();

  return (
    <View style={[styles.badge, { borderColor: theme.colors.border, backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.text || theme.colors.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
});
