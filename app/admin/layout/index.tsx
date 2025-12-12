import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";

export default function AdminLayoutScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();

  const isAdmin = user?.papel === "administrador" || user?.papel === "admin";

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (!isAdmin) {
      router.replace("/" as any);
    }
  }, [firebaseUser, isInitializing, isAdmin, router]);

  const bg = theme.colors.background;

  if (isInitializing) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Carregando configurações...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Configurações de Layout / Tema</Text>
      <Text style={styles.subtitle}>
        Tema fixo aplicado com base na identidade visual Lagoinha Ireland. Ajustes de cor agora são feitos via código.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text style={styles.helper}>
          Paleta: bordô profundo, dourado suave, fundos escuros. Para alterar, modifique o ThemeContext e tokens de cor.
        </Text>
        <Text style={styles.helper}>Nenhuma configuração nesta tela altera o tema no momento.</Text>
      </View>

      <Pressable style={[styles.button, styles.buttonPrimary]} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Voltar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 32,
    gap: 12,
  },
  title: {
    color: "#FDF5F6",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "#E0C9CF",
    fontSize: 13,
    marginBottom: 8,
  },
  center: {
    flex: 1,
    backgroundColor: "#130509",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#FDF5F6",
    marginTop: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: "#3B1C24",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#1A0A0F",
    gap: 8,
  },
  sectionTitle: {
    color: "#FDF5F6",
    fontSize: 16,
    fontWeight: "700",
  },
  helper: {
    color: "#B08A94",
    fontSize: 13,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: "#F2C14F",
  },
  buttonText: {
    color: "#26050A",
    fontWeight: "700",
    fontSize: 14,
  },
});
