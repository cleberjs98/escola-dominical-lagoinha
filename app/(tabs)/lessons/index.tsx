import { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import { Card } from "../../../components/ui/Card";
import { AppButton } from "../../../components/ui/AppButton";
import {
  listLessonsByStatusAndVisibility,
  listLessonsForProfessorPreparation,
  listLessonsForManager,
} from "../../../lib/lessons";
import type { Lesson, LessonStatus } from "../../../types/lesson";

type Section = {
  title: string;
  data: Lesson[];
  emptyMessage: string;
};

export default function LessonsScreen() {
  const router = useRouter();
  const { themeSettings } = useTheme();
  const { firebaseUser, user, isInitializing } = useAuth();

  const role = user?.papel;
  const uid = firebaseUser?.uid || "";
  const isAluno = role === "aluno";
  const isProfessor = role === "professor";
  const isCoordinator = role === "coordenador";
  const isAdmin = role === "administrador";

  const [published, setPublished] = useState<Lesson[]>([]);
  const [prepProfessor, setPrepProfessor] = useState<Lesson[]>([]);
  const [draftsManager, setDraftsManager] = useState<Lesson[]>([]);
  const [prepManager, setPrepManager] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser || isInitializing) return;

    async function load() {
      try {
        setIsLoading(true);
        setErrorMsg(null);

        // Publicadas (visíveis para todos os papéis)
        const publishedList = await listLessonsByStatusAndVisibility();
        setPublished(publishedList);

        if (isProfessor) {
          const prep = await listLessonsForProfessorPreparation(uid);
          setPrepProfessor(prep);
        }

        if (isCoordinator || isAdmin) {
          const { drafts, preparation } = await listLessonsForManager();
          setDraftsManager(drafts);
          setPrepManager(preparation);
        }
      } catch (error) {
        console.error("Erro ao carregar aulas:", error);
        setErrorMsg("Não foi possível carregar as aulas. Tente novamente mais tarde.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [firebaseUser, isInitializing, isProfessor, isCoordinator, isAdmin, uid]);

  const sections: Section[] = useMemo(() => {
    if (isAluno) {
      return [
        {
          title: "Aulas publicadas",
          data: published,
          emptyMessage: "Nenhuma aula publicada no momento.",
        },
      ];
    }

    if (isProfessor) {
      return [
        {
          title: "Minhas aulas disponíveis",
          data: prepProfessor,
          emptyMessage: "Você ainda não tem aulas em preparação.",
        },
        {
          title: "Aulas publicadas",
          data: published,
          emptyMessage: "Nenhuma aula publicada no momento.",
        },
      ];
    }

    if (isCoordinator || isAdmin) {
      return [
        {
          title: "Rascunhos",
          data: draftsManager,
          emptyMessage: "Nenhum rascunho no momento.",
        },
        {
          title: "Aulas disponíveis",
          data: prepManager,
          emptyMessage: "Nenhuma aula em preparação.",
        },
        {
          title: "Aulas publicadas",
          data: published,
          emptyMessage: "Nenhuma aula publicada no momento.",
        },
      ];
    }

    // fallback padrão
    return [
      {
        title: "Aulas publicadas",
        data: published,
        emptyMessage: "Nenhuma aula publicada no momento.",
      },
    ];
  }, [isAluno, isProfessor, isCoordinator, isAdmin, published, prepProfessor, draftsManager, prepManager]);

  if (isInitializing || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando aulas...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: themeSettings?.cor_fundo || "#020617" },
      ]}
      contentContainerStyle={styles.content}
    >
      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.data.length === 0 ? (
            <Text style={styles.empty}>{section.emptyMessage}</Text>
          ) : (
            section.data.map((lesson) => (
              <Card
                key={lesson.id}
                title={lesson.titulo}
                subtitle={`Data: ${formatDate(lesson.data_aula)} • Status: ${lesson.status}`}
                footer={
                  <View style={styles.cardFooter}>
                    <AppButton
                      title="Ver detalhes"
                      variant="outline"
                      fullWidth={false}
                      onPress={() => router.push(`/lessons/${lesson.id}` as any)}
                    />
                    {(isCoordinator || isAdmin) ? (
                      <AppButton
                        title="Editar"
                        variant="secondary"
                        fullWidth={false}
                        onPress={() => router.push(`/admin/lessons/${lesson.id}` as any)}
                        style={styles.editButton}
                      />
                    ) : null}
                  </View>
                }
              >
                <Text style={styles.desc}>{lesson.descricao_base}</Text>
              </Card>
            ))
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function formatDate(value: any) {
  if (!value) return "-";
  if (typeof value === "string") return value;
  if (value?.toDate) return value.toDate().toISOString().slice(0, 10);
  return String(value);
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
  errorBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#451a03",
    borderWidth: 1,
    borderColor: "#92400e",
  },
  errorText: {
    color: "#fbbf24",
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
    fontSize: 14,
  },
  desc: {
    color: "#cbd5e1",
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  editButton: {
    minWidth: 100,
  },
});
