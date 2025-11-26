// app/_layout.tsx
import { Stack, useSegments, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { AuthProvider } from "../contexts/AuthContext";
import { useAuth } from "../hooks/useAuth";

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
      <View style={{ flex: 1, backgroundColor: "#020617" }}>
        <StatusBar style="light" />
        <PendingGuard />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#020617" },
            headerTintColor: "#e5e7eb",
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: "#020617" },
          }}
        />
      </View>
    </AuthProvider>
  );
}
