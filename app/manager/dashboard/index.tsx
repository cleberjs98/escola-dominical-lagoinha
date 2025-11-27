import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import { getPendingCounts, getSystemStats } from "../../../lib/adminStats";

export default function CoordinatorDashboardScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const [pending, setPending] = useState({ pendingUsers: 0, pendingReservations: 0 });
  const [lessonsCount, setLessonsCount] = useState(0);
  const [devotionalCount, setDevotionalCount] = useState(0);
  const [newsCount, setNewsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const isAllowed = useMemo(
    () => user?.papel === "coordenador" || user?.papel === "administrador",
    [user?.papel]
  );

  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (!isInitializing && firebaseUser && !isAllowed) {
      Alert.alert("Sem permissão", "Apenas coordenadores ou administradores.");
      router.replace("/");
      return;
    }
    if (!isInitializing && firebaseUser && isAllowed) {
      void loadData();
    }
  }, [firebaseUser, isInitializing, isAllowed, router]);

  async function loadData() {
    try {
      setIsLoading(true);
      const [pendingCounts, stats] = await Promise.all([getPendingCounts(), getSystemStats()]);
      setPending(pendingCounts);
      setLessonsCount(stats.totalLessons);
      setDevotionalCount(stats.totalDevotionals);
      setNewsCount(stats.totalNews);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isInitializing || isLoading || !isAllowed) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dashboard do Coordenador</Text>
      <Text style={styles.subtitle}>
        Visão rápida: aprovações pendentes e conteúdo.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Aprovações pendentes</Text>
        <View style={styles.row}>
          <StatBadge label="Usuários pendentes" value={pending.pendingUsers} color="#f97316" />
          <StatBadge label="Reservas pendentes" value={pending.pendingReservations} color="#38bdf8" />
        </View>
        <View style={styles.row}>
          <Pressable
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => router.push("/manager/pending-users" as any)}
          >
            <Text style={styles.buttonText}>Aprovar usuários</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => router.push("/manager/pending-reservations" as any)}
          >
            <Text style={styles.buttonText}>Reservas de aula</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Conteúdo</Text>
        <View style={styles.row}>
          <StatBadge label="Aulas" value={lessonsCount} color="#22c55e" />
          <StatBadge label="Devocionais" value={devotionalCount} color="#facc15" />
          <StatBadge label="Notícias" value={newsCount} color="#a855f7" />
        </View>
        <View style={styles.row}>
          <Pressable
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => router.push("/admin/lessons/new" as any)}
          >
            <Text style={styles.buttonText}>Criar aula</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => router.push("/admin/devotionals/new" as any)}
          >
            <Text style={styles.buttonText}>Criar devocional</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => router.push("/news/my-news" as any)}
          >
            <Text style={styles.buttonText}>Minhas notícias</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeLabel, { color }]}>{label}</Text>
      <Text style={styles.badgeValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 32,
    gap: 12,
  },
  title: {
    color: "#e5e7eb",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 8,
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
  card: {
    backgroundColor: "#0b1224",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: "#22c55e",
  },
  buttonText: {
    color: "#022c22",
    fontWeight: "700",
    fontSize: 14,
  },
  badge: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 90,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeValue: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
  },
});
