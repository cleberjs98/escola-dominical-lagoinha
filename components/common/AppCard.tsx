import React from "react";
import { View, Text, TouchableOpacity, ViewStyle, TextStyle } from "react-native";

export type AppCardStatusVariant = "default" | "success" | "info" | "warning" | "muted";

export type AppCardProps = {
  title: string;
  subtitle?: string;
  statusLabel?: string;
  statusVariant?: AppCardStatusVariant;
  style?: ViewStyle;
  onPress?: () => void;
  children?: React.ReactNode;
};

export function AppCard({
  title,
  subtitle,
  statusLabel,
  statusVariant = "default",
  style,
  onPress,
  children,
}: AppCardProps) {
  const Container: React.ComponentType<any> = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      style={[cardStyles.container, style]}
    >
      <Text style={cardStyles.title}>{title}</Text>

      {(subtitle || statusLabel) && (
        <View style={cardStyles.footerRow}>
          {subtitle ? <Text style={cardStyles.subtitle}>{subtitle}</Text> : <View />}

          {statusLabel ? (
            <View style={[cardStyles.statusBadge, mapStatusVariantToStyle(statusVariant)]}>
              <Text style={cardStyles.statusBadgeText}>{statusLabel}</Text>
            </View>
          ) : null}
        </View>
      )}
      {children}
    </Container>
  );
}

function mapStatusVariantToStyle(variant: AppCardStatusVariant): ViewStyle {
  switch (variant) {
    case "success":
      return { backgroundColor: "#22c55e" };
    case "info":
      return { backgroundColor: "#3b82f6" };
    case "warning":
      return { backgroundColor: "#facc15" };
    case "muted":
      return { backgroundColor: "#6b7280" };
    case "default":
    default:
      return { backgroundColor: "#4b5563" };
  }
}

const cardStyles = {
  container: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#020617",
  } as ViewStyle,
  title: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  } as TextStyle,
  footerRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between",
    alignItems: "center",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
  } as TextStyle,
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  } as ViewStyle,
  statusBadgeText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "600",
  } as TextStyle,
};
