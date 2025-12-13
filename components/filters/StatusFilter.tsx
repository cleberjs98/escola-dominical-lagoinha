import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "../../hooks/useTheme";

type Option = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  label?: string;
};

export function StatusFilter({ value, onChange, options, label }: Props) {
  const { theme } = useTheme();
  const text = theme.colors.text;
  const muted = theme.colors.muted || theme.colors.textSecondary || theme.colors.text;
  const primary = theme.colors.primary;

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: muted }]}>{label}</Text> : null}
      <View style={styles.row}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
          <Pressable
            key={opt.value}
            style={[
              styles.chip,
              {
                borderColor: active ? primary : theme.colors.border || primary,
                backgroundColor: active ? `${primary}22` : theme.colors.card,
              },
            ]}
            onPress={() => onChange(opt.value)}
          >
              <Text style={{ color: active ? text : muted, fontWeight: active ? "700" : "500" }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    marginVertical: 6,
  },
  label: {
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
});
