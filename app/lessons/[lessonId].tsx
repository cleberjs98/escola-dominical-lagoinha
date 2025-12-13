import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Timestamp } from "firebase/firestore";

import { AppBackground } from "../../components/layout/AppBackground";
import { RichTextEditor } from "../../components/editor/RichTextEditor";
import { LessonMaterialsSection } from "../../components/lessons/LessonMaterialsSection";
import { AppButton } from "../../components/ui/AppButton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { useUserById } from "../../hooks/useUserById";
import {
  approveReservation,
  getLessonById,
  publishLessonNow,
  rejectReservation,
  reserveLesson,
  updateProfessorComplement,
} from "../../lib/lessons";
import { withAlpha } from "../../theme/utils";
import type { Lesson } from "../../types/lesson";
import { formatDateTime, formatTimestampToDateInput } from "../../utils/publishAt";

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

export default function LessonDetailsScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();
  const role = user?.papel as Role;
  const uid = firebaseUser?.uid || "";

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [complement, setComplement] = useState("");
  const [savingComplement, setSavingComplement] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!firebaseUser || isInitializing) return;
    void loadLesson();
  }, [firebaseUser, isInitializing, lessonId]);

  async function loadLesson() {
    try {
      setLoading(true);
      const data = await getLessonById(lessonId);
      if (!data) {
        Alert.alert("Erro", "Aula nÃ£o encontrada.");
        router.replace("/lessons" as any);
        return;
      }
      setLesson(data);
      setComplement(data.complemento_professor || "");
    } catch (err) {
      console.error("Erro ao carregar aula:", err);
      Alert.alert("Erro", "NÃ£o foi possÃ­vel carregar a aula.");
      router.replace("/lessons" as any);
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = role === "administrador" || role === "coordenador";
  const isProfessor = role === "professor";
  const isStudent = role === "aluno";
  const isOwnerProfessor = lesson?.professor_reservado_id === uid;
  const { user: reservedProfessor } = useUserById(lesson?.professor_reservado_id);

  const professorNome = normalizeMojibake(
    ((reservedProfessor?.nome_completo || reservedProfessor?.nome || "").trim()) || "Professor reservado"
  );

  async function handleReserve() {
    if (!lesson) return;
    try {
      await reserveLesson(lesson.id, uid);
      Alert.alert("Reserva", "Reserva enviada para aprovaÃ§Ã£o.");
      router.replace("/lessons" as any);
    } catch (err) {
      Alert.alert("Erro", (err as Error)?.message || "NÃ£o foi possÃ­vel reservar.");
    }
  }

  async function handleApprove() {
    if (!lesson) return;
    try {
      await approveReservation(lesson.id, uid);
      Alert.alert("Aprovado", "Reserva aprovada.");
      router.replace("/lessons" as any);
    } catch (err) {
      Alert.alert("Erro", "NÃ£o foi possÃ­vel aprovar.");
    }
  }

  async function handleReject() {
    if (!lesson) return;
    try {
      await rejectReservation(lesson.id, uid);
      Alert.alert("Rejeitado", "Reserva rejeitada.");
      router.replace("/lessons" as any);
    } catch (err) {
      Alert.alert("Erro", "NÃ£o foi possÃ­vel rejeitar.");
    }
  }

  async function handlePublishNow() {
    if (!lesson) return;
    try {
      setPublishing(true);
      await publishLessonNow(lesson.id, uid);
      Alert.alert("Publicado", "Aula publicada.");
      router.replace("/lessons" as any);
    } catch (err) {
      Alert.alert("Erro", "NÃ£o foi possÃ­vel publicar agora.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleSaveComplement() {
    if (!lesson) return;
    try {
      setSavingComplement(true);
      await updateProfessorComplement(lesson.id, uid, complement);
      Alert.alert("Salvo", "Complemento salvo.");
      router.replace("/lessons" as any);
    } catch (err) {
      Alert.alert("Erro", (err as Error)?.message || "NÃ£o foi possÃ­vel salvar.");
    } finally {
      setSavingComplement(false);
    }
  }

  if (isInitializing || loading) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.textPrimary }]}>Carregando aula...</Text>
        </View>
      </AppBackground>
    );
  }

  if (!lesson) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <Text style={[styles.loadingText, { color: theme.colors.textPrimary }]}>Aula nÃ£o encontrada.</Text>
        </View>
      </AppBackground>
    );
  }

  const sanitized = sanitizeLesson(lesson);
  const dataAulaStr = formatTimestampToDateInput(lesson.data_aula as Timestamp);
  const publishAtStr = lesson.publish_at ? formatDateTime((lesson.publish_at as Timestamp).toDate()) : "-";
  // forÃ§a contraste alto para esta tela
  const labelColor = withAlpha("#FFFFFF", 0.9);
  const valueColor = "#FFFFFF";
  const helperColor = withAlpha("#FFFFFF", 0.85);
  const cardBg = withAlpha(theme.colors.card, 0.78);
  const sectionBg = withAlpha(theme.colors.card, 0.9);
  const overlayBg = withAlpha(theme.colors.background, 0.4);
  const borderColor = withAlpha(theme.colors.border || theme.colors.card, 0.6);

  return (
    <AppBackground>
      <View style={[styles.overlay, { backgroundColor: overlayBg }]}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={styles.inner}>
            <View style={[styles.cardWrapper, { backgroundColor: cardBg, borderColor }]}>
              <Text style={styles.title}>{sanitized.titulo || "Aula"}</Text>
              {!isStudent ? (
                <View style={styles.statusRow}>
                  <StatusBadge status={lesson.status} variant="lesson" />
                </View>
              ) : null}

              <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: labelColor }]}>ReferÃªncia bÃ­blica</Text>
                <Text style={[styles.value, { color: valueColor }]}>{sanitized.referencia_biblica || "-"}</Text>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: labelColor }]}>Data da aula</Text>
                <Text style={[styles.value, { color: valueColor }]}>{dataAulaStr}</Text>
              </View>

              {!isStudent ? (
                <View style={styles.fieldBlock}>
                  <Text style={[styles.label, { color: labelColor }]}>PublicaÃ§Ã£o automÃ¡tica</Text>
                  <Text style={[styles.value, { color: valueColor }]}>{publishAtStr}</Text>
                </View>
              ) : null}

              <View style={styles.fieldBlock}>
                <Text style={[styles.label, { color: labelColor }]}>
                  {isStudent ? "Resumo" : "DescriÃ§Ã£o base"}
                </Text>
                <Text style={[styles.value, { color: valueColor }]}>{sanitized.descricao_base || "-"}</Text>
              </View>

              {lesson.complemento_professor && !isStudent ? (
                <View style={styles.fieldBlock}>
                  <Text style={[styles.label, { color: labelColor }]}>Complemento do professor</Text>
                  <Text style={[styles.value, { color: valueColor }]}>{sanitized.complemento_professor || "-"}</Text>
                </View>
              ) : null}

              {(lesson.status === "pendente_reserva" || lesson.status === "reservada") &&
                lesson.professor_reservado_id &&
                !isStudent ? (
                <View style={styles.fieldBlock}>
                  <Text style={[styles.label, { color: labelColor }]}>Professor reservado</Text>
                  <Text style={[styles.value, { color: valueColor }]}>{professorNome || "Professor reservado"}</Text>
                </View>
              ) : null}

              <View style={[styles.materialsWrapper, { backgroundColor: sectionBg, borderColor }]}>
                <LessonMaterialsSection
                  lessonId={lesson.id}
                  canUpload={Boolean(
                    isProfessor &&
                      isOwnerProfessor &&
                      (lesson.status === "reservada" || lesson.status === "publicada")
                  )}
                  currentUserId={uid}
                  containerStyle={{ backgroundColor: "transparent" }}
                />
                {/* TODO: garantir integraÃ§Ã£o de materiais de apoio se necessÃ¡rio */}
              </View>

              {!isStudent ? (
                <View style={styles.actions}>
                  {isAdmin ? (
                    <>
                      <AppButton
                        title="Editar"
                        variant="secondary"
                        onPress={() =>
                          router.push({ pathname: "/admin/lessons/[lessonId]", params: { lessonId } } as any)
                        }
                      />
                      {lesson.status !== "publicada" ? (
                        <AppButton
                          title={publishing ? "Publicando..." : "Publicar agora"}
                          variant="primary"
                          onPress={handlePublishNow}
                          disabled={publishing}
                        />
                      ) : null}
                      {lesson.status === "pendente_reserva" ? (
                        <View style={styles.actionsRow}>
                          <AppButton title="Aprovar reserva" variant="primary" onPress={handleApprove} />
                          <AppButton title="Rejeitar reserva" variant="secondary" onPress={handleReject} />
                        </View>
                      ) : null}
                    </>
                  ) : null}

                  {isProfessor ? (
                    <>
                      {lesson.status === "disponivel" ? (
                        <AppButton title="Reservar aula" variant="primary" onPress={handleReserve} />
                      ) : null}

                      {lesson.status === "pendente_reserva" && isOwnerProfessor ? (
                        <Text style={[styles.helper, { color: helperColor }]}>
                          Aguardando aprovaÃ§Ã£o da coordenaÃ§Ã£o.
                        </Text>
                      ) : null}

                      {lesson.status === "reservada" && isOwnerProfessor ? (
                        <>
                          <RichTextEditor
                            value={complement}
                            onChange={setComplement}
                            placeholder="Escreva seu complemento para a aula..."
                            minHeight={140}
                          />
                          <View style={styles.actionsRow}>
                            <AppButton
                              title={savingComplement ? "Salvando..." : "Salvar complemento"}
                              variant="secondary"
                              onPress={handleSaveComplement}
                              disabled={savingComplement}
                            />
                            <AppButton
                              title={publishing ? "Publicando..." : "Publicar agora"}
                              variant="primary"
                              onPress={handlePublishNow}
                              disabled={publishing}
                            />
                          </View>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    alignItems: "center",
  },
  inner: {
    width: "100%",
    maxWidth: 880,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  loadingText: {
    marginTop: 12,
  },
  cardWrapper: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  fieldBlock: {
    marginTop: 10,
  },
  label: {
    fontSize: 13,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
  },
  actions: {
    marginTop: 18,
    gap: 10,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  helper: {
    marginTop: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  materialsWrapper: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  overlay: {
    flex: 1,
  },
});


