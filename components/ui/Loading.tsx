import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  label?: string;
};

export function Loading({ label = "Carregando..." }: Props) {
  const { theme } = useTheme();
  const color = theme.colors.accent;
  const textColor = theme.colors.text;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={color} />
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  label: {
    marginTop: 8,
    fontSize: 14,
  },
});
