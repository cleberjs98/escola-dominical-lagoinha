import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AppInput } from "../ui/AppInput";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  startDate?: string;
  endDate?: string;
  onChange: (range: { startDate?: string; endDate?: string }) => void;
  label?: string;
};

export function DateRangeFilter({ startDate, endDate, onChange, label }: Props) {
  const { themeSettings } = useTheme();
  const muted = themeSettings?.cor_texto_secundario || "#94a3b8";

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: muted }]}>{label}</Text> : null}
      <View style={styles.row}>
        <View style={styles.col}>
          <AppInput
            label="De (YYYY-MM-DD)"
            value={startDate || ""}
            onChangeText={(text) => onChange({ startDate: text, endDate })}
            placeholder="2025-01-01"
          />
        </View>
        <View style={styles.col}>
          <AppInput
            label="Até (YYYY-MM-DD)"
            value={endDate || ""}
            onChangeText={(text) => onChange({ startDate, endDate: text })}
            placeholder="2025-12-31"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginVertical: 6,
  },
  label: {
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
  },
});
