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
  const { theme, themeSettings, layoutSettings } = useTheme();
  const padding = layoutSettings?.padding_componente ?? 12;
  const radius = layoutSettings?.raio_borda ?? 12;
  const border = withAlpha(theme?.colors?.border || "#3A0E15", 0.35);
  const bg = withAlpha(theme?.colors?.card || themeSettings?.cor_fundo || "#3A1118", 0.7);
  const titleColor = theme?.colors?.text || themeSettings?.cor_texto || "#FFFFFF";
  const subtitleColor = theme?.colors?.muted || "#CFCFCF";

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

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#") && (color.length === 7 || color.length === 9)) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
