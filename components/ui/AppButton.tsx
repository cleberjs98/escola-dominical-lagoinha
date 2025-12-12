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
  const secondaryBg = theme.colors.buttons?.secondaryBg || "transparent";
  const secondaryText = theme.colors.buttons?.secondaryText || "#FFFFFF";
  const dangerBg = theme.colors.status?.dangerBg || "#9F1D2D";

  const baseStyle: ViewStyle = {
    backgroundColor:
      variant === "primary"
        ? primaryBg
        : variant === "danger"
        ? dangerBg
        : variant === "secondary"
        ? secondaryBg
        : "transparent",
    borderColor:
      variant === "outline" ? primaryBg : variant === "secondary" ? primaryBg : "transparent",
    borderWidth: variant === "outline" || variant === "secondary" ? 1 : 0,
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
                variant === "primary" || variant === "danger"
                  ? primaryText
                  : variant === "outline"
                  ? primaryBg
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
