import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  status: string;
  variant?: "user" | "lesson" | "devotional" | "reservation" | "news";
};

export function StatusBadge({ status, variant }: Props) {
  const { themeSettings } = useTheme();
  const corSucesso = themeSettings?.cor_sucesso || "#22c55e";
  const corErro = themeSettings?.cor_erro || "#ef4444";
  const corAviso = themeSettings?.cor_aviso || "#f59e0b";
  const corInfo = themeSettings?.cor_info || "#38bdf8";

  function getColor() {
    const s = status.toLowerCase();
    if (["aprovado", "publicada", "aprovada", "ativa"].includes(s)) return corSucesso;
    if (["rejeitado", "rejeitada", "erro"].includes(s)) return corErro;
    if (["pendente", "pendente de aprovação", "disponivel"].includes(s)) return corAviso;
    return corInfo;
  }

  const color = getColor();

  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: color + "22" }]}>
      <Text style={[styles.text, { color }]}>{status}</Text>
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
