import React from "react";
import { View, Text, StyleSheet, Pressable, ViewStyle } from "react-native";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  title: string;
  description?: string;
  actionLabel?: string;
  onPressAction?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function DashboardSection({
  title,
  description,
  actionLabel,
  onPressAction,
  children,
  style,
}: Props) {
  const { theme } = useTheme();
  const border = theme.colors.border || theme.colors.card;
  const text = theme.colors.text;
  const muted = theme.colors.muted || theme.colors.textSecondary || theme.colors.text;

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: withAlpha(border, 0.35),
          backgroundColor: withAlpha(theme.colors.card, 0.7),
        },
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: text }]}>{title}</Text>
          {description ? <Text style={[styles.description, { color: muted }]}>{description}</Text> : null}
        </View>
        {actionLabel && onPressAction ? (
          <Pressable style={styles.action} onPress={onPressAction}>
            <Text style={[styles.actionText, { color: text }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
  action: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    gap: 10,
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
