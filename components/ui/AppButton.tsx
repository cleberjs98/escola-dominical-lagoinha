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
  const primaryBg = theme.colors.buttons?.primaryBg || "#fff";
  const primaryText = theme.colors.buttons?.primaryText || "#2A0E12";
  const secondaryBg = theme.colors.buttons?.secondaryBg || "#3A1118";
  const secondaryText = theme.colors.buttons?.secondaryText || "#fff";
  const dangerBg = theme.colors.status?.dangerBg || "#4A1520";

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
