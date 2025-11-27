import React from "react";
import { View, Text, StyleSheet, TextInput, ViewStyle } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { AppButton } from "../ui/AppButton";

type Props = {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  minHeight?: number;
  style?: ViewStyle;
};

/**
 * Editor simples baseado em TextInput multiline.
 * Futuramente pode ser substituído por um editor rico/markdown.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 140,
  style,
}: Props) {
  const { themeSettings } = useTheme();
  const textColor = themeSettings?.cor_texto || "#e5e7eb";
  const border = themeSettings?.cor_secundaria || "#1f2937";
  const bg = themeSettings?.cor_fundo || "#0b1224";

  function append(tag: string) {
    onChange(`${value}${value ? "\n" : ""}${tag}`);
  }

  return (
    <View style={style}>
      <View style={styles.toolbar}>
        <AppButton
          title="Negrito"
          variant="outline"
          onPress={() => append("**texto**")}
          fullWidth={false}
        />
        <AppButton
          title="Itálico"
          variant="outline"
          onPress={() => append("_texto_")}
          fullWidth={false}
        />
        <AppButton
          title="Lista"
          variant="outline"
          onPress={() => append("- item")}
          fullWidth={false}
        />
      </View>
      <TextInput
        multiline
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        style={[
          styles.input,
          {
            minHeight,
            color: textColor,
            borderColor: border,
            backgroundColor: bg,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
  },
});
