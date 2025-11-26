// app/lessons/[lessonId].tsx
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
import { doc, getDoc } from "firebase/firestore";

import { useAuth } from "../../hooks/useAuth";
import { firebaseDb } from "../../lib/firebase";
import { getLessonById } from "../../lib/lessons";
import type { Lesson } from "../../types/lesson";
import type { User } from "../../types/user";

export default function LessonDetailsScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [professor, setProfessor] = useState<User | null>(null);

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
        const data = await getLessonById(lessonId);
        if (!data) {
          Alert.alert("Erro", "Aula não encontrada.");
          router.replace("/lessons" as any);
          return;
        }
        setLesson(data);

        if (data.professor_reservado_id) {
          const profRef = doc(firebaseDb, "users", data.professor_reservado_id);
          const profSnap = await getDoc(profRef);
          if (profSnap.exists()) {
            setProfessor(profSnap.data() as User);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar aula:", error);
        Alert.alert("Erro", "Não foi possível carregar a aula.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [firebaseUser, isInitializing, lessonId, router, user?.status]);

  if (isInitializing || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando aula...</Text>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Aula não encontrada.</Text>
        <Pressable style={styles.backButton} onPress={() => router.replace("/lessons" as any)}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const professorNome =
    professor?.nome || professor?.email || lesson.professor_reservado_id || "Professor não definido";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{lesson.titulo}</Text>
      <Text style={styles.subtitle}>Data da aula: {String(lesson.data_aula)}</Text>
      <Text style={styles.subtitleSmall}>Status: {lesson.status}</Text>

      {lesson.professor_reservado_id && (
        <Text style={styles.subtitleSmall}>Professor: {professorNome}</Text>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Descrição base</Text>
        <Text style={styles.cardText}>{lesson.descricao_base}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Complemento do professor</Text>
        {lesson.complemento_professor ? (
          <Text style={styles.cardText}>{lesson.complemento_professor}</Text>
        ) : (
          <Text style={styles.cardTextMuted}>
            O professor ainda não adicionou complementos para esta aula.
          </Text>
        )}
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
  cardTextMuted: {
    color: "#94a3b8",
    fontSize: 13,
  },
});
