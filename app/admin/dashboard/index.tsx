// app/admin/dashboard/index.tsx - dashboard admin com UI compartilhada
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import { getSystemStats, type SystemStats, getPendingCounts } from "../../../lib/adminStats";
import { Card } from "../../../components/ui/Card";
import { AppButton } from "../../../components/ui/AppButton";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useTheme } from "../../../hooks/useTheme";

type PendingCounts = {
  pendingUsers: number;
  pendingReservations: number;
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { user, isInitializing, isAuthenticated } = useAuth();
  const { themeSettings } = useTheme();

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [pendingCounts, setPendingCounts] = useState<PendingCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated || user?.papel !== "administrador") {
      Alert.alert("Sem permissão", "Apenas administradores podem acessar este dashboard.");
      router.replace("/");
      return;
    }

    async function load() {
      try {
        setIsLoading(true);
        const [st, pending] = await Promise.all([getSystemStats(), getPendingCounts()]);
        setStats(st);
        setPendingCounts(pending);
      } catch (error) {
        console.error("Erro ao carregar dashboard admin:", error);
        Alert.alert("Erro", "Não foi possível carregar os dados do dashboard.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [isAuthenticated, isInitializing, router, user?.papel]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
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
      <Card title="Resumo do sistema" subtitle="Totais por módulo e por papel.">
        {stats ? (
          <View style={styles.grid}>
            <StatTile label="Usuários" value={stats.totalUsers} />
            <StatTile label="Alunos" value={stats.totalUsersByRole.aluno} />
            <StatTile label="Professores" value={stats.totalUsersByRole.professor} />
            <StatTile label="Coordenadores" value={stats.totalUsersByRole.coordenador} />
            <StatTile label="Admins" value={stats.totalUsersByRole.administrador} />
            <StatTile label="Aulas" value={stats.totalLessons} />
            <StatTile label="Devocionais" value={stats.totalDevotionals} />
            <StatTile label="Avisos" value={stats.totalAvisos} />
          </View>
        ) : (
          <EmptyState title="Sem dados disponíveis." />
        )}
      </Card>

      <Card title="Aprovações pendentes" subtitle="Usuários e reservas aguardando decisão.">
        {pendingCounts ? (
          <View style={styles.row}>
            <StatTile label="Usuários pendentes" value={pendingCounts.pendingUsers} />
            <StatTile label="Reservas pendentes" value={pendingCounts.pendingReservations} />
          </View>
        ) : (
          <EmptyState title="Sem pendências agora." />
        )}
        <View style={styles.actions}>
          <AppButton
            title="Aprovar usuários"
            variant="primary"
            fullWidth={false}
            onPress={() => router.push("/manager/pending-users" as any)}
          />
          <AppButton
            title="Aprovar reservas"
            variant="secondary"
            fullWidth={false}
            onPress={() => router.push("/manager/pending-reservations" as any)}
          />
        </View>
      </Card>

      <Card title="Atalhos rápidos" subtitle="Acesse as principais telas de gestão.">
        <View style={styles.actions}>
          <AppButton
            title="Gerenciar aulas"
            variant="outline"
            fullWidth={false}
            onPress={() => router.push("/admin/lessons/new" as any)}
          />
          <AppButton
            title="Gerenciar devocionais"
            variant="outline"
            fullWidth={false}
            onPress={() => router.push("/admin/devotionals/new" as any)}
          />
          <AppButton
            title="Gerenciar avisos"
            variant="outline"
            fullWidth={false}
            onPress={() => router.push("/avisos" as any)}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <View style={tileStyles.tile}>
      <Text style={tileStyles.label}>{label}</Text>
      <Text style={tileStyles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#020617" },
  loadingText: { color: "#e5e7eb", marginTop: 8 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
});

const tileStyles = StyleSheet.create({
  tile: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#0b1224",
    minWidth: 120,
    flexGrow: 1,
  },
  label: {
    color: "#94a3b8",
    fontSize: 12,
  },
  value: {
    color: "#e5e7eb",
    fontSize: 18,
    fontWeight: "700",
  },
});
