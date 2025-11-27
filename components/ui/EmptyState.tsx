import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "./AppButton";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  title: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function EmptyState({ title, description, actionLabel, onActionPress }: Props) {
  const { themeSettings } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: themeSettings?.cor_texto || "#e5e7eb" }]}>
        {title}
      </Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {actionLabel && onActionPress ? (
        <AppButton
          title={actionLabel}
          onPress={onActionPress}
          variant="outline"
          fullWidth={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 14,
    gap: 6,
    backgroundColor: "#0b1224",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  desc: {
    color: "#9ca3af",
    fontSize: 12,
  },
});
