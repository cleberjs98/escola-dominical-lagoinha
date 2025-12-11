// app/(tabs)/index.tsx - Home principal
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../../hooks/useAuth";
import { getDevotionalOfTheDay, listAvailableAndPublishedForProfessor } from "../../lib/devotionals";
import { listLessonsForProfessor, listNextPublishedLessons, listAvailableAndPublished } from "../../lib/lessons";
import { listRecentAvisosForUser } from "../../lib/avisos";
import type { Devotional } from "../../types/devotional";
import type { Aviso } from "../../types/aviso";
import type { Lesson } from "../../types/lesson";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { Card } from "../../components/ui/Card";
import { AppButton } from "../../components/ui/AppButton";
import { EmptyState } from "../../components/ui/EmptyState";
import { AulaCard } from "../../components/cards/AulaCard";
import { DevocionalCard } from "../../components/cards/DevocionalCard";
import { Header } from "../../components/ui/Header";
import { useTheme } from "../../hooks/useTheme";
import { RecentAnnouncements } from "../../components/home/RecentAnnouncements";
import { AppCard, AppCardStatusVariant } from "../../components/common/AppCard";
import CoordinatorDashboardScreen from "../(coordenador)";

/* Ajustes fase de testes - Home, notificacoes, gestao de papeis e permissoes */

export default function HomeScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [devotionalOfDay, setDevotionalOfDay] = useState<Devotional | null>(null);
  const [isLoadingDevotional, setIsLoadingDevotional] = useState(false);

  const [nextLessons, setNextLessons] = useState<Lesson[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);

  const [recentAvisos, setRecentAvisos] = useState<Aviso[]>([]);
  const [isLoadingAvisos, setIsLoadingAvisos] = useState(false);

  const userId = firebaseUser?.uid ?? null;
  const { unreadCount, reload: reloadUnread } = useUnreadNotificationsCount(userId);
  const isApproved = useMemo(() => user?.status === "aprovado", [user?.status]);
  const papel = user?.papel || "desconhecido";

  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      router.replace("/auth/login" as any);
    }
  }, [firebaseUser, isInitializing, router]);

  const nome = user?.nome || firebaseUser?.email || "Usuario";
  const isProfessor = papel === "professor";
  const isCoordenador = papel === "coordenador";
  const isAdmin = papel === "administrador";
  const isStudent = papel === "aluno";
  const primeiroNome = nome.split(" ")[0] || nome;

  useEffect(() => {
    // Admin/Coord podem carregar mesmo sem checar status; demais só se aprovado
    if (!firebaseUser) return;
    if (!isApproved && !isCoordenador && !isAdmin) return;

    async function loadDevotional() {
      try {
        setIsLoadingDevotional(true);
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10); // "YYYY-MM-DD"
        const devoToday = await getDevotionalOfTheDay(dateStr);
        if (devoToday) {
          setDevotionalOfDay(devoToday);
          return;
        }

        // fallback: primeiro publicado/disponível para admin/coord/professor
        if (isCoordenador || isAdmin || isProfessor) {
          const list = await listAvailableAndPublishedForProfessor();
          setDevotionalOfDay(list.length ? list[0] : null);
        } else {
          setDevotionalOfDay(null);
        }
      } catch (error) {
        console.error("Erro ao carregar devocional do dia:", error);
      } finally {
        setIsLoadingDevotional(false);
      }
    }

    async function loadLessons() {
      try {
        setIsLoadingLessons(true);
        let lessons: Lesson[] = [];
        if (isAdmin || isCoordenador) {
          // coord/admin veem disponíveis + publicadas (próximas)
          lessons = await listAvailableAndPublished(3);
        } else if (isProfessor) {
          const sections = await listLessonsForProfessor(firebaseUser.uid);
          const own = [...sections.mine, ...sections.published]
            .filter((lesson) => {
              const isMine =
                lesson.professor_reservado_id === firebaseUser.uid ||
                (lesson as any).publicado_por_id === firebaseUser.uid;
              return isMine;
            })
            .sort((a, b) => {
              const aDate = (a.data_aula as any)?.toDate?.() ?? new Date(a.data_aula as any);
              const bDate = (b.data_aula as any)?.toDate?.() ?? new Date(b.data_aula as any);
              return aDate.getTime() - bDate.getTime();
            })
            .slice(0, 3);
          lessons = own;
        } else {
          lessons = await listNextPublishedLessons(3);
        }
        setNextLessons(lessons);
      } catch (error) {
        console.error("Erro ao carregar aulas:", error);
      } finally {
        setIsLoadingLessons(false);
      }
    }

    async function loadAvisos() {
      try {
        setIsLoadingAvisos(true);
        const targetUser = user
          ? ({ ...user, id: user.id || firebaseUser.uid } as any)
          : null;
        const list = await listRecentAvisosForUser(targetUser);
        setRecentAvisos(list);
      } catch (error) {
        console.error("Erro ao carregar avisos recentes:", error);
      } finally {
        setIsLoadingAvisos(false);
      }
    }

    loadDevotional();
    loadLessons();
    loadAvisos();
  }, [firebaseUser, isApproved, papel, isCoordenador, isAdmin, isProfessor]);

  useEffect(() => {
    if (isApproved) {
      void reloadUnread();
    }
  }, [isApproved, reloadUnread]);

  if (isInitializing || (!firebaseUser && isInitializing)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!firebaseUser) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Redirecionando para login...</Text>
      </View>
    );
  }

  if (isCoordenador || isAdmin) {
    return <CoordinatorDashboardScreen />;
  }

  function bannerSubtitle() {
    if (isProfessor) return "Veja suas aulas reservadas e devocionais.";
    if (isCoordenador || isAdmin)
      return "Gerencie usuarios, aulas, devocionais e avisos.";
    return "Fique por dentro das aulas e devocionais.";
  }

  function normalizeStatus(status: string): "disponivel" | "reservada" | "publicada" | "pendente" {
    if (status === "pendente_reserva") return "pendente";
    return status as any;
  }

  function mapStatusLabelHome(status: string) {
    const normalized = normalizeStatus(status);
    if (normalized === "disponivel") return "Disponivel";
    if (normalized === "reservada") return "Reservada";
    if (normalized === "publicada") return "Publicada";
    if (normalized === "pendente") return "Pendente";
    return normalized;
  }

  function mapStatusVariantHome(status: string): AppCardStatusVariant {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case "publicada":
        return "success";
      case "reservada":
        return "info";
      case "pendente":
        return "warning";
      case "disponivel":
      default:
        return "muted";
    }
  }

  function formatLessonDateHome(lesson: Lesson) {
    const date = (lesson.data_aula as any)?.toDate?.() ?? new Date(lesson.data_aula as any);
    return new Date(date).toLocaleDateString("pt-BR");
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: themeSettings?.cor_fundo || "#020617" },
      ]}
      contentContainerStyle={styles.contentContainer}
    >
      <Header
        title={`Bem-vindo(a), ${primeiroNome}`}
        subtitle={bannerSubtitle()}
        rightContent={
          <Pressable
            style={styles.bellContainer}
            onPress={() => router.push("/notifications" as any)}
          >
            <Text style={styles.bellIcon}>{"\uD83D\uDD14"}</Text>
            {unreadCount ? (
              <View style={styles.badgeBubble}>
                <Text style={styles.badgeBubbleText}>{unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        }
      />

      {isLoadingAvisos ? (
        <Card title="Avisos recentes" subtitle="Comunicados para voce.">
          <ActivityIndicator color={themeSettings?.cor_info || "#facc15"} />
        </Card>
      ) : (
        <RecentAnnouncements
          avisos={recentAvisos}
          onPressAll={() => router.push("/avisos" as any)}
        />
      )}

      <Card
        title="Devocional do Dia"
        subtitle="Aprofunde-se na Palavra diariamente."
        footer={
          <AppButton
            title="Ver todos"
            variant="outline"
            fullWidth={false}
            onPress={() => {
              console.log("[Home] Ver todos devocionais clicado");
              router.push("/(tabs)/devotionals" as any);
            }}
          />
        }
      >
        {isLoadingDevotional ? (
          <ActivityIndicator color={themeSettings?.cor_info || "#facc15"} />
        ) : devotionalOfDay ? (
          <DevocionalCard
            devotional={devotionalOfDay}
            onPress={() => router.push(`/devotionals/${devotionalOfDay.id}` as any)}
          />
        ) : (
          <EmptyState title="Nenhum devocional para hoje." />
        )}
      </Card>

      <Card
        title={isProfessor ? "Minhas aulas" : isStudent ? "Minhas aulas" : "Proximas aulas"}
        subtitle={
          isProfessor ? "Acompanhe suas aulas reservadas ou publicadas." : isStudent ? "Revise suas aulas." : "Confira o que vem pela frente."
        }
        footer={
          <AppButton
            title="Ver todas"
            variant="outline"
            fullWidth={false}
            onPress={() => router.push("/(tabs)/lessons" as any)}
          />
        }
      >
        {isLoadingLessons ? (
          <ActivityIndicator color={themeSettings?.cor_info || "#facc15"} />
        ) : nextLessons.length === 0 ? (
          <EmptyState title={isProfessor ? "Voce ainda nao tem aulas reservadas ou publicadas." : "Nenhuma aula publicada no momento."} />
        ) : isProfessor ? (
          nextLessons.map((lesson) => (
            <AppCard
              key={lesson.id}
              title={lesson.titulo}
              subtitle={formatLessonDateHome(lesson)}
              statusLabel={mapStatusLabelHome(lesson.status)}
              statusVariant={mapStatusVariantHome(lesson.status)}
              onPress={() => router.push(`/lessons/${lesson.id}` as any)}
            />
          ))
        ) : (
          nextLessons.map((lesson) => (
            <AulaCard
              key={lesson.id}
              lesson={lesson}
              onPress={() => router.push(`/lessons/${lesson.id}` as any)}
            />
          ))
        )}
      </Card>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  bellContainer: {
    position: "relative",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#0b1224",
  },
  bellIcon: {
    fontSize: 20,
    color: "#e5e7eb",
  },
  badgeBubble: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#ef4444",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeBubbleText: {
    color: "#f8fafc",
    fontSize: 10,
    fontWeight: "700",
  },
  footer: {
    marginTop: 12,
    alignItems: "flex-start",
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  logoutText: {
    color: "#f97316",
    fontSize: 13,
    fontWeight: "500",
  },
});
