import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  label?: string;
};

export function Loading({ label = "Carregando..." }: Props) {
  const { themeSettings } = useTheme();
  const color = themeSettings?.cor_primaria ?? "#facc15";
  const textColor = themeSettings?.cor_texto ?? "#e5e7eb";

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
