// app/index.tsx
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

import { useAuth } from "../hooks/useAuth";
import { getDevotionalOfTheDay } from "../lib/devotionals";
import type { Devotional } from "../types/devotional";
import { useUnreadNotificationsCount } from "../hooks/useUnreadNotificationsCount";

export default function HomeScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing, signOut } = useAuth();
  const [devotionalOfDay, setDevotionalOfDay] = useState<Devotional | null>(null);
  const [isLoadingDevotional, setIsLoadingDevotional] = useState(false);
  const userId = firebaseUser?.uid ?? null;
  const { unreadCount, reload: reloadUnread } = useUnreadNotificationsCount(userId);
  const isApproved = useMemo(() => user?.status === "aprovado", [user?.status]);

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

    loadDevotional();
  }, [firebaseUser, isApproved]);

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
  const papel = user?.papel || "desconhecido";
  const status = user?.status || "vazio";

  const isAluno = papel === "aluno";
  const isProfessor = papel === "professor";
  const isCoordenador = papel === "coordenador";
  const isAdmin = papel === "administrador";

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
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcome}>Bem-vindo(a),</Text>
            <Text style={styles.name}>{nome}</Text>
            <Text style={styles.infoLine}>
              Papel: <Text style={styles.badge}>{papel}</Text>
            </Text>
            <Text style={styles.infoLine}>
              Status: <Text style={styles.status}>{status}</Text>
            </Text>
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

      {status !== "aprovado" && (
        <View style={styles.cardWarning}>
          <Text style={styles.cardTitle}>Seu cadastro ainda não foi aprovado</Text>
          <Text style={styles.cardText}>
            Aguarde até que a liderança revise seus dados. Assim que for aprovado,
            novas funcionalidades serão liberadas para você.
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
          <Text style={styles.cardTitle}>Devocional do Dia</Text>
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
              <Pressable
                style={[styles.button, styles.buttonOutline]}
                onPress={() => router.push("/devotionals" as any)}
              >
                <Text style={styles.buttonOutlineText}>Ver todos os devocionais</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.cardTextMuted}>Nenhum devocional para hoje.</Text>
          )}
        </View>
      )}

      {status === "aprovado" && isAluno && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Área do Aluno</Text>
          <Text style={styles.cardText}>
            Em breve você verá aqui as próximas aulas, devocional do dia e
            materiais de apoio.
          </Text>
        </View>
      )}

      {status === "aprovado" && isProfessor && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Área do Professor</Text>
          <Text style={styles.cardText}>
            Em breve você poderá reservar aulas, ver suas aulas reservadas e
            publicar notícias.
          </Text>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/professor/available-lessons" as any)}
          >
            <Text style={styles.buttonOutlineText}>
              Ver aulas disponíveis para reserva
            </Text>
          </Pressable>
        </View>
      )}

      {status === "aprovado" && isCoordenador && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Painel do Coordenador</Text>
          <Text style={styles.cardText}>
            Acesse rapidamente as aprovações de cadastro e, futuramente, a gestão
            de aulas e devocionais.
          </Text>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/admin/devotionals/new" as any)}
          >
            <Text style={styles.buttonOutlineText}>Criar devocional</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/devotionals" as any)}
          >
            <Text style={styles.buttonOutlineText}>Gerenciar devocionais</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/admin/lessons/new" as any)}
          >
            <Text style={styles.buttonOutlineText}>Criar nova aula</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/manager/pending-reservations" as any)}
          >
            <Text style={styles.buttonOutlineText}>Ver reservas de aula pendentes</Text>
          </Pressable>

          <Pressable
            style={styles.button}
            onPress={() => router.push("/manager/pending-users" as any)}
          >
            <Text style={styles.buttonText}>Aprovar usuários pendentes</Text>
          </Pressable>
        </View>
      )}

      {status === "aprovado" && isAdmin && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Painel do Administrador</Text>
          <Text style={styles.cardText}>
            Atalhos para aprovações e gerenciamento completo de usuários.
          </Text>

          <Pressable
            style={styles.button}
            onPress={() => router.push("/admin/pending-users" as any)}
          >
            <Text style={styles.buttonText}>Aprovar usuários pendentes</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/admin/users" as any)}
          >
            <Text style={styles.buttonOutlineText}>Gerenciar todos os usuários</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/admin/lessons/new" as any)}
          >
            <Text style={styles.buttonOutlineText}>Criar nova aula</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/manager/pending-reservations" as any)}
          >
            <Text style={styles.buttonOutlineText}>Ver reservas de aula pendentes</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/admin/devotionals/new" as any)}
          >
            <Text style={styles.buttonOutlineText}>Criar devocional</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/devotionals" as any)}
          >
            <Text style={styles.buttonOutlineText}>Gerenciar devocionais</Text>
          </Pressable>
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
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  welcome: {
    color: "#9ca3af",
    fontSize: 14,
  },
  name: {
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 2,
  },
  infoLine: {
    color: "#9ca3af",
    marginTop: 4,
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
  card: {
    backgroundColor: "#020617",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 16,
    marginBottom: 16,
  },
  cardWarning: {
    backgroundColor: "#451a03",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#92400e",
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  cardText: {
    color: "#d1d5db",
    fontSize: 13,
    marginBottom: 12,
  },
  cardTextMuted: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 12,
  },
  cardPreview: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 8,
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
  footer: {
    marginTop: 24,
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
