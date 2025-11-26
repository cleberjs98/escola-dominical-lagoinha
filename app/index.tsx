// app/index.tsx
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

import { useAuth } from "../hooks/useAuth";
import { getDevotionalOfTheDay } from "../lib/devotionals";
import {
  listLessonsForProfessor,
  listNextPublishedLessons,
} from "../lib/lessons";
import type { Devotional } from "../types/devotional";
import type { Lesson } from "../types/lesson";
import { useUnreadNotificationsCount } from "../hooks/useUnreadNotificationsCount";

export default function HomeScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing, signOut } = useAuth();

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

  const isAluno = papel === "aluno";
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
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.profileRow}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View>
              <Text style={styles.welcome}>Bem-vindo(a)</Text>
              <Text style={styles.name}>{nome}</Text>
              <Text style={styles.infoLine}>{papelDisplay()}</Text>
            </View>
          </View>
          {isApproved && (
            <Pressable
              style={styles.bellContainer}
              onPress={() => router.push("/notifications" as any)}
            >
              <Text style={styles.bellIcon}>{"\uD83D\uDD14"}</Text>
              {unreadCount > 0 && (
                <View style={styles.badgeBubble}>
                  <Text style={styles.badgeBubbleText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Seja bem-vindo(a), {primeiroNome}</Text>
        <Text style={styles.bannerSubtitle}>{bannerSubtitle()}</Text>
        {showSummaryNotifications && (
          <Pressable
            style={styles.bannerButton}
            onPress={() => router.push("/notifications" as any)}
          >
            <Text style={styles.bannerButtonText}>
              Voce tem {unreadCount} notificacao(oes)
            </Text>
          </Pressable>
        )}
      </View>

      {status !== "aprovado" && (
        <View style={styles.cardWarning}>
          <Text style={styles.cardTitle}>Seu cadastro ainda nao foi aprovado</Text>
          <Text style={styles.cardText}>
            Aguarde ate que a lideranca revise seus dados. Assim que for aprovado,
            novas funcionalidades serao liberadas para voce.
          </Text>
          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => router.replace("/auth/pending" as any)}
          >
            <Text style={styles.buttonSecondaryText}>Ver detalhes</Text>
          </Pressable>
        </View>
      )}

      {status === "aprovado" && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Devocional do dia</Text>
            <Pressable
              onPress={() => router.push("/devotionals" as any)}
              style={styles.linkButton}
            >
              <Text style={styles.linkButtonText}>Ver todos</Text>
            </Pressable>
          </View>
          {isLoadingDevotional ? (
            <View style={styles.inlineCenter}>
              <ActivityIndicator size="small" color="#facc15" />
              <Text style={styles.loadingText}>Carregando devocional...</Text>
            </View>
          ) : devotionalOfDay ? (
            <>
              <Text style={styles.cardText}>{devotionalOfDay.titulo}</Text>
              <Text style={styles.cardTextMuted}>
                {String(devotionalOfDay.data_devocional)}
              </Text>
              <Text style={styles.cardPreview}>
                {devotionalOfDay.conteudo_base.length > 160
                  ? `${devotionalOfDay.conteudo_base.slice(0, 160)}...`
                  : devotionalOfDay.conteudo_base}
              </Text>
              <Pressable
                style={[styles.button, styles.buttonOutline]}
                onPress={() => router.push(`/devotionals/${devotionalOfDay.id}` as any)}
              >
                <Text style={styles.buttonOutlineText}>Ver devocional completo</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.cardTextMuted}>Nenhum devocional para hoje.</Text>
          )}
        </View>
      )}

      {status === "aprovado" && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Proximas aulas</Text>
            <Pressable
              onPress={() => router.push("/lessons" as any)}
              style={styles.linkButton}
            >
              <Text style={styles.linkButtonText}>Ver todas</Text>
            </Pressable>
          </View>
          {isLoadingLessons ? (
            <View style={styles.inlineCenter}>
              <ActivityIndicator size="small" color="#facc15" />
              <Text style={styles.loadingText}>Carregando aulas...</Text>
            </View>
          ) : nextLessons.length === 0 ? (
            <Text style={styles.cardTextMuted}>Nenhuma aula publicada no momento.</Text>
          ) : (
            nextLessons.map((lesson) => (
              <Pressable
                key={lesson.id}
                style={styles.lessonCard}
                onPress={() => router.push(`/lessons/${lesson.id}` as any)}
              >
                <Text style={styles.lessonTitle}>{lesson.titulo}</Text>
                <Text style={styles.lessonMeta}>Data: {String(lesson.data_aula)}</Text>
                {lesson.professor_reservado_id && (
                  <Text style={styles.lessonMeta}>
                    Professor reservado: {lesson.professor_reservado_id}
                  </Text>
                )}
              </Pressable>
            ))
          )}
        </View>
      )}

      {status === "aprovado" && isProfessor && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Minhas aulas reservadas</Text>
            <Pressable
              onPress={() => router.push("/professor/available-lessons" as any)}
              style={styles.linkButton}
            >
              <Text style={styles.linkButtonText}>Reservar aula</Text>
            </Pressable>
          </View>
          {isLoadingMyLessons ? (
            <View style={styles.inlineCenter}>
              <ActivityIndicator size="small" color="#facc15" />
              <Text style={styles.loadingText}>Carregando aulas...</Text>
            </View>
          ) : myLessons.length === 0 ? (
            <Text style={styles.cardTextMuted}>Voce ainda nao tem aulas reservadas.</Text>
          ) : (
            myLessons.map((lesson) => (
              <Pressable
                key={lesson.id}
                style={styles.lessonCard}
                onPress={() => router.push(`/lessons/${lesson.id}` as any)}
              >
                <Text style={styles.lessonTitle}>{lesson.titulo}</Text>
                <Text style={styles.lessonMeta}>Data: {String(lesson.data_aula)}</Text>
                <Text style={styles.lessonMeta}>Status: {lesson.status}</Text>
              </Pressable>
            ))
          )}
        </View>
      )}

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
    backgroundColor: "#020617",
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 32,
    gap: 12,
  },
  header: {
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  },
  welcome: {
    color: "#9ca3af",
    fontSize: 14,
  },
  name: {
    color: "#e5e7eb",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 2,
  },
  infoLine: {
    color: "#9ca3af",
    marginTop: 2,
    fontSize: 13,
  },
  badge: {
    color: "#facc15",
    fontWeight: "600",
  },
  status: {
    color: "#38bdf8",
    fontWeight: "600",
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
  banner: {
    backgroundColor: "#0b1224",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 12,
    gap: 6,
  },
  bannerTitle: {
    color: "#e5e7eb",
    fontSize: 18,
    fontWeight: "700",
  },
  bannerSubtitle: {
    color: "#cbd5e1",
    fontSize: 13,
  },
  bannerButton: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#22c55e",
    backgroundColor: "#022c22",
  },
  bannerButtonText: {
    color: "#bbf7d0",
    fontWeight: "700",
    fontSize: 12,
  },
  card: {
    backgroundColor: "#020617",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  cardWarning: {
    backgroundColor: "#451a03",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#92400e",
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "600",
  },
  cardText: {
    color: "#d1d5db",
    fontSize: 13,
  },
  cardTextMuted: {
    color: "#9ca3af",
    fontSize: 13,
  },
  cardPreview: {
    color: "#9ca3af",
    fontSize: 13,
  },
  linkButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  linkButtonText: {
    color: "#bbf7d0",
    fontSize: 12,
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#22c55e",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonText: {
    color: "#022c22",
    fontWeight: "600",
    fontSize: 14,
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#22c55e",
    marginTop: 8,
  },
  buttonOutlineText: {
    color: "#bbf7d0",
    fontWeight: "600",
    fontSize: 14,
  },
  buttonSecondary: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  buttonSecondaryText: {
    color: "#fbbf24",
    fontWeight: "600",
    fontSize: 14,
  },
  lessonCard: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#0b1224",
    marginTop: 8,
    gap: 4,
  },
  lessonTitle: {
    color: "#e5e7eb",
    fontSize: 14,
    fontWeight: "700",
  },
  lessonMeta: {
    color: "#9ca3af",
    fontSize: 12,
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
  inlineCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
