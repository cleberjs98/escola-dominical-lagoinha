// app/professor/available-lessons.tsx - reservas usando componentes reutilizáveis
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  FirestoreError,
} from "firebase/firestore";

import { useAuth } from "../../hooks/useAuth";
import { firebaseDb } from "../../lib/firebase";
import { requestLessonReservation } from "../../lib/reservations";
import type { Lesson } from "../../types/lesson";
import { Card } from "../../components/ui/Card";
import { AppButton } from "../../components/ui/AppButton";
import { EmptyState } from "../../components/ui/EmptyState";
import { AulaCard } from "../../components/cards/AulaCard";
import { useTheme } from "../../hooks/useTheme";

type LessonWithId = Lesson;

export default function AvailableLessonsScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [lessons, setLessons] = useState<LessonWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestingIds, setRequestingIds] = useState<Set<string>>(new Set());
  const [lockedLessons, setLockedLessons] = useState<Set<string>>(new Set());

  const isProfessorApproved = useMemo(
    () => user?.papel === "professor" && user?.status === "aprovado",
    [user?.papel, user?.status]
  );

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (!isProfessorApproved) {
      Alert.alert("Sem permissão", "Apenas professor aprovado pode reservar aulas.");
      router.replace("/" as any);
    }
  }, [firebaseUser, isInitializing, isProfessorApproved, router]);

  // Carregar aulas disponíveis
  useEffect(() => {
    if (!firebaseUser || !isProfessorApproved) return;

    async function load() {
      try {
        setIsLoading(true);
        const colRef = collection(firebaseDb, "aulas");
        const q = query(colRef, where("status", "==", "disponivel"), orderBy("data_aula"));
        const snap = await getDocs(q);

        const list: LessonWithId[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as Omit<Lesson, "id">;
          list.push({ id: docSnap.id, ...data });
        });
        setLessons(list);
      } catch (error) {
        const err = error as FirestoreError;
        console.error("Erro ao carregar aulas disponíveis:", err);
        Alert.alert("Erro", "Não foi possível carregar as aulas disponíveis.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [firebaseUser, isProfessorApproved]);

  // Carregar reservas existentes do professor (pendente ou aprovada) para evitar duplicidade
  useEffect(() => {
    if (!firebaseUser || !isProfessorApproved) return;

    async function loadReservations() {
      try {
        const pending = query(
          collection(firebaseDb, "reservas_aula"),
          where("professor_id", "==", firebaseUser.uid),
          where("status", "==", "pendente")
        );
        const approved = query(
          collection(firebaseDb, "reservas_aula"),
          where("professor_id", "==", firebaseUser.uid),
          where("status", "==", "aprovada")
        );

        const [snapPending, snapApproved] = await Promise.all([
          getDocs(pending),
          getDocs(approved),
        ]);

        const ids = new Set<string>();
        snapPending.forEach((docSnap) => {
          ids.add(docSnap.data().aula_id);
        });
        snapApproved.forEach((docSnap) => {
          ids.add(docSnap.data().aula_id);
        });

        setLockedLessons(ids);
      } catch (error) {
        console.error("Erro ao carregar reservas existentes:", error);
      }
    }

    loadReservations();
  }, [firebaseUser, isProfessorApproved]);

  async function handleRequest(lessonId: string) {
    if (!firebaseUser) {
      Alert.alert("Erro", "Usuário não autenticado.");
      return;
    }

    if (lockedLessons.has(lessonId)) {
      Alert.alert(
        "Atenção",
        "Você já tem uma reserva pendente ou aprovada para esta aula."
      );
      return;
    }

    try {
      setRequestingIds((prev) => new Set(prev).add(lessonId));
      await requestLessonReservation({
        lessonId,
        professorId: firebaseUser.uid,
      });
      Alert.alert("Sucesso", "Reserva solicitada com sucesso. Aguarde aprovação.");
      setLockedLessons((prev) => new Set(prev).add(lessonId));
    } catch (error: any) {
      console.error("Erro ao solicitar reserva:", error);
      Alert.alert("Erro", error?.message || "Falha ao solicitar reserva.");
    } finally {
      setRequestingIds((prev) => {
        const next = new Set(prev);
        next.delete(lessonId);
        return next;
      });
    }
  }

  if (isInitializing || !isProfessorApproved) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando...</Text>
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
      <Card
        title="Aulas disponíveis para reserva"
        subtitle="Escolha uma aula e solicite a reserva. Aguarde aprovação do coordenador/admin."
      />

      {isLoading ? (
        <View style={styles.centerInner}>
          <ActivityIndicator size="large" color="#facc15" />
          <Text style={styles.loadingText}>Buscando aulas disponíveis...</Text>
        </View>
      ) : lessons.length === 0 ? (
        <EmptyState title="Nenhuma aula disponível para reserva no momento." />
      ) : (
        lessons.map((lesson) => {
          const locked = lockedLessons.has(lesson.id);
          const requesting = requestingIds.has(lesson.id);
          return (
            <Card
              key={lesson.id}
              footer={
                <AppButton
                  title={
                    locked ? "Solicitação enviada" : requesting ? "Enviando..." : "Solicitar reserva"
                  }
                  variant="primary"
                  fullWidth
                  disabled={locked || requesting}
                  loading={requesting}
                  onPress={() => handleRequest(lesson.id)}
                />
              }
            >
              <AulaCard lesson={lesson} showStatus />
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  centerInner: {
    alignItems: "center",
    marginTop: 12,
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 12,
  },
});
