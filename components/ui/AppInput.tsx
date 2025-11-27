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
  const { themeSettings } = useTheme();
  const corErro = themeSettings?.cor_erro || "#ef4444";
  const corTexto = themeSettings?.cor_texto || "#e5e7eb";
  const corFundo = themeSettings?.cor_fundo || "#020617";

  return (
    <View style={{ gap: 4 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          { color: corTexto, backgroundColor: "#0f172a", borderColor: "#1f2937" },
          style,
        ]}
        placeholderTextColor="#6b7280"
        {...rest}
      />
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      {error ? <Text style={[styles.helper, { color: corErro }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: "#9ca3af",
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
  },
  helper: {
    color: "#9ca3af",
    fontSize: 12,
  },
});
