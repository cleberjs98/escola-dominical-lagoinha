// app/lessons/index.tsx
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
import { listPublishedLessons } from "../../lib/lessons";
import { useAuth } from "../../hooks/useAuth";
import type { Lesson } from "../../types/lesson";

export default function LessonsListScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();

  const [lessons, setLessons] = useState<Lesson[]>([]);
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
        const list = await listPublishedLessons();
        setLessons(list);
      } catch (error) {
        console.error("Erro ao carregar aulas publicadas:", error);
        Alert.alert("Erro", "Não foi possível carregar as aulas.");
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
      <Text style={styles.title}>Aulas publicadas</Text>
      <Text style={styles.subtitle}>
        As aulas mais recentes aparecem no topo.
      </Text>

      {isLoading ? (
        <View style={styles.centerInner}>
          <ActivityIndicator size="large" color="#facc15" />
          <Text style={styles.loadingText}>Buscando aulas publicadas...</Text>
        </View>
      ) : lessons.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Nenhuma aula publicada até o momento.</Text>
        </View>
      ) : (
        lessons.map((lesson) => (
          <Pressable
            key={lesson.id}
            style={styles.card}
            onPress={() => router.push(`/lessons/${lesson.id}` as any)}
          >
            <Text style={styles.cardTitle}>{lesson.titulo}</Text>
            <Text style={styles.cardLine}>Data: {String(lesson.data_aula)}</Text>
            <Text style={styles.cardPreview}>
              {lesson.descricao_base.length > 160
                ? `${lesson.descricao_base.slice(0, 160)}...`
                : lesson.descricao_base}
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
