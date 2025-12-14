import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  title: string;
  subtitle?: string;
  icon?: string;
  onPress?: () => void;
  style?: ViewStyle;
};

export function ManagementCard({ title, subtitle, icon, onPress, style }: Props) {
  const { theme } = useTheme();
  const bg = theme.colors.card;
  const border = theme.colors.border || theme.colors.card;
  const text = theme.colors.text;
  const muted = theme.colors.muted || theme.colors.textSecondary || theme.colors.text;

  return (
    <Pressable style={[styles.container, { backgroundColor: bg, borderColor: border }, style]} onPress={onPress}>
      <View style={styles.iconSlot}>
        {icon ? <MaterialCommunityIcons name={icon as any} size={18} color={text} /> : null}
      </View>
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
    backgroundColor: "rgba(255,255,255,0.08)",
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
