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
import { getDevotionalOfTheDay } from "../../lib/devotionals";
import {
  listLessonsForProfessor,
  listNextPublishedLessons,
} from "../../lib/lessons";
import type { Devotional } from "../../types/devotional";
import type { Lesson } from "../../types/lesson";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { Card } from "../../components/ui/Card";
import { AppButton } from "../../components/ui/AppButton";
import { EmptyState } from "../../components/ui/EmptyState";
import { AulaCard } from "../../components/cards/AulaCard";
import { DevocionalCard } from "../../components/cards/DevocionalCard";
import { Header } from "../../components/ui/Header";
import { useTheme } from "../../hooks/useTheme";

/* Ajustes fase de testes - Home, notificacoes, gestao de papeis e permissoes */

export default function HomeScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing, signOut } = useAuth();
  const { themeSettings } = useTheme();

  const [devotionalOfDay, setDevotionalOfDay] = useState<Devotional | null>(null);
  const [isLoadingDevotional, setIsLoadingDevotional] = useState(false);

  const [nextLessons, setNextLessons] = useState<Lesson[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);

  const [myLessons, setMyLessons] = useState<Lesson[]>([]);
  const [isLoadingMyLessons, setIsLoadingMyLessons] = useState(false);

  const userId = firebaseUser?.uid ?? null;
  const { unreadCount, reload: reloadUnread } = useUnreadNotificationsCount(userId);
  const isApproved = useMemo(() => user?.status === "aprovado", [user?.status]);
  const papel = user?.papel || "desconhecido";

  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      router.replace("/auth/login" as any);
    }
  }, [firebaseUser, isInitializing, router]);

  useEffect(() => {
    if (!firebaseUser || !isApproved) return;

    async function loadDevotional() {
      try {
        setIsLoadingDevotional(true);
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10); // "YYYY-MM-DD"
        const devo = await getDevotionalOfTheDay(dateStr);
        setDevotionalOfDay(devo);
      } catch (error) {
        console.error("Erro ao carregar devocional do dia:", error);
      } finally {
        setIsLoadingDevotional(false);
      }
    }

    async function loadLessons() {
      try {
        setIsLoadingLessons(true);
        const lessons = await listNextPublishedLessons(3);
        setNextLessons(lessons);
      } catch (error) {
        console.error("Erro ao carregar aulas:", error);
      } finally {
        setIsLoadingLessons(false);
      }
    }

    async function loadMyLessons() {
      if (papel !== "professor") return;
      try {
        setIsLoadingMyLessons(true);
        const sections = await listLessonsForProfessor(firebaseUser.uid);
        setMyLessons(sections.mine);
      } catch (error) {
        console.error("Erro ao carregar aulas do professor:", error);
      } finally {
        setIsLoadingMyLessons(false);
      }
    }

    loadDevotional();
    loadLessons();
    loadMyLessons();
  }, [firebaseUser, isApproved, papel]);

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

  const nome = user?.nome || firebaseUser.email || "Usuario";
  const isProfessor = papel === "professor";
  const isCoordenador = papel === "coordenador";
  const isAdmin = papel === "administrador";

  const primeiroNome = nome.split(" ")[0] || nome;

  function bannerSubtitle() {
    if (isProfessor) return "Veja suas aulas reservadas e devocionais.";
    if (isCoordenador || isAdmin)
      return "Gerencie usuarios, aulas, devocionais e noticias.";
    return "Fique por dentro das aulas e devocionais.";
  }

  async function handleSignOut() {
    try {
      await signOut();
      router.replace("/auth/login" as any);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
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
        title="Proximas aulas"
        subtitle="Confira o que vem pela frente."
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
          <EmptyState title="Nenhuma aula publicada no momento." />
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

      {isProfessor ? (
        <Card
          title="Minhas aulas reservadas"
          subtitle="Acompanhe as aulas que voce ministrara."
          footer={
            <AppButton
              title="Ver todas"
              variant="outline"
              fullWidth={false}
              onPress={() => router.push("/(tabs)/lessons" as any)}
            />
          }
        >
          {isLoadingMyLessons ? (
            <ActivityIndicator color={themeSettings?.cor_info || "#facc15"} />
          ) : myLessons.length === 0 ? (
            <EmptyState title="Voce ainda nao tem aulas reservadas." />
          ) : (
            myLessons.map((lesson) => (
              <AulaCard
                key={lesson.id}
                lesson={lesson}
                onPress={() => router.push(`/lessons/${lesson.id}` as any)}
              />
            ))
          )}
        </Card>
      ) : null}

      <View style={styles.footer}>
        <Pressable style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutText}>Sair</Text>
        </Pressable>
      </View>
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
