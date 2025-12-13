import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Timestamp } from "firebase/firestore";

import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { AppButton } from "../../components/ui/AppButton";
import { Card } from "../../components/ui/Card";
import { RichTextEditor } from "../../components/editor/RichTextEditor";
import type { Lesson } from "../../types/lesson";
import {
  approveReservation,
  getLessonById,
  publishLessonNow,
  rejectReservation,
  reserveLesson,
  updateProfessorComplement,
} from "../../lib/lessons";
import { formatDateTime, formatTimestampToDateInput } from "../../utils/publishAt";
import { useUserById } from "../../hooks/useUserById";
import { LessonMaterialsSection } from "../../components/lessons/LessonMaterialsSection";

type Role = "aluno" | "professor" | "coordenador" | "administrador" | undefined;

export default function LessonDetailsScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();
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
        Alert.alert("Erro", "Aula não encontrada.");
        router.replace("/lessons" as any);
        return;
      }
      setLesson(data);
      setComplement(data.complemento_professor || "");
    } catch (err) {
      console.error("Erro ao carregar aula:", err);
      Alert.alert("Erro", "Não foi possível carregar a aula.");
      router.replace("/lessons" as any);
    } finally {
      setLoading(false);
    }
  }

  const bg = themeSettings?.cor_fundo || "#1A0509";

  const isAdmin = role === "administrador" || role === "coordenador";
  const isProfessor = role === "professor";
  const isStudent = role === "aluno";
  const isOwnerProfessor =
    lesson?.professor_reservado_id && lesson.professor_reservado_id === uid;
  const { user: reservedProfessor } = useUserById(lesson?.professor_reservado_id);

  const professorNome = reservedProfessor
    ? reservedProfessor.nome_completo ||
      `${reservedProfessor.nome || ""} ${reservedProfessor.sobrenome || ""}`.trim() ||
      reservedProfessor.nome ||
      "Professor reservado"
    : null;

  async function handleReserve() {
    if (!lesson) return;
    try {
      await reserveLesson(lesson.id, uid);
      Alert.alert("Reserva", "Reserva enviada para aprovação.");
      router.replace("/lessons" as any);
    } catch (err) {
      Alert.alert("Erro", (err as Error)?.message || "Não foi possível reservar.");
    }
  }

  async function handleApprove() {
    if (!lesson) return;
    try {
      await approveReservation(lesson.id, uid);
      Alert.alert("Aprovado", "Reserva aprovada.");
      router.replace("/lessons" as any);
    } catch (err) {
      Alert.alert("Erro", "Não foi possível aprovar.");
    }
  }

  async function handleReject() {
    if (!lesson) return;
    try {
      await rejectReservation(lesson.id, uid);
      Alert.alert("Rejeitado", "Reserva rejeitada.");
      router.replace("/lessons" as any);
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
      router.replace("/lessons" as any);
    } catch (err) {
      Alert.alert("Erro", "Não foi possível publicar agora.");
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
      Alert.alert("Erro", (err as Error)?.message || "Não foi possível salvar.");
    } finally {
      setSavingComplement(false);
    }
  }

  if (isInitializing || loading) {
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

  const dataAulaStr = formatTimestampToDateInput(lesson.data_aula as Timestamp);
  const publishAtStr = lesson.publish_at ? formatDateTime((lesson.publish_at as Timestamp).toDate()) : "-";

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={styles.content}>
      <Card
        title={lesson.titulo}
        subtitle={isStudent ? undefined : `Status: ${lesson.status}`}
      >
        <Text style={styles.label}>Referência bíblica</Text>
        <Text style={styles.value}>{lesson.referencia_biblica}</Text>

        <Text style={styles.label}>Data da aula</Text>
        <Text style={styles.value}>{dataAulaStr}</Text>

        {!isStudent ? (
          <>
            <Text style={styles.label}>Publicação automática</Text>
            <Text style={styles.value}>{publishAtStr}</Text>
          </>
        ) : null}

        <Text style={styles.label}>{isStudent ? "Resumo" : "Descrição base"}</Text>
        <Text style={styles.value}>{lesson.descricao_base}</Text>

        {lesson.complemento_professor && !isStudent ? (
          <>
            <Text style={styles.label}>Complemento do professor</Text>
            <Text style={styles.value}>{lesson.complemento_professor}</Text>
          </>
        ) : null}

        {(lesson.status === "pendente_reserva" || lesson.status === "reservada") &&
          lesson.professor_reservado_id &&
          !isStudent ? (
          <>
            <Text style={styles.label}>Professor reservado</Text>
            <Text style={styles.value}>
              {professorNome || "Professor reservado"}
            </Text>
          </>
        ) : null}

        <LessonMaterialsSection
          lessonId={lesson.id}
          canUpload={Boolean(
            isProfessor &&
              isOwnerProfessor &&
              (lesson.status === "reservada" || lesson.status === "publicada")
          )}
          currentUserId={uid}
        />

        {!isStudent && (
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
                  <Text style={styles.helper}>Aguardando aprovação da coordenação.</Text>
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
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    backgroundColor: "#1A0509",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 12,
  },
  label: {
    color: "#9ca3af",
    marginTop: 8,
  },
  value: {
    color: "#e5e7eb",
  },
  actions: {
    marginTop: 16,
    gap: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  helper: {
    color: "#cbd5e1",
    marginTop: 6,
  },
});
