export const options = {
  title: "Admin",
};// app/admin/devotionals/index.tsx - lista de devocionais (admin/coordenador) com tema bordô
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View, Pressable, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

import { AppButton } from "../../../components/ui/AppButton";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import { listDevotionalsForAdmin } from "../../../lib/devotionals";
import { DevotionalStatus, type Devotional } from "../../../types/devotional";
import { formatDate } from "../../../utils/publishAt";
import { DevotionalListItem } from "../../../components/devotionals/DevotionalListItem";
import { AppCardStatusVariant } from "../../../components/common/AppCard";
import { AppBackground } from "../../../components/layout/AppBackground";
import { withAlpha } from "../../../theme/utils";
import type { AppTheme } from "../../../types/theme";

type Sections = Awaited<ReturnType<typeof listDevotionalsForAdmin>>;
type DevotionalFilter = "todos" | "disponiveis" | "publicados" | "pendentes";
type DateOrder = "asc" | "desc";
type NormalizedDevotionalStatus = "disponivel" | "publicado" | "rascunho";

const DEVOTIONAL_STATUS = {
  DISPONIVEL: "disponivel",
  PUBLICADO: "publicado",
} as const;

export default function AdminDevotionalsScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [sections, setSections] = useState<Sections | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DevotionalFilter>("disponiveis");
  const [dateOrder, setDateOrder] = useState<DateOrder>("desc");

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    const papel = user?.papel;
    if (papel !== "coordenador" && papel !== "administrador" && papel !== "admin") {
      Alert.alert("Sem permissão", "Apenas coordenador/admin podem acessar os devocionais.");
      router.replace("/(tabs)" as any);
      return;
    }
    void loadData();
  }, [firebaseUser, isInitializing, router, user?.papel]);

  async function loadData() {
    try {
      setLoading(true);
      const data = await listDevotionalsForAdmin();
      setSections(data);
    } catch (error) {
      console.error("[Devocionais][Lista] Erro ao carregar devocionais:", error);
      Alert.alert("Erro", "Não foi possível carregar os devocionais.");
    } finally {
      setLoading(false);
    }
  }

  const allDevotionals = useMemo(() => {
    if (!sections) return [];
    const drafts = (sections as any).scheduledDrafts ?? [];
    const combined = [...drafts, ...(sections.drafts ?? []), ...(sections.available ?? []), ...(sections.published ?? [])];
    const map = new Map<string, Devotional>();
    combined.forEach((devo) => {
      if (!map.has(devo.id)) map.set(devo.id, devo);
    });
    return Array.from(map.values());
  }, [sections]);

  const filteredDevotionals = useMemo(() => {
    const base = allDevotionals
      .filter((devo) => {
        const status = normalizeStatusForFilter(devo.status);
        switch (filter) {
          case "todos":
            return true;
          case "disponiveis":
            return status === DEVOTIONAL_STATUS.DISPONIVEL;
          case "publicados":
            return status === DEVOTIONAL_STATUS.PUBLICADO;
          case "pendentes":
            return status === "rascunho";
          default:
            return true;
        }
      })
      .sort((a, b) => {
        const da = devotionalToMillis(a);
        const db = devotionalToMillis(b);
        if (da === null || db === null) return 0;
        return dateOrder === "asc" ? da - db : db - da;
      });
    return base;
  }, [allDevotionals, dateOrder, filter]);

  function toggleDateOrder() {
    setDateOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  function renderFilterChip(label: string, value: DevotionalFilter) {
    const active = filter === value;
    return (
      <Pressable
        key={value}
        style={[styles.filterChip, active && styles.filterChipActive]}
        onPress={() => setFilter(value)}
      >
        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
      </Pressable>
    );
  }

  if (isInitializing || loading || !sections) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando devocionais...</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Devocionais - Gestão</Text>
          <AppButton title="Criar devocional" variant="primary" fullWidth={false} onPress={() => router.push("/admin/devotionals/new" as any)} />
        </View>

        <View style={{ gap: 12 }}>
          <View style={styles.filtersRow}>
            {renderFilterChip("Todos", "todos")}
            {renderFilterChip("Disponíveis", "disponiveis")}
            {renderFilterChip("Publicados", "publicados")}
            {renderFilterChip("Pendentes", "pendentes")}
          </View>

          <View style={styles.orderToggleRow}>
            <Text style={styles.sectionTitle}>Devocionais</Text>
            <TouchableOpacity onPress={toggleDateOrder} style={styles.orderToggleButton}>
              <Text style={styles.orderToggleText}>Ordenar por data: {dateOrder === "desc" ? "?" : "?"}</Text>
            </TouchableOpacity>
          </View>

          {filteredDevotionals.length === 0 ? (
            <Text style={styles.empty}>Nenhum devocional encontrado.</Text>
          ) : (
            filteredDevotionals.map((devo) => {
              const status = normalizeStatusForFilter(devo.status);
              const subtitle = `${formatDevotionalDate(devo.data_devocional)} • ${devotionalStatusLabel(status)}`;
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

function normalizeStatusForFilter(status: DevotionalStatus | string): NormalizedDevotionalStatus {
  const s = `${status ?? ""}`
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/s$/, "");

  if (s === DEVOTIONAL_STATUS.DISPONIVEL) return "disponivel";
  if (s === DEVOTIONAL_STATUS.PUBLICADO) return "publicado";
  return "rascunho";
}

function devotionalStatusLabel(status: NormalizedDevotionalStatus) {
  if (status === "disponivel") return "Disponível";
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

function formatDevotionalDate(value: string): string {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return formatDate(new Date(Number(year), Number(month) - 1, Number(day)));
}

function devotionalToMillis(dev: Devotional): number | null {
  const raw = (dev as any).data_devocional || (dev as any).data || (dev as any).created_at;
  if (!raw) return null;
  if (raw?.toMillis) return raw.toMillis();
  const d = new Date(raw);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "transparent" },
    content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 32, gap: 12, backgroundColor: "transparent" },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
      gap: 10,
    },
    loadingText: {
      color: theme.colors.text,
      marginTop: 12,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    title: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: "700",
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
    filterChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: withAlpha(theme.colors.border || theme.colors.card, 0.45),
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: withAlpha(theme.colors.card, 0.82),
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    filterChipText: {
      color: theme.colors.text,
      fontWeight: "600",
    },
    filterChipTextActive: {
      color: theme.colors.accent,
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
      borderColor: withAlpha(theme.colors.border || theme.colors.card, 0.45),
      backgroundColor: withAlpha(theme.colors.card, 0.82),
    },
    orderToggleText: {
      color: theme.colors.text,
      fontWeight: "600",
    },
  });
}
