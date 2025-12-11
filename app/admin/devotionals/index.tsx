// app/admin/devotionals/index.tsx - lista de gestão de devocionais (layout unificado)
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View, Pressable, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

import { AppButton } from "../../../components/ui/AppButton";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import {
  listDevotionalsForAdmin,
} from "../../../lib/devotionals";
import { DevotionalStatus, type Devotional } from "../../../types/devotional";
import { formatDate } from "../../../utils/publishAt";
import { DevotionalListItem } from "../../../components/devotionals/DevotionalListItem";
import { AppCardStatusVariant } from "../../../components/common/AppCard";

type Sections = Awaited<ReturnType<typeof listDevotionalsForAdmin>>;
type DevotionalFilter = "available" | "published" | "pending" | "mine";
type DateOrder = "asc" | "desc";
type NormalizedDevotionalStatus = "disponivel" | "publicado" | "pendente";

export default function AdminDevotionalsScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [sections, setSections] = useState<Sections | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DevotionalFilter>("available");
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
    const scheduled = sections.scheduledDrafts ?? [];
    const drafts = sections.drafts ?? [];
    const published = sections.published ?? [];
    const combined = [...scheduled, ...drafts, ...published];
    const map = new Map<string, Devotional>();
    combined.forEach((devo) => {
      if (!map.has(devo.id)) {
        map.set(devo.id, devo);
      }
    });
    return Array.from(map.values());
  }, [sections]);

  const filteredDevotionals = useMemo(() => {
    return allDevotionals
      .filter((devo) => {
        const status = normalizeDevotionalStatus(devo.status);
        const isMine = devo.criado_por_id === firebaseUser?.uid;
        switch (filter) {
          case "available":
            return status === "disponivel";
          case "published":
            return status === "publicado";
          case "pending":
            return status === "pendente";
          case "mine":
            return isMine;
          default:
            return true;
        }
      })
      .sort((a, b) => {
        const da = devotionalDateValue(a.data_devocional);
        const db = devotionalDateValue(b.data_devocional);
        if (dateOrder === "asc") return da - db;
        return db - da;
      });
  }, [allDevotionals, dateOrder, filter, firebaseUser?.uid]);

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando devocionais...</Text>
      </View>
    );
  }

  const bg = themeSettings?.cor_fundo || "#020617";

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={styles.content}>
      <Header title="Devocionais - Gestão" onCreate={() => router.push("/admin/devotionals/new" as any)} />

      <View style={{ gap: 12 }}>
        <View style={styles.filtersRow}>
          {renderFilterChip("Disponíveis", "available")}
          {renderFilterChip("Publicados", "published")}
          {renderFilterChip("Pendentes", "pending")}
          {renderFilterChip("Meus devocionais", "mine")}
        </View>

        <View style={styles.orderToggleRow}>
          <Text style={styles.sectionTitle}>Devocionais</Text>
          <TouchableOpacity onPress={toggleDateOrder} style={styles.orderToggleButton}>
            <Text style={styles.orderToggleText}>
              Ordenar por data: {dateOrder === "desc" ? "↓" : "↑"}
            </Text>
          </TouchableOpacity>
        </View>

        {filteredDevotionals.length === 0 ? (
          <Text style={styles.empty}>Nenhum devocional encontrado.</Text>
        ) : (
          filteredDevotionals.map((devo) => {
            const status = normalizeDevotionalStatus(devo.status);
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
  );
}

function normalizeDevotionalStatus(status: DevotionalStatus): NormalizedDevotionalStatus {
  if (status === DevotionalStatus.DISPONIVEL) return "disponivel";
  if (status === DevotionalStatus.PUBLICADO) return "publicado";
  return "pendente";
}

function devotionalStatusLabel(status: NormalizedDevotionalStatus) {
  if (status === "disponivel") return "Disponível";
  if (status === "publicado") return "Publicado";
  if (status === "pendente") return "Pendente";
  return status;
}

function devotionalStatusVariant(status: NormalizedDevotionalStatus): AppCardStatusVariant {
  switch (status) {
    case "publicado":
      return "success";
    case "disponivel":
      return "info";
    case "pendente":
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

function devotionalDateValue(value: string): number {
  const [year, month, day] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getTime();
}

function Header({ title, onCreate }: { title: string; onCreate: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <AppButton title="Criar devocional" variant="primary" fullWidth={false} onPress={onCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: "#e5e7eb", marginTop: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: "#e5e7eb",
    fontSize: 20,
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#e5e7eb",
    fontSize: 18,
    fontWeight: "700",
  },
  empty: {
    color: "#cbd5e1",
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
    borderColor: "#1f2937",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#0b1224",
  },
  filterChipActive: {
    backgroundColor: "#facc15",
    borderColor: "#facc15",
  },
  filterChipText: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#0f172a",
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
    borderColor: "#1f2937",
    backgroundColor: "#0b1224",
  },
  orderToggleText: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
});
