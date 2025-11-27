import React, { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  onPress?: () => void;
  footer?: ReactNode;
  style?: ViewStyle;
};

export function Card({ title, subtitle, children, onPress, footer, style }: Props) {
  const { themeSettings, layoutSettings } = useTheme();
  const padding = layoutSettings?.padding_componente ?? 12;
  const radius = layoutSettings?.raio_borda ?? 12;
  const border = "#1f2937";
  const bg = "#0b1224";
  const titleColor = themeSettings?.cor_texto ?? "#e5e7eb";
  const subtitleColor = "#9ca3af";

  const content = (
    <View
      style={[
        styles.card,
        {
          padding,
          borderRadius: radius,
          borderColor: border,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      {title ? <Text style={[styles.title, { color: titleColor }]}>{title}</Text> : null}
      {subtitle ? (
        <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
      ) : null}
      <View style={{ gap: 8 }}>{children}</View>
      {footer ? <View style={{ marginTop: 8 }}>{footer}</View> : null}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 6,
  },
});
