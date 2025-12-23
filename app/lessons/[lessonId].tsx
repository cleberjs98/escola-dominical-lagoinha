// app/lessons/[lessonId].tsx
import { useEffect, useMemo, useState, useLayoutEffect } from "react";
import { ActivityIndicator, Alert, BackHandler, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@react-navigation/elements";
import { Timestamp } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBackground } from "../../components/layout/AppBackground";
import { RichTextEditor } from "../../components/editor/RichTextEditor";
import { LessonMaterialsSection } from "../../components/lessons/LessonMaterialsSection";
import { AppButton } from "../../components/ui/AppButton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { useUserById } from "../../hooks/useUserById";
import {
  approveReservation,
  deleteLesson,
  getLessonById,
  publishLessonNow,
  rejectReservation,
  reserveLesson,
  updateProfessorComplement,
} from "../../lib/lessons";
import type { Lesson } from "../../types/lesson";
import { formatDateTime, formatTimestampToDateInput } from "../../utils/publishAt";
import type { AppTheme } from "../../theme/tokens";

export const options = {
  title: "Aula",
  headerTitle: "Aula",
};

type Role = "aluno" | "professor" | "coordenador" | "administrador" | undefined;

type SanitizedLesson = {
  titulo: string;
  referencia_biblica: string;
  descricao_base: string;
  complemento_professor?: string;
};

// --- Funções Auxiliares (Mojibake e Sanitize) ---

function normalizeMojibake(input?: string | null): string {
  if (!input) return "";
  const cleaned = input.replace(/\uFFFD/g, "");
  return cleaned.normalize ? cleaned.normalize("NFC") : cleaned;
}

function sanitizeLesson(lesson: Lesson): SanitizedLesson {
  return {
    titulo: normalizeMojibake(lesson.titulo),
    referencia_biblica: normalizeMojibake(lesson.referencia_biblica || (lesson as any).referencia),
    descricao_base: normalizeMojibake(
      lesson.descricao_base || (lesson as any).resumo || (lesson as any).conteudo_base
    ),
    complemento_professor: normalizeMojibake(lesson.complemento_professor),
  };
}

// --- Componente Principal ---

export default function LessonDetailsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();
  
  // Memoização dos estilos com a correção de contraste
  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);
  const backTarget = "/(tabs)/lessons";
  
  const role = user?.papel as Role;
  const uid = firebaseUser?.uid || "";

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [complement, setComplement] = useState("");
  const [savingComplement, setSavingComplement] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!firebaseUser || isInitializing) return;
    void loadLesson();
  }, [firebaseUser, isInitializing, lessonId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => (
        <HeaderBackButton onPress={() => router.replace(backTarget as any)} tintColor={theme.colors.text} />
      ),
    });
  }, [navigation, router, theme.colors.text, backTarget]);

  useFocusEffect(
    useMemo(
      () => () => {
        const onBack = () => {
          router.replace(backTarget as any);
          return true;
        };
        const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
        return () => sub.remove();
      },
      [router, backTarget]
    )
  );

  async function loadLesson() {
    try {
      setLoading(true);
      const data = await getLessonById(lessonId);
      if (!data) {
        Alert.alert("Erro", "Aula não encontrada.");
        router.replace(backTarget as any);
        return;
      }
      setLesson(data);
      setComplement(data.complemento_professor || "");
    } catch (err) {
      console.error("Erro ao carregar aula:", err);
      Alert.alert("Erro", "Não foi possível carregar a aula.");
      router.replace(backTarget as any);
    } finally {
      setLoading(false);
    }
  }

  // --- Definição de Permissões ---
  const isAdmin = role === "administrador" || role === "coordenador" || role === "admin";
  const isProfessor = role === "professor";
  const isStudent = role === "aluno";
  const isOwnerProfessor = lesson?.professor_reservado_id === uid;
  const canEditComplement = (isProfessor && isOwnerProfessor) || isAdmin;
  
  const { user: reservedProfessor } = useUserById(lesson?.professor_reservado_id);
  const professorNome = normalizeMojibake(
    ((reservedProfessor?.nome_completo || reservedProfessor?.nome || "").trim()) || "Professor reservado"
  );

  // --- Handlers de Ação ---

  async function handleReserve() {
    if (!lesson) return;
    try {
      await reserveLesson(lesson.id, uid);
      Alert.alert("Reserva", "Reserva enviada para aprovação.");
      router.replace(backTarget as any);
    } catch (err) {
      Alert.alert("Erro", (err as Error)?.message || "Não foi possível reservar.");
    }
  }

  async function handleApprove() {
    if (!lesson) return;
    try {
      await approveReservation(lesson.id, uid);
      Alert.alert("Aprovado", "Reserva aprovada.");
      router.replace(backTarget as any);
    } catch (err) {
      Alert.alert("Erro", "Não foi possível aprovar.");
    }
  }

  async function handleReject() {
    if (!lesson) return;
    try {
      await rejectReservation(lesson.id, uid);
      Alert.alert("Rejeitado", "Reserva rejeitada.");
      router.replace(backTarget as any);
    } catch (err) {
      Alert.alert("Erro", "Não foi possível rejeitar.");
    }
  }

  async function handlePublishNow() {
    if (!lesson) return;
    try {
      setPublishing(true);
      await publishLessonNow(lesson.id, uid);
      Alert.alert("Publicado", "Aula publicada.");
      router.replace(backTarget as any);
    } catch (err) {
      Alert.alert("Erro", "Não foi possível publicar agora.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (!lesson) return;
    try {
      setDeleting(true);
      await deleteLesson(lesson.id);
      Alert.alert("Sucesso", "Aula excluída.");
      router.replace(backTarget as any);
    } catch (err) {
      console.error("[LessonDetails] Erro ao excluir aula:", err);
      Alert.alert("Erro", "Não foi possível excluir.");
    } finally {
      setDeleting(false);
    }
  }

  function confirmDelete() {
    if (!lesson || deleting) return;

    // Fallback for web where Alert may feel unresponsive
    if (Platform.OS === "web") {
      const proceed = typeof window !== "undefined" ? window.confirm("Deseja realmente excluir esta aula?") : false;
      if (proceed) void handleDelete();
      return;
    }

    Alert.alert("Confirmar exclusão", "Deseja realmente excluir esta aula?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => void handleDelete() },
    ]);
  }

  async function handleSaveComplement() {
    if (!lesson) return;
    try {
      setSavingComplement(true);
      await updateProfessorComplement(lesson.id, uid, complement);
      Alert.alert("Salvo", "Complemento salvo.");
      router.replace(backTarget as any);
    } catch (err) {
      Alert.alert("Erro", (err as Error)?.message || "Não foi possível salvar.");
    } finally {
      setSavingComplement(false);
    }
  }

  // --- Renderização ---

  if (isInitializing || loading) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando aula...</Text>
        </View>
      </AppBackground>
    );
  }

  if (!lesson) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Aula não encontrada.</Text>
        </View>
      </AppBackground>
    );
  }

  const sanitized = sanitizeLesson(lesson);
  const dataAulaStr = formatTimestampToDateInput(lesson.data_aula as Timestamp);
  const publishAtStr = lesson.publish_at ? formatDateTime((lesson.publish_at as Timestamp).toDate()) : "-";

  return (
    <AppBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Card 1: Informações Principais */}
        <Card
          title={sanitized.titulo || "Aula"}
          subtitle={sanitized.referencia_biblica || "Sem referência"}
          footer={!isStudent ? <StatusBadge status={lesson.status} variant="lesson" /> : null}
        >
          <View style={styles.cardBody}>
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Data da aula</Text>
              <Text style={styles.value}>{dataAulaStr}</Text>
            </View>

            {!isStudent && (
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Publicação automática</Text>
                <Text style={styles.value}>{publishAtStr}</Text>
              </View>
            )}

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>{isStudent ? "Resumo" : "Descrição base"}</Text>
              <Text style={styles.value}>{sanitized.descricao_base || "-"}</Text>
            </View>

            {/* Professor Reservado (Admin/Professor) */}
            {(lesson.status === "pendente_reserva" || lesson.status === "reservada") &&
              lesson.professor_reservado_id &&
              !isStudent && (
                <View style={styles.fieldBlock}>
                  <Text style={styles.label}>Professor reservado</Text>
                  <Text style={styles.value}>{professorNome}</Text>
                </View>
            )}
            
            {/* Conteúdo adicional do professor (visível para todos) */}
            {lesson.complemento_professor && (
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Conteúdo</Text>
                <Text style={styles.value}>{sanitized.complemento_professor || "-"}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Materiais com preview inline */}
        <LessonMaterialsSection
          lessonId={lesson.id}
          canUpload={Boolean(
            isProfessor &&
            isOwnerProfessor &&
            (lesson.status === "reservada" || lesson.status === "publicada")
          )}
          currentUserId={uid}
          currentUserRole={role ?? null}
        />

        {/* Card 3: Editor (Apenas Professor Dono) */}
        {isProfessor && isOwnerProfessor && lesson.status === "reservada" && (
            <Card title="Seu Conteúdo">
                 <RichTextEditor
                    value={complement}
                    onChange={setComplement}
                    placeholder="Escreva seu conteúdo para a aula..."
                    minHeight={140}
                  />
                  <View style={styles.actionsRow}>
                    <AppButton
                      title={savingComplement ? "Salvando..." : "Salvar conteúdo"}
                      variant="secondary"
                      fullWidth={false}
                      onPress={handleSaveComplement}
                      disabled={savingComplement}
                    />
                  </View>
            </Card>
        )}

        {/* Bloco de Ações e Botões */}
        {!isStudent && (
          <View style={styles.actionsContainer}>
            {canEditComplement && (
              <AppButton
                title="Editar conteúdo"
                variant="secondary"
                onPress={() =>
                  router.push({ pathname: "/professor/lesson-complement/[lessonId]", params: { lessonId } } as any)
                }
              />
            )}

            {isAdmin && (
              <>
                <AppButton
                  title="Editar Detalhes"
                  variant="outline"
                  onPress={() =>
                    router.push({ pathname: "/admin/lessons/[lessonId]", params: { lessonId } } as any)
                  }
                />
                
                {lesson.status !== "publicada" && (
                  <AppButton
                    title={publishing ? "Publicando..." : "Publicar agora"}
                    variant="primary"
                    onPress={handlePublishNow}
                    disabled={publishing}
                  />
                )}

                {lesson.status === "pendente_reserva" && (
                  <View style={styles.actionsRow}>
                    <AppButton title="Aprovar reserva" variant="primary" onPress={handleApprove} fullWidth={false} style={{flex: 1}} />
                    <AppButton title="Rejeitar reserva" variant="destructive" onPress={handleReject} fullWidth={false} style={{flex: 1}} />
                  </View>
                )}

                <AppButton
                  title={deleting ? "Excluindo..." : "Excluir aula"}
                  variant="destructive"
                  onPress={confirmDelete}
                  disabled={deleting}
                />
              </>
            )}

            {isProfessor && (
               <>
                 {lesson.status === "disponivel" && (
                    <AppButton title="Reservar aula para mim" variant="primary" onPress={handleReserve} />
                 )}
                 {lesson.status === "pendente_reserva" && isOwnerProfessor && (
                    <Text style={styles.helperText}>Aguardando aprovação da coordenação.</Text>
                 )}
                 {lesson.status === "reservada" && isOwnerProfessor && (
                    <AppButton
                        title={publishing ? "Publicando..." : "Publicar agora"}
                        variant="primary"
                        onPress={handlePublishNow}
                        disabled={publishing}
                    />
                 )}
               </>
            )}
          </View>
        )}
      </ScrollView>
    </AppBackground>
  );
}

// --- Estilos ---

function createStyles(theme: AppTheme, insets: { top: number; bottom: number }) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "transparent" },
    content: {
      paddingHorizontal: 16,
      paddingTop: insets.top + 20,
      paddingBottom: insets.bottom + 24,
      gap: 16,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    loadingText: {
      marginTop: 12,
      color: "#FFFFFF", // Forçado branco para contraste
    },
    cardBody: {
      gap: 12,
    },
    fieldBlock: {
      marginBottom: 4,
    },
    label: {
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.7)", // Cinza claro para contraste com fundo escuro
      textTransform: "uppercase",
      marginBottom: 4,
      fontWeight: "600",
    },
    value: {
      fontSize: 16,
      color: "#FFFFFF", // Branco puro para contraste com fundo escuro
      lineHeight: 22,
    },
    actionsContainer: {
      gap: 12,
      marginTop: 8,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 8,
    },
    helperText: {
      color: "rgba(255, 255, 255, 0.7)", // Cinza claro
      textAlign: "center",
      fontSize: 14,
      marginTop: 8,
    },
  });
}

