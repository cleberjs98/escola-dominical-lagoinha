import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import { AppBackground } from "../../../components/layout/AppBackground";
import { AppButton } from "../../../components/ui/AppButton";
import { Card } from "../../../components/ui/Card";
import { getPendingCounts } from "../../../lib/adminStats";
import { listRecentAvisosForUser } from "../../../lib/avisos";
import { listDevotionalsForAdmin } from "../../../lib/devotionals";
import type { Aviso } from "../../../types/aviso";
import type { Devotional } from "../../../types/devotional";
import type { AppTheme } from "../../../types/theme";

export default function ManagerDashboardScreen() {
  const router = useRouter();
  const { firebaseUser, isInitializing } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [pendingUsers, setPendingUsers] = useState<number | null>(null);
  const [pendingReservations, setPendingReservations] = useState<number | null>(null);
  const [devotionalCount, setDevotionalCount] = useState<number | null>(null);
  const [avisosRecentes, setAvisosRecentes] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser && !isInitializing) {
      router.replace("/auth/login");
      return;
    }
    void loadData();
  }, [firebaseUser, isInitializing]);

  async function loadData() {
    try {
      setLoading(true);
      const [pending, devos, avisos] = await Promise.all([
        getPendingCounts(),
        listDevotionalsForAdmin(),
        listRecentAvisosForUser("administrador"),
      ]);

      setPendingUsers(pending.pendingUsers);
      setPendingReservations(pending.pendingReservations);
      setDevotionalCount(devos?.published?.length ?? 0);
      setAvisosRecentes(avisos.slice(0, 3));
    } catch (error) {
      console.error("[ManagerDashboard] Erro ao carregar", error);
      Alert.alert("Erro", "Nao foi possivel carregar os dados do dashboard.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando dashboard...</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Dashboard (Gestor)</Text>

        <View style={styles.grid}>
          <Card title="Usuarios pendentes" subtitle="Aguardando aprovacao">
            <Text style={styles.kpiValue}>{pendingUsers ?? 0}</Text>
            <AppButton title="Revisar" onPress={() => router.push("/manager/pending-users" as any)} />
          </Card>

          <Card title="Reservas pendentes" subtitle="Aulas aguardando decisao">
            <Text style={styles.kpiValue}>{pendingReservations ?? 0}</Text>
            <AppButton title="Revisar" onPress={() => router.push("/manager/pending-reservations" as any)} />
          </Card>

          <Card title="Devocionais publicados" subtitle="Total atual">
            <Text style={styles.kpiValue}>{devotionalCount ?? 0}</Text>
          </Card>
        </View>

        <Card title="Avisos recentes" subtitle="Resumo dos comunicados">
          {avisosRecentes.length === 0 ? (
            <Text style={styles.empty}>Nenhum aviso recente.</Text>
          ) : (
            avisosRecentes.map((aviso) => (
              <View key={aviso.id} style={styles.avisoRow}>
                <Text style={[styles.avisoTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  {aviso.titulo}
                </Text>
                <Text style={[styles.avisoMeta, { color: theme.colors.muted }]} numberOfLines={1}>
                  {aviso.destino} • {aviso.status}
                </Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </AppBackground>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingVertical: 24,
      gap: 12,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      color: theme.colors.text,
      marginTop: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.text,
    },
    grid: {
      gap: 12,
      marginTop: 8,
    },
    kpiValue: {
      fontSize: 32,
      fontWeight: "800",
      color: theme.colors.text,
      marginVertical: 8,
    },
    empty: {
      color: theme.colors.muted || theme.colors.text,
      fontSize: 13,
    },
    avisoRow: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border || theme.colors.card,
    },
    avisoTitle: {
      fontSize: 14,
      fontWeight: "700",
    },
    avisoMeta: {
      fontSize: 12,
    },
  });
}
