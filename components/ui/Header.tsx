import React, { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  title: string;
  subtitle?: string;
  rightContent?: ReactNode;
};

export function Header({ title, subtitle, rightContent }: Props) {
  const { theme } = useTheme();
  const color = theme.colors.text;
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.muted || "#CFCFCF" }]}>{subtitle}</Text> : null}
      </View>
      {rightContent ? rightContent : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
  },
});
