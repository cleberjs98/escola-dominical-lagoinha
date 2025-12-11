import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";

import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { firebaseDb } from "../../lib/firebase";
import { getDevotionalOfTheDay } from "../../lib/devotionals";
import { listRecentAvisosForUser } from "../../lib/avisos";
import { getPendingInsights, getSimpleKpis } from "../../lib/adminStats";
import type { Devotional } from "../../types/devotional";
import type { Aviso } from "../../types/aviso";
import { DashboardSection } from "../../components/dashboard/DashboardSection";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { ManagementCard } from "../../components/dashboard/ManagementCard";
import { AppCard } from "../../components/common/AppCard";
import { DevocionalCard } from "../../components/cards/DevocionalCard";
import { Card } from "../../components/ui/Card";
import { AppButton } from "../../components/ui/AppButton";
import { EmptyState } from "../../components/ui/EmptyState";

type LayoutConfig = {
  showDevotional: boolean;
  showAvisosRecentes: boolean;
  homeOrder: string[];
};

const defaultLayoutConfig: LayoutConfig = {
  showDevotional: true,
  showAvisosRecentes: true,
  homeOrder: ["pendencias", "conteudos", "devocional", "avisos", "analytics"],
};

export default function CoordinatorDashboardScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const papel = user?.papel;
  const isAdmin = papel === "administrador";
  const isCoordinator = papel === "coordenador";
  const isAllowed = useMemo(() => isAdmin || isCoordinator, [isAdmin, isCoordinator]);

  const [isLoading, setIsLoading] = useState(true);
  const [pending, setPending] = useState<Awaited<ReturnType<typeof getPendingInsights>> | null>(
    null
  );
  const [kpis, setKpis] = useState<Awaited<ReturnType<typeof getSimpleKpis>> | null>(null);
  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [recentAvisos, setRecentAvisos] = useState<Aviso[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(defaultLayoutConfig);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (!isAllowed) {
      Alert.alert("Sem permissão", "Apenas coordenadores ou administradores.");
      router.replace("/" as any);
      return;
    }
    void loadDashboard();
  }, [firebaseUser, isInitializing, isAllowed, router]);

  async function loadDashboard() {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const [layout, pendingData, kpisData, devo, avisos] = await Promise.all([
        loadLayoutSettings(),
        getPendingInsights(),
        getSimpleKpis(),
        getDevotionalOfTheDay(today),
        listRecentAvisosForUser(user ? ({ ...user, id: user.id || firebaseUser?.uid } as any) : null),
      ]);

      setLayoutConfig(layout);
      setPending(pendingData);
      setKpis(kpisData);
      setDevotional(devo);
      setRecentAvisos(avisos);
    } catch (error) {
      console.error("Erro ao carregar dashboard coordenador/admin:", error);
      Alert.alert("Erro", "Não foi possível carregar o dashboard.");
    } finally {
      setIsLoading(false);
    }
  }

  const bg = themeSettings?.cor_fundo || "#020617";
  const orderedSections = layoutConfig.homeOrder.filter((key) => {
    if (key === "devocional") return layoutConfig.showDevotional;
    if (key === "avisos") return layoutConfig.showAvisosRecentes;
    return true;
  });

  if (isInitializing || isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={styles.content}
    >
      {orderedSections.map((section) => {
        if (section === "pendencias") return renderPendencias();
        if (section === "conteudos") return renderConteudos();
        if (section === "devocional") return layoutConfig.showDevotional ? renderDevocional() : null;
        if (section === "avisos") return layoutConfig.showAvisosRecentes ? renderAvisos() : null;
        if (section === "analytics") return renderAnalytics();
        return null;
      })}

      {isAdmin ? renderAdministracao() : null}
    </ScrollView>
  );

  function renderPendencias() {
    return (
      <DashboardSection
        key="pendencias"
        title="Pendências"
        description="Acompanhe aprovações e agendamentos."
      >
        <View style={styles.grid}>
          <KpiCard
            label="Usuários pendentes"
            value={pending?.pendingUsers ?? 0}
            icon="👥"
            onPress={() => router.push("/manager/pending-users" as any)}
          />
          <KpiCard
            label="Reservas pendentes"
            value={pending?.pendingReservations ?? 0}
            icon="📚"
            onPress={() => router.push("/manager/pending-reservations" as any)}
          />
          <KpiCard
            label="Aulas agendadas"
            value={pending?.scheduledLessons ?? 0}
            icon="⏰"
            onPress={() => router.push("/(tabs)/lessons" as any)}
          />
          <KpiCard
            label="Devocionais agendados"
            value={pending?.scheduledDevotionals ?? 0}
            icon="🗓️"
            onPress={() => router.push("/(tabs)/devotionals" as any)}
          />
        </View>
      </DashboardSection>
    );
  }

  function renderConteudos() {
    return (
      <DashboardSection
        key="conteudos"
        title="Gerenciar conteúdos"
        description="Aulas, devocionais e avisos."
      >
        <View style={styles.grid}>
          <ManagementCard
            title="Gerenciar aulas"
            subtitle="Criar ou revisar aulas"
            icon="📘"
            onPress={() => router.push("/(tabs)/lessons" as any)}
          />
          <ManagementCard
            title="Gerenciar devocionais"
            subtitle="Criar ou publicar"
            icon="🙏"
            onPress={() => router.push("/(tabs)/devotionals" as any)}
          />
          <ManagementCard
            title="Gerenciar avisos"
            subtitle="Publicar comunicados"
            icon="📢"
            onPress={() => router.push("/avisos" as any)}
          />
        </View>
      </DashboardSection>
    );
  }

  function renderDevocional() {
    return (
      <DashboardSection
        key="devocional"
        title="Devocional do dia"
        description="Mesmo componente da home."
      >
        <Card
          title=""
          footer={
            <AppButton
              title="Ver todos"
              variant="outline"
              fullWidth={false}
              onPress={() => router.push("/(tabs)/devotionals" as any)}
            />
          }
        >
          {devotional ? (
            <DevocionalCard
              devotional={devotional}
              onPress={() => router.push(`/devotionals/${devotional.id}` as any)}
            />
          ) : (
            <EmptyState title="Nenhum devocional disponível." />
          )}
        </Card>
      </DashboardSection>
    );
  }

  function renderAvisos() {
    return (
      <DashboardSection
        key="avisos"
        title="Avisos recentes"
        description="Comunicados para coordenadores/admin."
        actionLabel="Ver todos"
        onPressAction={() => router.push("/avisos" as any)}
      >
        {recentAvisos.length === 0 ? (
          <EmptyState title="Nenhum aviso no momento." />
        ) : (
          recentAvisos.slice(0, 3).map((aviso) => (
            <AppCard
              key={aviso.id}
              title={aviso.titulo}
              subtitle={aviso.destino?.toUpperCase?.() || "Aviso"}
              statusLabel={aviso.status}
              statusVariant={aviso.status === "publicado" ? "success" : "warning"}
              onPress={() => router.push(`/avisos/edit/${aviso.id}` as any)}
            />
          ))
        )}
        <View style={styles.rowActions}>
          <AppButton
            title="Ver todos"
            variant="outline"
            fullWidth={false}
            onPress={() => router.push("/avisos" as any)}
          />
          {(isAdmin || isCoordinator) && (
            <AppButton
              title="Criar aviso"
              variant="primary"
              fullWidth={false}
              onPress={() => router.push("/avisos/new" as any)}
            />
          )}
        </View>
      </DashboardSection>
    );
  }

  function renderAnalytics() {
    return (
      <DashboardSection key="analytics" title="Analytics simples" description="KPIs rápidos.">
        <View style={styles.grid}>
          <KpiCard
            label="Aulas publicadas (30d)"
            value={kpis?.lessonsLast30Days ?? 0}
            icon="✅"
          />
          <KpiCard
            label="Devocionais publicados (30d)"
            value={kpis?.devotionalsLast30Days ?? 0}
            icon="📖"
          />
          <KpiCard label="Professores ativos" value={kpis?.activeProfessores ?? 0} icon="👩‍🏫" />
          <KpiCard label="Alunos ativos" value={kpis?.activeAlunos ?? 0} icon="🧑‍🎓" />
        </View>
      </DashboardSection>
    );
  }

  function renderAdministracao() {
    return (
      <DashboardSection
        key="administracao"
        title="Administração"
        description="Configurações avançadas."
      >
        <View style={styles.grid}>
          <ManagementCard
            title="Configurações de Layout/Tema"
            subtitle="Tema base e ordem da home"
            icon="🎨"
            onPress={() => router.push("/admin/layout" as any)}
          />
          <ManagementCard
            title="Dashboard admin"
            subtitle="Visão detalhada"
            icon="📊"
            onPress={() => router.push("/admin/dashboard" as any)}
          />
        </View>
      </DashboardSection>
    );
  }
}

async function loadLayoutSettings(): Promise<LayoutConfig> {
  try {
    const ref = doc(firebaseDb, "layout_settings", "global");
    const snap = await getDoc(ref);
    if (!snap.exists()) return defaultLayoutConfig;
    const data = snap.data() as Partial<LayoutConfig>;
    return {
      ...defaultLayoutConfig,
      ...data,
      homeOrder: Array.isArray(data.homeOrder) && data.homeOrder.length
        ? data.homeOrder
        : defaultLayoutConfig.homeOrder,
    };
  } catch (error) {
    console.warn("Não foi possível carregar layout_settings/global, usando padrão:", error);
    return defaultLayoutConfig;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  rowActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 8,
  },
});
