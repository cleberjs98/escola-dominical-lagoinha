import React, { ReactNode } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  children: ReactNode;
};

export function AppBackground({ children }: Props) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Image
        source={require("../../assets/brand/lagoinha-badge-watermark.png")}
        style={styles.image}
        resizeMode="contain"
        pointerEvents="none"
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    alignSelf: "center",
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    backgroundColor: "transparent",
  },
});


