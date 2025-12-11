import React from "react";
import { View, StyleSheet } from "react-native";
import { AppCard, AppCardStatusVariant } from "../common/AppCard";

type DevotionalListItemProps = {
  title: string;
  subtitle: string;
  statusLabel: string;
  statusVariant: AppCardStatusVariant;
  onPress?: () => void;
  children?: React.ReactNode;
};

export function DevotionalListItem({
  title,
  subtitle,
  statusLabel,
  statusVariant,
  onPress,
  children,
}: DevotionalListItemProps) {
  return (
    <AppCard
      title={title}
      subtitle={subtitle}
      statusLabel={statusLabel}
      statusVariant={statusVariant}
      onPress={onPress}
      style={styles.card}
    >
      {children ? <View style={styles.actions}>{children}</View> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#0b1224",
  },
  actions: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
