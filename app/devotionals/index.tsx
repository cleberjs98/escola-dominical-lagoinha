// app/devotionals/index.tsx
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
import { useRouter } from "expo-router";

import { useAuth } from "../../hooks/useAuth";
import { listPublishedDevotionals } from "../../lib/devotionals";
import type { Devotional } from "../../types/devotional";

export default function DevotionalsListScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();

  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
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
        const list = await listPublishedDevotionals();
        setDevotionals(list);
      } catch (error) {
        console.error("Erro ao carregar devocionais:", error);
        Alert.alert("Erro", "Não foi possível carregar os devocionais.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [firebaseUser, isInitializing, router, user?.status]);

  if (isInitializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Devocionais publicados</Text>
      <Text style={styles.subtitle}>
        Veja os devocionais mais recentes.
      </Text>

      {isLoading ? (
        <View style={styles.centerInner}>
          <ActivityIndicator size="large" color="#facc15" />
          <Text style={styles.loadingText}>Buscando devocionais...</Text>
        </View>
      ) : devotionals.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Nenhum devocional publicado ainda.</Text>
        </View>
      ) : (
        devotionals.map((dev) => (
          <Pressable
            key={dev.id}
            style={styles.card}
            onPress={() => router.push(`/devotionals/${dev.id}` as any)}
          >
            <Text style={styles.cardTitle}>{dev.titulo}</Text>
            <Text style={styles.cardLine}>Data: {String(dev.data_devocional)}</Text>
            <Text style={styles.cardPreview}>
              {dev.conteudo_base.length > 160
                ? `${dev.conteudo_base.slice(0, 160)}...`
                : dev.conteudo_base}
            </Text>
          </Pressable>
        ))
      )}
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
  title: {
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 8,
  },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
  },
  centerInner: {
    alignItems: "center",
    marginTop: 12,
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 12,
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 16,
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 13,
  },
  card: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#0b1224",
    gap: 6,
  },
  cardTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
  },
  cardLine: {
    color: "#cbd5e1",
    fontSize: 13,
  },
  cardPreview: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 4,
  },
});
