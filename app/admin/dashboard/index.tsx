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

type Pending = {
  pendingUsers: number;
  pendingReservations: number;
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [pending, setPending] = useState<Pending>({ pendingUsers: 0, pendingReservations: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = useMemo(() => user?.papel === "administrador", [user?.papel]);

  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (!isInitializing && firebaseUser && !isAdmin) {
      Alert.alert("Sem permissão", "Apenas administradores podem acessar este dashboard.");
      router.replace("/");
      return;
    }
    if (!isInitializing && firebaseUser && isAdmin) {
      void loadData();
    }
  }, [firebaseUser, isInitializing, isAdmin, router]);

  async function loadData() {
    try {
      setIsLoading(true);
      const [sysStats, pend] = await Promise.all([getSystemStats(), getPendingCounts()]);
      setStats(sysStats);
      setPending(pend);
    } catch (err) {
      console.error("Erro ao carregar estatísticas:", err);
      Alert.alert("Erro", "Não foi possível carregar estatísticas.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isInitializing || isLoading || !isAdmin) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dashboard do Administrador</Text>
      <Text style={styles.subtitle}>
        Visão geral do sistema, aprovações pendentes e atalhos rápidos.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumo do sistema</Text>
        <View style={styles.rowWrap}>
          <StatBadge label="Usuários" value={stats?.totalUsers ?? 0} color="#22c55e" />
          <StatBadge label="Alunos" value={stats?.totalUsersByRole?.aluno ?? 0} color="#38bdf8" />
          <StatBadge label="Professores" value={stats?.totalUsersByRole?.professor ?? 0} color="#a855f7" />
          <StatBadge label="Coordenadores" value={stats?.totalUsersByRole?.coordenador ?? 0} color="#f97316" />
          <StatBadge label="Admins" value={stats?.totalUsersByRole?.administrador ?? 0} color="#ef4444" />
          <StatBadge label="Aulas" value={stats?.totalLessons ?? 0} color="#c084fc" />
          <StatBadge label="Devocionais" value={stats?.totalDevotionals ?? 0} color="#22c55e" />
          <StatBadge label="Notícias" value={stats?.totalNews ?? 0} color="#facc15" />
        </View>
      </View>

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
            <Text style={styles.buttonText}>Ver aprovações de usuários</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => router.push("/manager/pending-reservations" as any)}
          >
            <Text style={styles.buttonText}>Ver reservas pendentes</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Atalhos rápidos (Admin)</Text>
        <View style={styles.rowWrap}>
          <QuickLink label="Personalizar tema" onPress={() => router.push("/admin/theme" as any)} />
          <QuickLink
            label="Backgrounds"
            onPress={() => router.push("/admin/backgrounds" as any)}
          />
          <QuickLink
            label="Navegação"
            onPress={() => router.push("/admin/navigation" as any)}
          />
          <QuickLink label="Layouts" onPress={() => router.push("/admin/layouts" as any)} />
          <QuickLink
            label="Criar aula"
            onPress={() => router.push("/admin/lessons/new" as any)}
          />
          <QuickLink
            label="Criar devocional"
            onPress={() => router.push("/admin/devotionals/new" as any)}
          />
          <QuickLink label="Minhas notícias" onPress={() => router.push("/news/my-news" as any)} />
          <QuickLink label="Aprovar usuários" onPress={() => router.push("/manager/pending-users" as any)} />
          <QuickLink label="Aprovar reservas" onPress={() => router.push("/manager/pending-reservations" as any)} />
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

function QuickLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.quickLink]} onPress={onPress}>
      <Text style={styles.quickLinkText}>{label}</Text>
    </Pressable>
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
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
  quickLink: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#0f172a",
  },
  quickLinkText: {
    color: "#e5e7eb",
    fontWeight: "700",
    fontSize: 14,
  },
});
