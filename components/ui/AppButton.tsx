import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";

type Variant = "primary" | "secondary" | "outline" | "danger";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export function AppButton({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}: Props) {
  const { theme } = useTheme();
  const primaryBg = theme.colors.buttons?.primaryBg || "#7A1422";
  const primaryText = theme.colors.buttons?.primaryText || "#FFFFFF";
  const secondaryBg = primaryBg;
  const secondaryText = primaryText;
  const dangerBg = theme.colors.status?.dangerBg || "#9F1D2D";
  const dangerText = theme.colors.status?.dangerText || "#FFFFFF";

  const baseStyle: ViewStyle = {
    backgroundColor:
      variant === "primary"
        ? primaryBg
        : variant === "danger"
        ? dangerBg
        : variant === "secondary"
        ? secondaryBg
        : primaryBg,
    borderColor: variant === "outline" ? primaryBg : "transparent",
    borderWidth: variant === "outline" ? 1 : 0,
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? "100%" : undefined,
  };

  return (
    <Pressable
      style={[styles.button, baseStyle, style]}
      disabled={disabled || loading}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? secondaryText : primaryText} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            {
              color:
                variant === "primary" || variant === "danger" || variant === "outline"
                  ? variant === "danger"
                    ? dangerText
                    : primaryText
                  : secondaryText,
            },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 14,
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
