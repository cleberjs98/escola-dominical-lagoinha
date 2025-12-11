// app/devotionals/index.tsx - lista principal de devocionais (tab "Devocional")
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Pressable } from "react-native";
import { useRouter } from "expo-router";

import { AppButton } from "../../components/ui/AppButton";
import { DevotionalListItem } from "../../components/devotionals/DevotionalListItem";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import type { Devotional } from "../../types/devotional";
import { DevotionalStatus } from "../../types/devotional";
import {
  listDevotionalsForAdmin,
  listAvailableAndPublishedForProfessor,
  listPublishedDevotionals,
} from "../../lib/devotionals";
import { formatDate } from "../../utils/publishAt";
import { AppCardStatusVariant } from "../../components/common/AppCard";

type Role = "aluno" | "professor" | "coordenador" | "administrador" | "admin" | undefined;
type DateOrder = "asc" | "desc";
type DevotionalFilter = "all" | "available" | "published" | "pending";
type NormalizedDevotionalStatus = "disponivel" | "publicado" | "pendente";

export default function DevotionalsScreen() {
  const { firebaseUser, user, isInitializing } = useAuth();
  const role = (user?.papel as Role) || "aluno";
  const isAdminOrCoordinator = role === "coordenador" || role === "administrador" || role === "admin";

  if (isInitializing || !firebaseUser || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando devocionais...</Text>
      </View>
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
  const { themeSettings } = useTheme();
  const [sections, setSections] = useState<Awaited<ReturnType<typeof listDevotionalsForAdmin>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DevotionalFilter>("all");
  const [dateOrder, setDateOrder] = useState<DateOrder>("desc");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await listDevotionalsForAdmin();
      setSections(data);
    } catch (error) {
      console.error("[Devotionals][Admin] Erro ao carregar:", error);
      Alert.alert("Erro", "Nao foi possivel carregar os devocionais.");
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
        const normalized = normalizeStatusForFilter(devo.status);
        if (filter === "all") return true;
        if (filter === "available") return normalized === "disponivel";
        if (filter === "published") return normalized === "publicado";
        if (filter === "pending") return normalized === "rascunho";
        return true;
      })
      .sort((a, b) => {
        const da = devotionalDateValue(a.data_devocional);
        const db = devotionalDateValue(b.data_devocional);
        if (dateOrder === "asc") return da - db;
        return db - da;
      });
  }, [allDevotionals, dateOrder, filter, uid]);

  function toggleDateOrder() {
    setDateOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  if (loading) {
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
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Devocionais - Gestao</Text>
        <AppButton title="Criar devocional" variant="primary" fullWidth={false} onPress={() => router.push("/admin/devotionals/new" as any)} />
      </View>

      <View style={{ gap: 12 }}>
        <View style={styles.filtersRow}>
          {renderFilterChip("Todos", "all", filter, setFilter)}
          {renderFilterChip("Disponiveis", "available", filter, setFilter)}
          {renderFilterChip("Publicados", "published", filter, setFilter)}
          {renderFilterChip("Pendentes", "pending", filter, setFilter)}
        </View>

        <View style={styles.orderToggleRow}>
          <Text style={styles.sectionTitle}>Devocionais</Text>
          <TouchableOpacity onPress={toggleDateOrder} style={styles.orderToggleButton}>
            <Text style={styles.orderToggleText}>Ordenar por data: {dateOrder === "desc" ? "↓" : "↑"}</Text>
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
  );
}

// =========================
// Professor
// =========================
function ProfessorDevotionalsTab() {
  const router = useRouter();
  const { themeSettings } = useTheme();
  const [list, setList] = useState<Devotional[]>([]);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<DateOrder>("desc");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const devos = await listAvailableAndPublishedForProfessor();
      setList(devos);
    } catch (error) {
      console.error("[Devotionals][Professor] Erro ao carregar:", error);
      Alert.alert("Erro", "Nao foi possivel carregar os devocionais.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando devocionais...</Text>
      </View>
    );
  }

  const bg = themeSettings?.cor_fundo || "#020617";
  const sorted = [...list].sort((a, b) => {
    const da = devotionalDateValue(a.data_devocional);
    const db = devotionalDateValue(b.data_devocional);
    return order === "asc" ? da - db : db - da;
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={styles.content}>
      <View style={styles.orderToggleRow}>
        <Text style={styles.sectionTitle}>Devocionais</Text>
        <TouchableOpacity onPress={() => setOrder((prev) => (prev === "asc" ? "desc" : "asc"))} style={styles.orderToggleButton}>
          <Text style={styles.orderToggleText}>Ordenar por data: {order === "desc" ? "↓" : "↑"}</Text>
        </TouchableOpacity>
      </View>

      {sorted.length === 0 ? (
        <EmptyState title="Nenhum devocional disponivel no momento." />
      ) : (
        sorted.map((devo) => {
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
    </ScrollView>
  );
}

// =========================
// Aluno / publico
// =========================
function StudentDevotionalsTab() {
  const router = useRouter();
  const { themeSettings } = useTheme();
  const [list, setList] = useState<Devotional[]>([]);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<DateOrder>("desc");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const published = await listPublishedDevotionals();
      setList(published);
    } catch (error) {
      console.error("[Devotionals][Aluno] Erro ao carregar:", error);
      Alert.alert("Erro", "Nao foi possivel carregar os devocionais.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando devocionais...</Text>
      </View>
    );
  }

  const bg = themeSettings?.cor_fundo || "#020617";
  const sorted = [...list].sort((a, b) => {
    const da = devotionalDateValue(a.data_devocional);
    const db = devotionalDateValue(b.data_devocional);
    return order === "asc" ? da - db : db - da;
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={styles.content}>
      <View style={styles.orderToggleRow}>
        <Text style={styles.sectionTitle}>Devocionais</Text>
        <TouchableOpacity onPress={() => setOrder((prev) => (prev === "asc" ? "desc" : "asc"))} style={styles.orderToggleButton}>
          <Text style={styles.orderToggleText}>Ordenar por data: {order === "desc" ? "↓" : "↑"}</Text>
        </TouchableOpacity>
      </View>

      {sorted.length === 0 ? (
        <EmptyState title="Nenhum devocional publicado no momento." />
      ) : (
        sorted.map((devo) => {
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
    </ScrollView>
  );
}

// =========================
// Helpers
// =========================
function renderFilterChip(label: string, value: DevotionalFilter, current: DevotionalFilter, onChange: (v: DevotionalFilter) => void) {
  const active = current === value;
  return (
    <Pressable
      key={value}
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={() => onChange(value)}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function normalizeStatusForFilter(status: DevotionalStatus | string): NormalizedDevotionalStatus {
  const s = `${status ?? ""}`
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/s$/, ""); // remove plural simples

  if (s === "disponivel" || s === "disponive" || s === "disponivel" || s === "disponivel") return "disponivel";
  if (s === "publicado" || s === "publicad" || s === "publico" || s === "publicado") return "publicado";
  // trata rascunho/pendente/agendado como pendente
  return "pendente";
}

function devotionalStatusLabel(status: NormalizedDevotionalStatus) {
  if (status === "disponivel") return "Disponivel";
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

// =========================
// Styles
// =========================
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

