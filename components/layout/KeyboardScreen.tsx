import React, { ReactNode, useMemo } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type KeyboardScreenProps = {
  children: ReactNode;
  /** Optional extra offset when the header overlaps content */
  keyboardVerticalOffset?: number;
  /** Enable tap-to-dismiss outside inputs. Default: false to avoid intercepting buttons. */
  enableDismiss?: boolean;
  /** Styles applied to the top-level container (KeyboardAvoidingView). */
  style?: ViewStyle | ViewStyle[];
  /** Styles applied to the ScrollView content. */
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
} & Omit<ScrollViewProps, "contentContainerStyle">;

export function KeyboardScreen({
  children,
  keyboardVerticalOffset = 0,
  enableDismiss = false,
  style,
  contentContainerStyle,
  ...scrollProps
}: KeyboardScreenProps) {
  const insets = useSafeAreaInsets();

  const mergedContentStyle = useMemo(() => {
    const flattened = StyleSheet.flatten(contentContainerStyle) || {};
    const basePaddingBottom = typeof flattened.paddingBottom === "number" ? flattened.paddingBottom : 0;
    const paddingBottom = basePaddingBottom + insets.bottom + 24;
    const paddingTop = typeof flattened.paddingTop === "number" ? flattened.paddingTop : 0;
    const otherStyles = Array.isArray(contentContainerStyle)
      ? contentContainerStyle
      : contentContainerStyle
        ? [contentContainerStyle]
        : [];
    return [...otherStyles, { paddingBottom, paddingTop }];
  }, [contentContainerStyle, insets.bottom]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.select({ ios: "padding", android: "height", default: undefined })}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="always"
        contentContainerStyle={mergedContentStyle}
        {...scrollProps}
      >
        {enableDismiss ? (
          <Pressable style={styles.flex} onPress={Keyboard.dismiss} android_disableSound accessibilityRole="button">
            {children}
          </Pressable>
        ) : (
          children
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
