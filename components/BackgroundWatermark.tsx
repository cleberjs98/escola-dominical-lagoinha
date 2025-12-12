import React, { ReactNode } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useTheme } from "../hooks/useTheme";

export function BackgroundWatermark({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Image
        source={require("../assets/branding/lagoinha-badge-watermark.png")}
        style={styles.watermark}
        resizeMode="contain"
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  watermark: {
    position: "absolute",
    opacity: 0.05,
    width: "90%",
    height: "90%",
    alignSelf: "center",
    top: "5%",
  },
  content: { flex: 1 },
});
