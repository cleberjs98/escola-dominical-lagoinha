import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Timestamp } from "firebase/firestore";

import { AppButton } from "../../../components/ui/AppButton";
import { Card } from "../../../components/ui/Card";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import type { Lesson, LessonStatus } from "../../../types/lesson";
import {
  approveReservation,
  deleteLesson,
  listLessonsForAdminCoordinator,
  listLessonsForProfessor,
  listPublishedLessons,
  publishLessonNow,
  rejectReservation,
  reserveLesson,
  setLessonStatus,
} from "../../../lib/lessons";
import { formatTimestampToDateInput, formatDateTime } from "../../../utils/publishAt";

type Role = "aluno" | "professor" | "coordenador" | "administrador" | undefined;

type AdminSections = Awaited<ReturnType<typeof listLessonsForAdminCoordinator>>;
type ProfessorSections = Awaited<ReturnType<typeof listLessonsForProfessor>>;

export default function LessonsTabScreen() {
  const router = useRouter();
  const { themeSettings } = useTheme();
  const { firebaseUser, user, isInitializing } = useAuth();
  const role = user?.papel as Role;
  const uid = firebaseUser?.uid || "";

  const [adminSections, setAdminSections] = useState<AdminSections | null>(null);
  const [profSections, setProfSections] = useState<ProfessorSections | null>(null);
  const [publishedForStudent, setPublishedForStudent] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    if (!firebaseUser || isInitializing) return;
    void loadData();
  }, [firebaseUser, isInitializing, role]);

  async function loadData() {
    try {
      setLoading(true);
      if (role === "administrador" || role === "coordenador") {
        const sections = await listLessonsForAdminCoordinator();
        setAdminSections(sections);
      } else if (role === "professor") {
        const sections = await listLessonsForProfessor(uid);
        setProfSections(sections);
      } else {
        const published = await listPublishedLessons();
        setPublishedForStudent(published);
      }
    } catch (err) {
      console.error("[Lessons] Erro ao carregar aulas:", err);
      Alert.alert("Erro", "NÃ£o foi possÃ­vel carregar as aulas.");
    } finally {
      setLoading(false);
    }
  }

  function goTo(pathname: string, params?: Record<string, string>) {
    router.push({ pathname, params } as any);
  }

  // Remove a aula de todos os estados locais (sem recarregar)
  function removeLessonFromState(id: string) {
    setAdminSections((prev) =>
      prev
        ? {
            drafts: prev.drafts.filter((l) => l.id !== id),
            available: prev.available.filter((l) => l.id !== id),
            pendingOrReserved: prev.pendingOrReserved.filter((l) => l.id !== id),
            published: prev.published.filter((l) => l.id !== id),
          }
        : prev
    );
    setProfSections((prev) =>
      prev
        ? {
            available: prev.available.filter((l) => l.id !== id),
            mine: prev.mine.filter((l) => l.id !== id),
            published: prev.published.filter((l) => l.id !== id),
          }
        : prev
    );
    setPublishedForStudent((prev) => prev.filter((l) => l.id !== id));
  }

    async function handleDelete(lesson: Lesson) {
    console.log("[Lessons] handleDelete (lista) chamado para", lesson.id);

    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      const proceed = window.confirm(`Deseja excluir "${lesson.titulo}"?`);
      if (!proceed) return;
      try {
        console.log("[Lessons] confirmação web aceita, excluindo", lesson.id);
        await deleteLesson(lesson.id);
        console.log("[Lessons] Aula excluída com sucesso:", lesson.id);
        removeLessonFromState(lesson.id);
        Alert.alert("Sucesso", "Aula excluída com sucesso.");
      } catch (err) {
        console.error("[Lessons] Erro ao excluir aula:", err);
        Alert.alert(
          "Erro",
          (err as any)?.message || "Não foi possível excluir a aula. Verifique permissões ou conexão."
        );
      }
      return;
    }

    Alert.alert("Excluir aula", `Deseja excluir "${lesson.titulo}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            console.log("[Lessons] confirmação mobile aceita, excluindo", lesson.id);
            await deleteLesson(lesson.id);
            console.log("[Lessons] Aula excluída com sucesso:", lesson.id);
            removeLessonFromState(lesson.id);
            Alert.alert("Sucesso", "Aula excluída com sucesso.");
          } catch (err) {
            console.error("[Lessons] Erro ao excluir aula:", err);
            Alert.alert(
              "Erro",
              (err as any)?.message || "Não foi possível excluir a aula. Verifique permissões ou conexão."
            );
          }
        },
      },
    ]);
  }

  async function handleStatusChange(id: string, status: LessonStatus) {
    try {
      await setLessonStatus(id, status);
      await loadData();
    } catch (err) {
      console.error("Erro ao mudar status:", err);
      Alert.alert("Erro", "NÃ£o foi possÃ­vel atualizar a aula.");
    }
  }

  async function handlePublishNow(id: string) {
    try {
      await publishLessonNow(id, uid || "system");
      await loadData();
    } catch (err) {
      console.error("Erro ao publicar:", err);
      Alert.alert("Erro", "NÃ£o foi possÃ­vel publicar a aula.");
    }
  }

  async function handleReserve(id: string) {
    try {
      await reserveLesson(id, uid);
      await loadData();
    } catch (err) {
      console.error("Erro ao reservar:", err);
      Alert.alert("Erro", (err as Error)?.message || "NÃ£o foi possÃ­vel reservar a aula.");
    }
  }

  async function handleApprove(id: string) {
    try {
      await approveReservation(id, uid);
      await loadData();
    } catch (err) {
      console.error("Erro ao aprovar reserva:", err);
      Alert.alert("Erro", "NÃ£o foi possÃ­vel aprovar a reserva.");
    }
  }

  async function handleReject(id: string) {
    try {
      await rejectReservation(id, uid);
      await loadData();
    } catch (err) {
      console.error("Erro ao rejeitar reserva:", err);
      Alert.alert("Erro", "NÃ£o foi possÃ­vel rejeitar a reserva.");
    }
  }

  if (isInitializing || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando aulas...</Text>
      </View>
    );
  }

  const bg = themeSettings?.cor_fundo || "#020617";
  const canDelete = role === "administrador" || role === "coordenador";

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={styles.content}>
      {canDelete && adminSections ? (
        <>
          <Section title="Aulas em rascunho" empty="Nenhum rascunho" data={adminSections.drafts}>
            {(lesson) => (
              <AdminDraftCard
                lesson={lesson}
                onEdit={() => goTo("/admin/lessons/[lessonId]", { lessonId: lesson.id })}
                onDelete={() => handleDelete(lesson)}
                onMakeAvailable={() => handleStatusChange(lesson.id, "disponivel")}
              />
            )}
          </Section>

          <Section title="Aulas disponÃ­veis" empty="Nenhuma aula disponÃ­vel" data={adminSections.available}>
            {(lesson) => (
              <AdminAvailableCard
                lesson={lesson}
                onDetails={() => goTo("/lessons/[lessonId]", { lessonId: lesson.id })}
                onEdit={() => goTo("/admin/lessons/[lessonId]", { lessonId: lesson.id })}
                onPublish={() => handlePublishNow(lesson.id)}
                onDelete={() => handleDelete(lesson)}
              />
            )}
          </Section>

          <Section
            title="Aulas reservadas / pendentes"
            empty="Nenhuma reserva"
            data={adminSections.pendingOrReserved}
          >
            {(lesson) => (
              <AdminReservedCard
                lesson={lesson}
                onDetails={() => goTo("/lessons/[lessonId]", { lessonId: lesson.id })}
                onApprove={() => handleApprove(lesson.id)}
                onReject={() => handleReject(lesson.id)}
                onPublish={() => handlePublishNow(lesson.id)}
                onDelete={() => handleDelete(lesson)}
              />
            )}
          </Section>

          <Section title="Aulas publicadas" empty="Nenhuma publicada" data={adminSections.published}>
            {(lesson) => (
              <AdminPublishedCard
                lesson={lesson}
                onDetails={() => goTo("/lessons/[lessonId]", { lessonId: lesson.id })}
                onEdit={() => goTo("/admin/lessons/[lessonId]", { lessonId: lesson.id })}
                onDelete={() => handleDelete(lesson)}
              />
            )}
          </Section>

          <View style={styles.actionsRow}>
            <AppButton title="Criar nova aula" variant="primary" onPress={() => goTo("/admin/lessons/new")} />
          </View>
        </>
      ) : null}

      {role === "professor" && profSections ? (
        <>
          <Section
            title="Aulas disponÃ­veis para reserva"
            empty="Nenhuma aula disponÃ­vel"
            data={profSections.available}
          >
            {(lesson) => (
              <Card
                title={lesson.titulo}
                subtitle={`Data: ${formatTimestampToDateInput(lesson.data_aula as Timestamp)}`}
                footer={
                  <View style={styles.cardActions}>
                    <AppButton
                      title="Ver detalhes"
                      variant="outline"
                      fullWidth={false}
                      onPress={() => goTo("/lessons/[lessonId]", { lessonId: lesson.id })}
                    />
                    <AppButton
                      title="Reservar aula"
                      variant="primary"
                      fullWidth={false}
                      onPress={() => handleReserve(lesson.id)}
                    />
                  </View>
                }
              >
                <Text style={styles.desc}>{lesson.descricao_base}</Text>
              </Card>
            )}
          </Section>

          <Section
            title="Minhas aulas (reservadas / pendentes)"
            empty="Nenhuma aula reservada"
            data={profSections.mine}
          >
            {(lesson) => (
              <Card
                title={lesson.titulo}
                subtitle={`Status: ${lesson.status}`}
                footer={
                  <View style={styles.cardActions}>
                    <AppButton
                      title="Ver detalhes"
                      variant="outline"
                      fullWidth={false}
                      onPress={() => goTo("/lessons/[lessonId]", { lessonId: lesson.id })}
                    />
                    {lesson.status === "reservada" ? (
                      <AppButton
                        title="Publicar agora"
                        variant="primary"
                        fullWidth={false}
                        onPress={() => handlePublishNow(lesson.id)}
                      />
                    ) : (
                      <Text style={styles.helper}>Aguardando aprovaÃ§Ã£o</Text>
                    )}
                  </View>
                }
              >
                <Text style={styles.desc}>{lesson.descricao_base}</Text>
              </Card>
            )}
          </Section>

          <Section title="Aulas publicadas" empty="Nenhuma publicada" data={profSections.published}>
            {(lesson) => (
              <SimpleLessonCard lesson={lesson} onDetails={() => goTo("/lessons/[lessonId]", { lessonId: lesson.id })} />
            )}
          </Section>
        </>
      ) : null}

      {(role === "aluno" || !role) && (
        <View style={{ gap: 8 }}>
          <View style={styles.orderRow}>
            <Text style={styles.sectionTitle}>Aulas publicadas</Text>
            <View style={styles.orderButtons}>
              <Text
                style={[styles.orderChip, order === "desc" && styles.orderChipActive]}
                onPress={() => setOrder("desc")}
              >
                Mais recentes
              </Text>
              <Text
                style={[styles.orderChip, order === "asc" && styles.orderChipActive]}
                onPress={() => setOrder("asc")}
              >
                Mais antigas
              </Text>
            </View>
          </View>
          <Section
            title=""
            empty="Nenhuma publicada"
            data={[...publishedForStudent].sort((a, b) => {
              const aDate = (a.data_aula as any)?.toDate?.() ?? new Date(a.data_aula as any);
              const bDate = (b.data_aula as any)?.toDate?.() ?? new Date(b.data_aula as any);
              return order === "desc" ? bDate.getTime() - aDate.getTime() : aDate.getTime() - bDate.getTime();
            })}
          >
            {(lesson) => (
              <StudentLessonCard
                lesson={lesson}
                onPress={() => goTo("/lessons/[lessonId]", { lessonId: lesson.id })}
              />
            )}
          </Section>
        </View>
      )}
    </ScrollView>
  );
}

type SectionProps<T> = {
  title: string;
  empty: string;
  data: T[];
  children: (item: T) => React.ReactNode;
};

function Section<T>({ title, empty, data, children }: SectionProps<T>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data.length === 0 ? <Text style={styles.empty}>{empty}</Text> : data.map((item, idx) => <View key={idx}>{children(item)}</View>)}
    </View>
  );
}

function SimpleLessonCard({ lesson, onDetails }: { lesson: Lesson; onDetails: () => void }) {
  return (
    <Card
      title={lesson.titulo}
      subtitle={`Data: ${formatTimestampToDateInput(lesson.data_aula as Timestamp)}`}
      footer={
        <View style={styles.cardActions}>
          <AppButton title="Ver detalhes" variant="outline" fullWidth={false} onPress={onDetails} />
        </View>
      }
    >
      <Text style={styles.desc}>{lesson.descricao_base}</Text>
    </Card>
  );
}

function StudentLessonCard({ lesson, onPress }: { lesson: Lesson; onPress: () => void }) {
  return (
    <View style={styles.studentCard}>
      <Pressable onPress={onPress} style={styles.studentPressable}>
        <Text style={styles.sectionTitle}>{lesson.titulo}</Text>
        <Text style={styles.desc}>
          Data: {formatTimestampToDateInput(lesson.data_aula as Timestamp)}
        </Text>
      </Pressable>
    </View>
  );
}

function AdminDraftCard({
  lesson,
  onEdit,
  onDelete,
  onMakeAvailable,
}: {
  lesson: Lesson;
  onEdit: () => void;
  onDelete: () => void;
  onMakeAvailable: () => void;
}) {
  return (
    <Card
      title={lesson.titulo}
      subtitle={`Data: ${formatTimestampToDateInput(lesson.data_aula as Timestamp)}`}
      footer={
        <View style={styles.cardActions}>
          <AppButton title="Editar" variant="outline" fullWidth={false} onPress={onEdit} />
          <AppButton title="Disponibilizar" variant="primary" fullWidth={false} onPress={onMakeAvailable} />
          <AppButton title="Excluir" variant="secondary" fullWidth={false} onPress={onDelete} />
        </View>
      }
    >
      <Text style={styles.desc}>{lesson.descricao_base}</Text>
    </Card>
  );
}

function AdminAvailableCard({
  lesson,
  onDetails,
  onEdit,
  onPublish,
  onDelete,
}: {
  lesson: Lesson;
  onDetails: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      title={lesson.titulo}
      subtitle={`Data: ${formatTimestampToDateInput(lesson.data_aula as Timestamp)}`}
      footer={
        <View style={styles.cardActions}>
          <AppButton title="Ver detalhes" variant="outline" fullWidth={false} onPress={onDetails} />
          <AppButton title="Editar" variant="secondary" fullWidth={false} onPress={onEdit} />
          <AppButton title="Publicar agora" variant="primary" fullWidth={false} onPress={onPublish} />
          <AppButton title="Excluir" variant="secondary" fullWidth={false} onPress={onDelete} />
        </View>
      }
    >
      <Text style={styles.desc}>{lesson.descricao_base}</Text>
    </Card>
  );
}

function AdminReservedCard({
  lesson,
  onDetails,
  onApprove,
  onReject,
  onPublish,
  onDelete,
}: {
  lesson: Lesson;
  onDetails: () => void;
  onApprove: () => void;
  onReject: () => void;
  onPublish: () => void;
  onDelete: () => void;
}) {
  const reservedBy = lesson.professor_reservado_id ? `Professor: ${lesson.professor_reservado_id}` : "Sem professor";
  const pending = lesson.status === "pendente_reserva";
  return (
    <Card
      title={lesson.titulo}
      subtitle={`${reservedBy} â€¢ Status: ${lesson.status}`}
      footer={
        <View style={styles.cardActions}>
          <AppButton title="Ver detalhes" variant="outline" fullWidth={false} onPress={onDetails} />
          {pending ? (
            <>
              <AppButton title="Aprovar" variant="primary" fullWidth={false} onPress={onApprove} />
              <AppButton title="Rejeitar" variant="secondary" fullWidth={false} onPress={onReject} />
            </>
          ) : (
            <AppButton title="Publicar agora" variant="primary" fullWidth={false} onPress={onPublish} />
          )}
          <AppButton title="Excluir" variant="secondary" fullWidth={false} onPress={onDelete} />
        </View>
      }
    >
      <Text style={styles.desc}>{lesson.descricao_base}</Text>
    </Card>
  );
}

function AdminPublishedCard({
  lesson,
  onDetails,
  onEdit,
  onDelete,
}: {
  lesson: Lesson;
  onDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const publishedAt =
    (lesson.publicado_em as Timestamp | null)?.toDate?.() ??
    (lesson.publish_at as Timestamp | null)?.toDate?.() ??
    null;
  return (
    <Card
      title={lesson.titulo}
      subtitle={`Publicada em: ${publishedAt ? formatDateTime(publishedAt) : "-"}`}
      footer={
        <View style={styles.cardActions}>
          <AppButton title="Ver detalhes" variant="outline" fullWidth={false} onPress={onDetails} />
          <AppButton title="Editar" variant="secondary" fullWidth={false} onPress={onEdit} />
          <AppButton title="Excluir" variant="secondary" fullWidth={false} onPress={onDelete} />
        </View>
      }
    >
      <Text style={styles.desc}>{lesson.descricao_base}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 12,
    paddingBottom: 32,
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
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: "#e5e7eb",
    fontSize: 18,
    fontWeight: "700",
  },
  empty: {
    color: "#cbd5e1",
  },
  desc: {
    color: "#cbd5e1",
    marginTop: 6,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  helper: {
    color: "#cbd5e1",
  },
  actionsRow: {
    marginTop: 12,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  orderButtons: {
    flexDirection: "row",
    gap: 8,
  },
  orderChip: {
    color: "#cbd5e1",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  orderChipActive: {
    backgroundColor: "#22c55e22",
    borderColor: "#22c55e",
    color: "#e5e7eb",
  },
  studentCard: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#0b1224",
    marginTop: 8,
  },
  studentPressable: {
    gap: 4,
  },
});



