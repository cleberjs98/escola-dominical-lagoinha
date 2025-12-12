// app/_layout.tsx
import { Stack, useSegments, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { AppBackground } from "../components/layout/AppBackground";

function PendingGuard() {
  const { isAuthenticated, isPending, isInitializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const isPendingRoute =
    segments.length >= 2 && segments[0] === "auth" && segments[1] === "pending";

  useEffect(() => {
    if (isInitializing) return;

    if (isAuthenticated && isPending && !isPendingRoute) {
      router.replace("/auth/pending");
      return;
    }

    if (isAuthenticated && !isPending && isPendingRoute) {
      router.replace("/");
    }
  }, [isAuthenticated, isPending, isPendingRoute, isInitializing, router]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

function RootLayoutContent() {
  const { theme } = useTheme();
  const bg = theme.colors.background;
  const textColor = theme.colors.text;

  return (
    <AppBackground>
      <View style={{ flex: 1, backgroundColor: bg }}>
        <StatusBar style="light" />
        <PendingGuard />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.card },
            headerTintColor: textColor,
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </View>
    </AppBackground>
  );
}
