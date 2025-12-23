// app/devotionals/index.tsx - lista principal de devocionais (tab "Devocional")
import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";

import { AppButton } from "../../components/ui/AppButton";
import { DevotionalListItem } from "../../components/devotionals/DevotionalListItem";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { AppBackground } from "../../components/layout/AppBackground";
import type { Devotional } from "../../types/devotional";
import { DevotionalStatus } from "../../types/devotional";
import {
  listDevotionalsForAdmin,
  listAvailableAndPublishedForProfessor,
  listPublishedDevotionals,
} from "../../lib/devotionals";
import { formatDate } from "../../utils/publishAt";
import { AppCardStatusVariant } from "../../components/common/AppCard";
import type { AppTheme } from "../../types/theme";
import { useScreenRefresh } from "../../hooks/useScreenRefresh";

type Role = "aluno" | "professor" | "coordenador" | "administrador" | "admin" | undefined;
type DateOrder = "asc" | "desc";
type DevotionalFilter = "todos" | "disponiveis" | "publicados" | "pendentes";
type NormalizedDevotionalStatus = "disponivel" | "publicado" | "rascunho";

const DEVOTIONAL_STATUS = {
  DISPONIVEL: "disponivel",
  PUBLICADO: "publicado",
} as const;

export const options = {
  title: "Devocionais",
  headerBackVisible: true,
};

export default function DevotionalsScreen() {
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const role = (user?.papel as Role) || "aluno";
  const isAdminOrCoordinator = role === "coordenador" || role === "administrador" || role === "admin";

  if (isInitializing || !firebaseUser || !user) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando devocionais...</Text>
        </View>
      </AppBackground>
    );
  }

  if (isAdminOrCoordinator) {
    return <AdminDevotionalsTab uid={firebaseUser.uid} />;
  }

  if (role === "professor") {
    return <ProfessorDevotionalsTab />;
  }

  return <StudentDevotionalsTab />;
}

// =========================
// Admin / Coordenador
// =========================
function AdminDevotionalsTab({ uid }: { uid: string }) {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [sections, setSections] = useState<Awaited<ReturnType<typeof listDevotionalsForAdmin>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [filter, setFilter] = useState<DevotionalFilter>("disponiveis");
  const [dateOrder, setDateOrder] = useState<DateOrder>("desc");

  const loadData = useCallback(async () => {
    try {
      setLoading((prev) => prev || !hasLoaded);
      const data = await listDevotionalsForAdmin();
      setSections(data);
      setHasLoaded(true);
    } catch (error) {
      console.error("[Devotionals][Admin] Erro ao carregar:", error);
      Alert.alert("Erro", "Nao foi possivel carregar os devocionais.");
    } finally {
      setLoading(false);
    }
  }, [hasLoaded]);

  const { refreshing, refresh } = useScreenRefresh(loadData);

  const allDevotionals = useMemo(() => {
    if (!sections) return [];
    const combined: Devotional[] = [
      ...(sections.drafts ?? []),
      ...(sections.available ?? []),
      ...(sections.published ?? []),
    ];
    const map = new Map<string, Devotional>();
    combined.forEach((devo) => {
      if (!map.has(devo.id)) {
        map.set(devo.id, devo);
      }
    });
    return Array.from(map.values());
  }, [sections]);

  const filteredDevotionals = useMemo(() => {
    const base = allDevotionals
      .filter((devo) => {
        const status = (devo.status ?? "") as string;
        const creatorId = (devo as any).criado_por_id as string | undefined;

        switch (filter) {
          case "disponiveis":
            return status === DEVOTIONAL_STATUS.DISPONIVEL;
          case "publicados":
            return status === DEVOTIONAL_STATUS.PUBLICADO;
          case "pendentes":
            return status !== DEVOTIONAL_STATUS.DISPONIVEL && status !== DEVOTIONAL_STATUS.PUBLICADO;
          case "todos":
          default:
            return true;
        }
      })
      .sort((a, b) => {
        const da = devotionalToMillis(a);
        const db = devotionalToMillis(b);
        return dateOrder === "asc" ? da - db : db - da;
      });
    return base;
  }, [allDevotionals, dateOrder, filter, uid]);

  function toggleDateOrder() {
    setDateOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  if (loading && !hasLoaded) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando devocionais...</Text>
        </View>
      </AppBackground>
    );
  }

  const chipColors = {
    chipBg: theme.colors.card,
    chipActive: theme.colors.primary,
    chipBorder: theme.colors.border,
    text: theme.colors.text,
  };

  return (
    <AppBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accent} />}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Devocionais - Gestao</Text>
          <AppButton title="Criar devocional" variant="primary" fullWidth={false} onPress={() => router.push("/admin/devotionals/new" as any)} />
        </View>

        <View style={{ gap: 12 }}>
          <View style={styles.filtersRow}>
            {renderFilterChip("Todos", "todos", filter, setFilter, chipColors)}
            {renderFilterChip("Disponiveis", "disponiveis", filter, setFilter, chipColors)}
            {renderFilterChip("Publicados", "publicados", filter, setFilter, chipColors)}
            {renderFilterChip("Pendentes", "pendentes", filter, setFilter, chipColors)}
          </View>

          <View style={styles.orderToggleRow}>
            <Text style={styles.sectionTitle}>Devocionais</Text>
            <TouchableOpacity
              onPress={toggleDateOrder}
              style={[styles.orderToggleButton, { borderColor: chipColors.chipBorder, backgroundColor: chipColors.chipBg }]}
            >
              <Text style={styles.orderToggleText}>Ordenar por data: {dateOrder === "desc" ? "desc" : "asc"}</Text>
            </TouchableOpacity>
          </View>

          {filteredDevotionals.length === 0 ? (
            <Text style={styles.empty}>Nenhum devocional encontrado.</Text>
          ) : (
            filteredDevotionals.map((devo) => {
              const status = normalizeStatusForFilter(devo.status);
              const subtitle = `${formatDevotionalDate(devo.data_devocional)} - ${devotionalStatusLabel(status)}`;
              return (
                <DevotionalListItem
                  key={devo.id}
                  title={devo.titulo}
                  subtitle={subtitle}
                  statusLabel={devotionalStatusLabel(status)}
                  statusVariant={devotionalStatusVariant(status)}
                  onPress={() => router.push(`/devotionals/${devo.id}` as any)}
                />
              );
            })
          )}
        </View>
      </ScrollView>
    </AppBackground>
  );
}

// =========================
// Professor
// =========================
function ProfessorDevotionalsTab() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [list, setList] = useState<Devotional[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [order, setOrder] = useState<DateOrder>("desc");

  const loadData = useCallback(async () => {
    try {
      setLoading((prev) => prev || !hasLoaded);
      const devos = await listAvailableAndPublishedForProfessor();
      setList(devos);
      setHasLoaded(true);
    } catch (error) {
      console.error("[Devotionals][Professor] Erro ao carregar:", error);
      Alert.alert("Erro", "Nao foi possivel carregar os devocionais.");
    } finally {
      setLoading(false);
    }
  }, [hasLoaded]);

  const { refreshing, refresh } = useScreenRefresh(loadData);

  if (loading && !hasLoaded) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando devocionais...</Text>
        </View>
      </AppBackground>
    );
  }

  const sorted = [...list].sort((a, b) => {
    const da = devotionalToMillis(a);
    const db = devotionalToMillis(b);
    return order === "asc" ? da - db : db - da;
  });

  return (
    <AppBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accent} />}>
        <View style={styles.orderToggleRow}>
          <Text style={styles.sectionTitle}>Devocionais</Text>
          <TouchableOpacity onPress={() => setOrder((prev) => (prev === "asc" ? "desc" : "asc"))} style={styles.orderToggleButton}>
            <Text style={styles.orderToggleText}>Ordenar por data: {order === "desc" ? "desc" : "asc"}</Text>
          </TouchableOpacity>
        </View>

        {sorted.length === 0 ? (
          <EmptyState title="Nenhum devocional disponivel no momento." />
        ) : (
          sorted.map((devo) => {
            const status = normalizeStatusForFilter(devo.status);
            const subtitle = `${formatDevotionalDate(devo.data_devocional)} - ${devotionalStatusLabel(status)}`;
            return (
              <DevotionalListItem
                key={devo.id}
                title={devo.titulo}
                subtitle={subtitle}
                statusLabel={devotionalStatusLabel(status)}
                statusVariant={devotionalStatusVariant(status)}
                onPress={() => router.push(`/devotionals/${devo.id}` as any)}
              />
            );
          })
        )}
      </ScrollView>
    </AppBackground>
  );
}

// =========================
// Aluno / publico
// =========================
function StudentDevotionalsTab() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [list, setList] = useState<Devotional[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [order, setOrder] = useState<DateOrder>("desc");

  const loadData = useCallback(async () => {
    try {
      setLoading((prev) => prev || !hasLoaded);
      const published = await listPublishedDevotionals();
      setList(published);
      setHasLoaded(true);
    } catch (error) {
      console.error("[Devotionals][Aluno] Erro ao carregar:", error);
      Alert.alert("Erro", "Nao foi possivel carregar os devocionais.");
    } finally {
      setLoading(false);
    }
  }, [hasLoaded]);

  const { refreshing, refresh } = useScreenRefresh(loadData);

  if (loading && !hasLoaded) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando devocionais...</Text>
        </View>
      </AppBackground>
    );
  }

  const sorted = [...list].sort((a, b) => {
    const da = devotionalToMillis(a);
    const db = devotionalToMillis(b);
    return order === "asc" ? da - db : db - da;
  });

  return (
    <AppBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accent} />}>
        <View style={styles.orderToggleRow}>
          <Text style={styles.sectionTitle}>Devocionais</Text>
          <TouchableOpacity onPress={() => setOrder((prev) => (prev === "asc" ? "desc" : "asc"))} style={styles.orderToggleButton}>
            <Text style={styles.orderToggleText}>Ordenar por data: {order === "desc" ? "desc" : "asc"}</Text>
          </TouchableOpacity>
        </View>

        {sorted.length === 0 ? (
          <EmptyState title="Nenhum devocional publicado no momento." />
        ) : (
          sorted.map((devo) => {
            const status = normalizeStatusForFilter(devo.status);
            const subtitle = `${formatDevotionalDate(devo.data_devocional)} - ${devotionalStatusLabel(status)}`;
            return (
              <DevotionalListItem
                key={devo.id}
                title={devo.titulo}
                subtitle={subtitle}
                statusLabel={devotionalStatusLabel(status)}
                statusVariant={devotionalStatusVariant(status)}
                onPress={() => router.push(`/devotionals/${devo.id}` as any)}
              />
            );
          })
        )}
      </ScrollView>
    </AppBackground>
  );
}

// =========================
// Helpers
// =========================
function renderFilterChip(
  label: string,
  value: DevotionalFilter,
  current: DevotionalFilter,
  onChange: (v: DevotionalFilter) => void,
  colors: { chipBg: string; chipActive: string; chipBorder?: string; text: string }
) {
  const active = current === value;
  return (
    <Pressable
      key={value}
      style={[
        stylesChip.chipBase,
        { borderColor: colors.chipBorder, backgroundColor: colors.chipBg },
        active && { backgroundColor: colors.chipActive, borderColor: colors.chipActive },
      ]}
      onPress={() => onChange(value)}
    >
      <Text style={[stylesChip.chipText, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function normalizeStatusForFilter(status: DevotionalStatus | string): NormalizedDevotionalStatus {
  const s = `${status ?? ""}`.toLowerCase().trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/s$/, "");

  if (s === DEVOTIONAL_STATUS.DISPONIVEL) return "disponivel";
  if (s === DEVOTIONAL_STATUS.PUBLICADO) return "publicado";
  return "rascunho";
}

function devotionalStatusLabel(status: NormalizedDevotionalStatus) {
  if (status === "disponivel") return "Disponivel";
  if (status === "publicado") return "Publicado";
  if (status === "rascunho") return "Pendente";
  return status;
}

function devotionalStatusVariant(status: NormalizedDevotionalStatus): AppCardStatusVariant {
  switch (status) {
    case "publicado":
      return "success";
    case "disponivel":
      return "info";
    case "rascunho":
    default:
      return "warning";
  }
}

function devotionalToMillis(dev: any): number {
  const raw = dev?.data_devocional || dev?.data || dev?.created_at;
  if (!raw) return 0;

  if (raw?.toMillis && typeof raw.toMillis === "function") {
    return raw.toMillis();
  }
  const d = new Date(raw);
  const time = d.getTime();
  if (Number.isNaN(time)) return 0;
  return time;
}

function formatDevotionalDate(value: string): string {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return formatDate(new Date(Number(year), Number(month) - 1, Number(day)));
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 32,
      gap: 12,
    },
    center: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: { color: theme.colors.text, marginTop: 12 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    sectionTitle: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    empty: {
      color: theme.colors.muted || theme.colors.text,
    },
    filtersRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 4,
    },
    orderToggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    orderToggleButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    orderToggleText: {
      color: theme.colors.text,
      fontWeight: "600",
    },
  });
}

const stylesChip = StyleSheet.create({
  chipBase: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontWeight: "600",
  },
});
