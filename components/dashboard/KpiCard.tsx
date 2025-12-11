import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  label: string;
  value: number | string;
  icon?: string;
  onPress?: () => void;
  style?: ViewStyle;
};

export function KpiCard({ label, value, icon, onPress, style }: Props) {
  const { themeSettings } = useTheme();
  const bg = themeSettings?.cor_fundo || "#020617";
  const border = themeSettings?.cor_secundaria || "#1f2937";
  const text = themeSettings?.cor_texto || "#e5e7eb";
  const muted = themeSettings?.cor_texto_secundario || "#9ca3af";

  return (
    <Pressable
      style={[
        styles.container,
        { backgroundColor: bg, borderColor: border },
        onPress && styles.clickable,
        style,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.row}>
        <Text style={[styles.label, { color: muted }]} numberOfLines={1}>
          {label}
        </Text>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      </View>
      <Text style={[styles.value, { color: text }]} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 140,
    flex: 1,
  },
  clickable: {
    opacity: 0.95,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
  icon: {
    fontSize: 14,
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },
});
