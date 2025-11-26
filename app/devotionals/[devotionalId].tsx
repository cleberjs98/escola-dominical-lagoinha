// app/devotionals/[devotionalId].tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../hooks/useAuth";
import { getDevotionalById } from "../../lib/devotionals";
import type { Devotional } from "../../types/devotional";

export default function DevotionalDetailsScreen() {
  const router = useRouter();
  const { devotionalId } = useLocalSearchParams<{ devotionalId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();

  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (user?.status !== "aprovado") {
      router.replace("/auth/pending" as any);
      return;
    }

    async function load() {
      try {
        setIsLoading(true);
        const data = await getDevotionalById(devotionalId);
        if (!data) {
          Alert.alert("Erro", "Devocional não encontrado.");
          router.replace("/devotionals" as any);
          return;
        }
        setDevotional(data);
      } catch (error) {
        console.error("Erro ao carregar devocional:", error);
        Alert.alert("Erro", "Não foi possível carregar o devocional.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [devotionalId, firebaseUser, isInitializing, router, user?.status]);

  if (isInitializing || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando devocional...</Text>
      </View>
    );
  }

  if (!devotional) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Devocional não encontrado.</Text>
        <Pressable style={styles.backButton} onPress={() => router.replace("/devotionals" as any)}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{devotional.titulo}</Text>
      <Text style={styles.subtitle}>Data: {String(devotional.data_devocional)}</Text>
      <Text style={styles.subtitleSmall}>Status: {devotional.status}</Text>

      {devotional.status === "publicado" && (
        <Text style={styles.badge}>Publicado</Text>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Conteúdo</Text>
        <Text style={styles.cardText}>{devotional.conteudo_base}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 24,
    gap: 12,
  },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 12,
  },
  backButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  backButtonText: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  title: {
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 14,
  },
  subtitleSmall: {
    color: "#9ca3af",
    fontSize: 13,
  },
  badge: {
    color: "#22c55e",
    fontWeight: "700",
    fontSize: 13,
  },
  card: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#0b1224",
    gap: 6,
  },
  cardTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
  },
  cardText: {
    color: "#cbd5e1",
    fontSize: 14,
  },
});
