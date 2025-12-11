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
  const { themeSettings } = useTheme();
  const border = themeSettings?.cor_secundaria || "#1f2937";
  const text = themeSettings?.cor_texto || "#e5e7eb";
  const muted = themeSettings?.cor_texto_secundario || "#9ca3af";

  return (
    <View style={[styles.container, { borderColor: border }, style]}>
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
    backgroundColor: "#0b1224",
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
    borderColor: "#1f2937",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    gap: 10,
  },
});
