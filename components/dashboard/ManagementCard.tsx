import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  title: string;
  subtitle?: string;
  icon?: string;
  onPress?: () => void;
  style?: ViewStyle;
};

export function ManagementCard({ title, subtitle, icon, onPress, style }: Props) {
  const { themeSettings } = useTheme();
  const bg = themeSettings?.cor_fundo || "#020617";
  const border = themeSettings?.cor_secundaria || "#1f2937";
  const text = themeSettings?.cor_texto || "#e5e7eb";
  const muted = themeSettings?.cor_texto_secundario || "#94a3af";

  return (
    <Pressable
      style={[styles.container, { backgroundColor: bg, borderColor: border }, style]}
      onPress={onPress}
    >
      <View style={styles.iconSlot}>{icon ? <Text style={styles.icon}>{icon}</Text> : null}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: muted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconSlot: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0b1224",
  },
  icon: {
    fontSize: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
