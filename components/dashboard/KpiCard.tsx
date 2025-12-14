import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  label: string;
  value: number | string;
  icon?: string;
  onPress?: () => void;
  style?: ViewStyle;
};

export function KpiCard({ label, value, icon, onPress, style }: Props) {
  const { theme } = useTheme();
  const bg = withAlpha(theme.colors.card, 0.7);
  const border = withAlpha(theme.colors.border || theme.colors.card, 0.35);
  const text = theme.colors.text;
  const muted = theme.colors.muted || theme.colors.textSecondary || theme.colors.text;

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
        {icon ? <MaterialCommunityIcons name={icon as any} size={16} color={muted} /> : null}
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
    backgroundColor: "transparent",
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
  value: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },
});

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#") && (color.length === 7 || color.length === 9)) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
