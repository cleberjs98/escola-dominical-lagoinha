// app/professor/lesson-complement/[lessonId].tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../../hooks/useAuth";
import { getLessonById, updateLessonComplement } from "../../../lib/lessons";
import type { Lesson } from "../../../types/lesson";

const AUTOSAVE_DELAY = 3000; // ms

export default function LessonComplementScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [complemento, setComplemento] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isProfessorApproved = useMemo(
    () => user?.papel === "professor" && user?.status === "aprovado",
    [user?.papel, user?.status]
  );

  // Guard de acesso e carregamento da aula
  useEffect(() => {
    if (isInitializing) return;

    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }

    if (!isProfessorApproved) {
      Alert.alert(
        "Sem permissão",
        "Apenas professor aprovado pode editar complemento de aula."
      );
      router.replace("/" as any);
      return;
    }

    async function loadLesson() {
      try {
        const data = await getLessonById(lessonId);
        if (!data) {
          Alert.alert("Erro", "Aula não encontrada.");
          router.replace("/" as any);
          return;
        }

        // Verificar se o professor reservado é o usuário logado
        if (data.professor_reservado_id !== firebaseUser.uid) {
          Alert.alert(
            "Sem permissão",
            "Você não é o professor reservado desta aula."
          );
          router.replace("/" as any);
          return;
        }

        setLesson(data);
        setComplemento(data.complemento_professor ?? "");
      } catch (error) {
        console.error("Erro ao carregar aula:", error);
        Alert.alert("Erro", "Não foi possível carregar a aula.");
      } finally {
        setIsLoading(false);
      }
    }

    loadLesson();
  }, [firebaseUser, isInitializing, isProfessorApproved, lessonId, router]);

  // Auto-save com debounce
  useEffect(() => {
    if (!lesson) return;

    // limpar timer anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        await updateLessonComplement(lesson.id, complemento);
        setLastSavedAt(new Date());
      } catch (error) {
        console.error("Erro ao salvar complemento:", error);
        Alert.alert("Erro", "Não foi possível salvar o complemento.");
      } finally {
        setIsSaving(false);
      }
    }, AUTOSAVE_DELAY);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [complemento, lesson]);

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
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Complemento do Professor</Text>
      <Text style={styles.subtitle}>
        Edite o complemento desta aula. A descrição base é apenas leitura.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{lesson.titulo}</Text>
        <Text style={styles.cardLine}>Data da aula: {String(lesson.data_aula)}</Text>
        <Text style={styles.cardLine}>Status: {lesson.status}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Descrição base (leitura)</Text>
        <Text style={styles.baseText}>{lesson.descricao_base}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Complemento do professor</Text>
        <TextInput
          style={styles.textarea}
          value={complemento}
          onChangeText={setComplemento}
          placeholder="Escreva aqui suas observações, anotações ou complementos para esta aula..."
          placeholderTextColor="#6b7280"
          multiline
          textAlignVertical="top"
        />
        <Text style={styles.saveInfo}>
          {isSaving
            ? "Salvando..."
            : lastSavedAt
            ? `Salvo às ${lastSavedAt.toLocaleTimeString()}`
            : "Salvo"}
        </Text>
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
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 12,
  },
  title: {
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 4,
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
  cardLine: {
    color: "#cbd5e1",
    fontSize: 13,
  },
  baseText: {
    color: "#cbd5e1",
    fontSize: 13,
    marginTop: 4,
  },
  textarea: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#e5e7eb",
    backgroundColor: "#020617",
  },
  saveInfo: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 6,
  },
});
