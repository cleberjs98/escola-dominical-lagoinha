// app/professor/lesson-complement/[lessonId].tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  ImageBackground,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../../hooks/useAuth";
import { getLessonById, updateLessonFields } from "../../../lib/lessons";
import type { Lesson } from "../../../types/lesson";
import { AppBackground } from "../../../components/layout/AppBackground";
import { useTheme } from "../../../hooks/useTheme";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { formatDateTime } from "../../../utils/publishAt";
import type { AppTheme } from "../../../theme/tokens";

const AUTOSAVE_DELAY = 3000; // ms

export default function LessonComplementScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
  const isAdminOrCoordinator = useMemo(
    () => user?.papel === "administrador" || user?.papel === "admin" || user?.papel === "coordenador",
    [user?.papel]
  );

  const formatLessonDate = (value: any): string => {
    if (!value) return "-";
    if (typeof value === "object" && typeof value.toDate === "function") {
      return formatDateTime(value.toDate());
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return formatDateTime(parsed);
    return String(value);
  };

  const runSave = useCallback(async (shouldRedirect = false) => {
    if (!lesson) return;

    try {
      setIsSaving(true);
      await updateLessonFields(lesson.id, { complemento_professor: complemento });
      setLastSavedAt(new Date());
      if (shouldRedirect) {
        router.push(`/lessons/${lesson.id}` as any);
      }
    } catch (error) {
      console.error("Erro ao salvar complemento:", error);
      Alert.alert("Erro", "Nao foi possivel salvar o complemento.");
    } finally {
      setIsSaving(false);
    }
  }, [complemento, lesson, router]);

  useEffect(() => {
    if (isInitializing) return;

    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }

    const allowed = isProfessorApproved || isAdminOrCoordinator;
    if (!allowed) {
      Alert.alert(
        "Sem permissao",
        "Apenas professor aprovado, administrador ou coordenador podem editar complemento de aula."
      );
      router.replace("/" as any);
      return;
    }

    async function loadLesson() {
      try {
        const data = await getLessonById(lessonId);
        if (!data) {
          Alert.alert("Erro", "Aula nao encontrada.");
          router.replace("/" as any);
          return;
        }

        if (!isAdminOrCoordinator && data.professor_reservado_id !== firebaseUser.uid) {
          Alert.alert(
            "Sem permissao",
            "Voce nao eh o professor reservado desta aula."
          );
          router.replace("/" as any);
          return;
        }

        setLesson(data);
        setComplemento(data.complemento_professor ?? "");
      } catch (error) {
        console.error("Erro ao carregar aula:", error);
        Alert.alert("Erro", "Nao foi possivel carregar a aula.");
      } finally {
        setIsLoading(false);
      }
    }

    loadLesson();
  }, [firebaseUser, isAdminOrCoordinator, isInitializing, isProfessorApproved, lessonId, router]);

  useEffect(() => {
    if (!lesson) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      runSave(false);
    }, AUTOSAVE_DELAY);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [complemento, lesson]);

  if (isInitializing || isLoading) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.textPrimary} />
          <Text style={styles.loadingText}>Carregando aula...</Text>
        </View>
      </AppBackground>
    );
  }

  if (!lesson) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Aula nao encontrada.</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ImageBackground
        source={require("../../../assets/brand/lagoinha-badge-watermark.png")}
        style={styles.bgImage}
        imageStyle={styles.bgImageStyle}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Conteúdo</Text>
          <Text style={styles.subtitle}>Edite o complemento desta aula.</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{lesson.titulo}</Text>
            <Text style={styles.cardLine}>Data da aula: {formatLessonDate(lesson.data_aula)}</Text>
            <View style={styles.badgeRow}>
              <Text style={styles.cardLine}>Status: </Text>
              <StatusBadge status={lesson.status} variant="lesson" />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Descricao base (leitura)</Text>
            <Text style={styles.baseText}>{lesson.descricao_base}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Conteúdo</Text>
            <TextInput
              style={styles.textarea}
              value={complemento}
              onChangeText={setComplemento}
              placeholder="Escreva aqui suas observacoes, anotacoes ou complementos para esta aula..."
              placeholderTextColor={theme.colors.textMuted}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={async () => {
                  if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                  }
                  await runSave(true);
                }}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>{isSaving ? "Salvando..." : "Publicar"}</Text>
              </TouchableOpacity>

              <Text style={styles.saveInfo}>
                {isSaving
                  ? "Salvando..."
                  : lastSavedAt
                  ? `Salvo às ${lastSavedAt.toLocaleTimeString()}`
                  : "Salvo"}
              </Text>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </AppBackground>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "transparent",
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 24,
      gap: 12,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      color: theme.colors.textSecondary,
      marginTop: 12,
    },
    title: {
      color: "#FFFFFF",
      fontSize: 22,
      fontWeight: "700",
    },
    subtitle: {
      color: "#F1F5F9",
      fontSize: 13,
      marginBottom: 4,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 12,
      backgroundColor: theme.colors.card,
      gap: 6,
    },
    cardTitle: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
    },
    cardLine: {
      color: "#E2E8F0",
      fontSize: 13,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    baseText: {
      color: "#E2E8F0",
      fontSize: 13,
      marginTop: 4,
    },
    textarea: {
      minHeight: 200,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: "#FFFFFF",
      backgroundColor: theme.colors.inputBg,
    },
    actionsRow: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "700",
    },
    saveInfo: {
      color: "#E2E8F0",
      fontSize: 12,
      marginTop: 2,
    },
    bgImage: {
      flex: 1,
    },
    bgImageStyle: {
      opacity: 0.05,
      resizeMode: "cover",
    },
  });
}
