import React from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { withAlpha } from "../../theme/utils";
import { StatusBadge } from "./StatusBadge";

type Props = {
  title?: string;
  subtitle?: string;
  statusLabel?: string;
  statusVariant?: "success" | "info" | "warning" | "muted" | "danger" | "lesson" | "devotional";
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export const AppCard: React.FC<Props> = ({
  title,
  subtitle,
  statusLabel,
  statusVariant = "info",
  children,
  style,
  contentStyle,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: withAlpha(theme.colors.card, 0.8),
          borderColor: withAlpha(theme.colors.border || theme.colors.card, 0.45),
        },
        style,
      ]}
    >
      {(title || subtitle || statusLabel) && (
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {title ? <Text style={[styles.title, { color: "#FFFFFF" }]}>{title}</Text> : null}
            {subtitle ? (
              <Text style={[styles.subtitle, { color: withAlpha("#FFFFFF", 0.85) }]}>{subtitle}</Text>
            ) : null}
          </View>
          {statusLabel ? <StatusBadge status={statusLabel} variant={statusVariant} /> : null}
        </View>
      )}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    marginTop: 4,
  },
});
