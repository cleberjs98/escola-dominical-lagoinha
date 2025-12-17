// app/_layout.tsx
import { Stack, useSegments, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useTheme } from "../hooks/useTheme";
import { AppBackground } from "../components/layout/AppBackground";
import { firebaseAuth } from "../lib/firebase";

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
        <SafeAreaProvider>
          <RootLayoutContent />
        </SafeAreaProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

function RootLayoutContent() {
  const { theme } = useTheme();
  const bg = theme.colors.background;
  const textColor = theme.colors.text;

   // Debug temporário para checar claims no Web
   useEffect(() => {
     if (typeof window === "undefined") return;

     (window as any).firebaseAuth = firebaseAuth;

     const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
       if (!user) {
         console.log("[Auth][Debug] Nenhum usuário logado (web)");
         return;
       }
       try {
         const token = await user.getIdTokenResult(true);
         console.log("[Auth][Debug] Claims:", token.claims);
       } catch (err) {
         console.error("[Auth][Debug] Erro ao obter claims", err);
       }
     });

     return () => unsubscribe();
   }, []);

  return (
    <AppBackground>
      <View style={{ flex: 1, backgroundColor: bg }}>
        <StatusBar style="light" />
        <PendingGuard />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </View>
    </AppBackground>
  );
}
