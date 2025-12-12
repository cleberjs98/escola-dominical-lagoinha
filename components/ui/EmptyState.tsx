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
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {title}
      </Text>
      {description ? <Text style={[styles.desc, { color: theme.colors.muted || "#CFCFCF" }]}>{description}</Text> : null}
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
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  desc: {
    fontSize: 12,
  },
});
