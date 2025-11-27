// app/(tabs)/index.tsx - Home principal com componentes reutilizáveis
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Image,
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
        const lessons = await listLessonsForProfessor(firebaseUser.uid);
        setMyLessons(lessons);
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
  const status = user?.status || "vazio";

  const isProfessor = papel === "professor";
  const isCoordenador = papel === "coordenador";
  const isAdmin = papel === "administrador";

  const primeiroNome = nome.split(" ")[0] || nome;
  const photoUrl = (user as any)?.photoURL || firebaseUser.photoURL || "";
  const initials = nome
    .split(" ")
    .filter((n) => n)
    .map((n) => n[0]?.toUpperCase?.() || "")
    .slice(0, 2)
    .join("") || "U";

  function papelDisplay() {
    switch (papel) {
      case "aluno":
        return "Aluno";
      case "professor":
        return "Professor";
      case "coordenador":
        return "Coordenador";
      case "administrador":
        return "Administrador";
      default:
        return "Desconhecido";
    }
  }

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

  const showSummaryNotifications =
    isApproved && typeof unreadCount === "number" && unreadCount >= 0;

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
          isApproved ? (
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
          ) : null
        }
      />

      <Card>
        <View style={styles.profileRow}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.welcome}>Olá, {primeiroNome}</Text>
            <Text style={styles.infoLine}>{papelDisplay()}</Text>
            <AppButton
              title="Ver perfil"
              variant="outline"
              fullWidth={false}
              onPress={() => router.push("/(tabs)/profile" as any)}
            />
          </View>
        </View>
      </Card>

      {showSummaryNotifications ? (
        <Card
          title="Notificações"
          subtitle={`Você tem ${unreadCount} não lida(s).`}
          footer={
            <AppButton
              title="Ver todas"
              variant="outline"
              fullWidth={false}
              onPress={() => router.push("/notifications" as any)}
            />
          }
          style={styles.cardWarning}
        >
          <Text style={styles.cardText}>
            Fique atento aos avisos e aprovações.
          </Text>
        </Card>
      ) : null}

      <Card
        title="Devocional do Dia"
        subtitle="Aprofunde-se na Palavra diariamente."
        footer={
          <AppButton
            title="Ver todos"
            variant="outline"
            fullWidth={false}
            onPress={() => router.push("/devotionals" as any)}
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
        title="Próximas aulas"
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
          subtitle="Acompanhe as aulas que você ministrará."
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
            <EmptyState title="Você ainda não tem aulas reservadas." />
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
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#e5e7eb",
    fontWeight: "700",
    fontSize: 18,
  },
  welcome: {
    color: "#9ca3af",
    fontSize: 14,
  },
  infoLine: {
    color: "#9ca3af",
    marginTop: 2,
    fontSize: 13,
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
  cardWarning: {
    backgroundColor: "#451a03",
    borderColor: "#92400e",
  },
  cardText: {
    color: "#d1d5db",
    fontSize: 13,
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
