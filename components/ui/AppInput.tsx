import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
};

export function AppInput({ label, error, helperText, style, ...rest }: Props) {
  const { theme } = useTheme();
  const corErro = theme.colors.status?.dangerBg || "#9F1D2D";
  const corTexto = theme.colors.text;

  return (
    <View style={{ gap: 4 }}>
      {label ? <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          {
            color: corTexto,
            backgroundColor: theme.colors.inputBg || theme.colors.card,
            borderColor: theme.colors.inputBorder || theme.colors.border || theme.colors.card,
          },
          style,
        ]}
        placeholderTextColor={theme.colors.inputPlaceholder || theme.colors.muted || "#94A3B8"}
        {...rest}
      />
      {helperText ? <Text style={[styles.helper, { color: theme.colors.muted || "#94A3B8" }]}>{helperText}</Text> : null}
      {error ? <Text style={[styles.helper, { color: corErro }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
  },
  helper: {
    color: "#94A3B8",
    fontSize: 12,
  },
});
