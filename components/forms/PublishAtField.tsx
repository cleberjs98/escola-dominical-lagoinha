// Campo reutilizável de agendamento (publish_at) para criar/editar aulas.
import { View, StyleSheet, Text, Pressable } from "react-native";

import { AppInput } from "../ui/AppInput";
import { maskPublishAtInput } from "../../utils/publishAt";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
};

export function PublishAtField({
  value,
  onChange,
  label = "Publicar automaticamente em (opcional)",
  placeholder = "dd/mm/aaaa hh:mm",
  helperText,
  error,
}: Props) {
  const { themeSettings } = useTheme();

  return (
    <View style={{ gap: 8 }}>
      <AppInput
        label={label}
        placeholder={placeholder}
        value={value}
        keyboardType="number-pad"
        onChangeText={(text) => onChange(maskPublishAtInput(text))}
        helperText={helperText}
        error={error}
      />
      {value.trim() ? (
        <Pressable style={styles.clearButton} onPress={() => onChange("")}>
          <Text style={[styles.clearText, { color: themeSettings?.cor_texto || "#e5e7eb" }]}>
            Limpar agendamento
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clearButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  clearText: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
