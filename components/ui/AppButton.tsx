import React, { type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
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
  stopPropagation?: boolean;
  leftIcon?: ReactNode;
};

export function AppButton({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  stopPropagation = false,
  leftIcon,
}: Props) {
  const { theme } = useTheme();
  const primaryBg = theme.colors.buttons?.primaryBg || "#7A1422";
  const primaryText = theme.colors.buttons?.primaryText || "#FFFFFF";
  const secondaryBg = primaryBg;
  const secondaryText = primaryText;
  const dangerBg = theme.colors.status?.dangerBg || "#9F1D2D";
  const dangerText = theme.colors.status?.dangerText || "#FFFFFF";

  const contentColor =
    variant === "primary" || variant === "danger" || variant === "outline"
      ? variant === "danger"
        ? dangerText
        : primaryText
      : secondaryText;

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

  const handlePress = (event: any) => {
    if (stopPropagation && event?.stopPropagation) {
      event.stopPropagation();
    }
    onPress();
  };

  return (
    <Pressable
      style={[styles.button, baseStyle, style]}
      disabled={disabled || loading}
      onPress={handlePress}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? secondaryText : primaryText} />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon ? <View style={styles.iconWrapper}>{leftIcon}</View> : null}
          <Text style={[styles.buttonText, { color: contentColor }]}>{title}</Text>
        </View>
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
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 14,
  },
});
