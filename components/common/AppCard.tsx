import React from "react";
import { View, Text, TouchableOpacity, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "../../hooks/useTheme";

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
  const { theme } = useTheme();
  const Container: React.ComponentType<any> = onPress ? TouchableOpacity : View;
  const backgroundColor = theme?.colors?.card || "#3A1118";
  const titleColor = theme?.colors?.text || "#FFFFFF";
  const subtitleColor = theme?.colors?.muted || "#CFCFCF";

  return (
    <Container
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      style={[cardStyles.container, { backgroundColor }, style]}
    >
      <Text style={[cardStyles.title, { color: titleColor }]}>{title}</Text>

      {(subtitle || statusLabel) && (
        <View style={cardStyles.footerRow}>
          {subtitle ? <Text style={[cardStyles.subtitle, { color: subtitleColor }]}>{subtitle}</Text> : <View />}

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
      return { backgroundColor: "#FFFFFF", borderColor: "#2A0E12", borderWidth: 1 };
    case "info":
      return { backgroundColor: "rgba(255,255,255,0.12)" };
    case "warning":
      return { backgroundColor: "#45141D" };
    case "muted":
      return { backgroundColor: "rgba(255,255,255,0.08)" };
    case "default":
    default:
      return { backgroundColor: "rgba(255,255,255,0.08)" };
  }
}

const cardStyles = {
  container: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#1A0A0F",
    borderWidth: 1,
    borderColor: "#3B1C24",
  } as ViewStyle,
  title: {
    color: "#FDF5F6",
    fontSize: 16,
    fontWeight: "700",
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
    color: "#FDF5F6",
    fontSize: 12,
    fontWeight: "600",
  } as TextStyle,
};
