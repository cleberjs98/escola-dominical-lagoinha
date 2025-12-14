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
  rightElement?: React.ReactNode;
};

export function AppInput({ label, error, helperText, style, rightElement, ...rest }: Props) {
  const { theme } = useTheme();
  const corErro = theme.colors.status?.dangerBg || "#9F1D2D";
  const corTexto = theme.colors.text;

  return (
    <View style={{ gap: 4 }}>
      {label ? <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text> : null}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            {
              color: corTexto,
              backgroundColor: theme.colors.inputBg || theme.colors.card,
              borderColor: theme.colors.inputBorder || theme.colors.border || theme.colors.card,
            },
            rightElement ? styles.withRightElement : null,
            style,
          ]}
          placeholderTextColor={theme.colors.inputPlaceholder || theme.colors.muted || "#94A3B8"}
          {...rest}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </View>
      {helperText ? <Text style={[styles.helper, { color: theme.colors.muted || "#94A3B8" }]}>{helperText}</Text> : null}
      {error ? <Text style={[styles.helper, { color: corErro }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
  },
  withRightElement: {
    paddingRight: 44,
  },
  rightElement: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  helper: {
    color: "#94A3B8",
    fontSize: 12,
  },
});
