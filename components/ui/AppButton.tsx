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
  const { themeSettings } = useTheme();
  const corPrimaria = themeSettings?.cor_primaria || "#22c55e";
  const corErro = themeSettings?.cor_erro || "#ef4444";
  const corTexto = themeSettings?.cor_texto || "#e5e7eb";
  const corFundo = themeSettings?.cor_fundo || "#020617";

  const baseStyle: ViewStyle = {
    backgroundColor:
      variant === "primary"
        ? corPrimaria
        : variant === "danger"
        ? corErro
        : variant === "secondary"
        ? corFundo
        : "transparent",
    borderColor:
      variant === "outline" ? corPrimaria : variant === "secondary" ? "#334155" : "transparent",
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
        <ActivityIndicator color={variant === "secondary" ? corTexto : "#022c22"} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            {
              color:
                variant === "primary" || variant === "danger"
                  ? "#022c22"
                  : variant === "outline"
                  ? corPrimaria
                  : corTexto,
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
