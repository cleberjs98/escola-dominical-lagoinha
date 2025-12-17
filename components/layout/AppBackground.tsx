import React, { ReactNode } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  children: ReactNode;
  showWatermark?: boolean;
};

export function AppBackground({ children, showWatermark = true }: Props) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {showWatermark ? (
        <Image
          source={require("../../assets/brand/lagoinha-badge-watermark.png")}
          style={styles.image}
          resizeMode="contain"
          pointerEvents="none"
        />
      ) : null}
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


