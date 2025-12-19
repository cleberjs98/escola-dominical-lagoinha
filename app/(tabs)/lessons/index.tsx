import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Pressable, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Timestamp, doc, getDoc } from "firebase/firestore";

import { AppButton } from "../../../components/ui/AppButton";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import type { Lesson } from "../../../types/lesson";
import { listLessonsForAdminCoordinator, listLessonsForProfessor, listPublishedLessons } from "../../../lib/lessons";
import { firebaseDb } from "../../../lib/firebase";
import { formatTimestampToDateInput } from "../../../utils/publishAt";
import { AppCard, AppCardStatusVariant } from "../../../components/common/AppCard";
import { LessonListItem } from "../../../components/lessons/LessonListItem";
import { AppBackground } from "../../../components/layout/AppBackground";
import type { AppTheme } from "../../../types/theme";

type Role = "aluno" | "professor" | "coordenador" | "administrador" | "admin" | undefined;

type AdminSections = Awaited<ReturnType<typeof listLessonsForAdminCoordinator>>;
type ProfessorSections = Awaited<ReturnType<typeof listLessonsForProfessor>>;
type LessonStatusFilter = "all" | "available" | "reserved" | "published" | "pending" | "mine";
type MyLessonsSubFilter = "all" | "pending" | "reserved" | "published";
type DateOrder = "asc" | "desc";
type AdminLessonFilter = "all" | "drafts" | "available" | "published" | "reserved" | "pending";

type NormalizedLessonStatus = "disponivel" | "reservada" | "publicada" | "pendente" | "rascunho";
type Styles = ReturnType<typeof createStyles>;

export const options = {
  title: "Aulas",
  headerTitle: "Aulas",
};

function normalizeLessonStatus(status: Lesson["status"]): NormalizedLessonStatus {
  if (status === "pendente_reserva") return "pendente";
  return status as NormalizedLessonStatus;
}

function getLessonDateValue(lesson: Lesson): number {
  const val = lesson.data_aula?.toDate ? lesson.data_aula.toDate() : new Date(lesson.data_aula as any);
  return val?.getTime?.() ?? 0;
}

function formatLessonDate(lesson: Lesson) {
  return formatTimestampToDateInput(lesson.data_aula as Timestamp);
}

function lessonStatusLabel(status: NormalizedLessonStatus) {
  if (status === "disponivel") return "Disponivel";
  if (status === "reservada") return "Reservada";
  if (status === "publicada") return "Publicada";
  if (status === "pendente") return "Pendente";
  if (status === "rascunho") return "Rascunho";
  return status;
}

function lessonStatusVariant(status: NormalizedLessonStatus): AppCardStatusVariant {
  switch (status) {
    case "publicada":
      return "success";
    case "reservada":
      return "info";
    case "pendente":
      return "warning";
    case "rascunho":
      return "muted";
    case "disponivel":
    default:
      return "muted";
  }
}

export default function LessonsTabScreen() {
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const role = user?.papel as Role;
  const isProfessor = role === "professor";
  const isAdminOrCoordinator = role === "administrador" || role === "admin" || role === "coordenador";

  if (isInitializing || !firebaseUser || !user) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando aulas...</Text>
        </View>
      </AppBackground>
    );
  }

  if (isProfessor) {
    return <ProfessorLessonsTabScreen uid={firebaseUser.uid} />;
  }

  if (isAdminOrCoordinator) {
    return <AdminLessonsScreen uid={firebaseUser.uid} />;
  }

  return <StudentLessonsScreen />;
}

// =========================
// Tela admin / coordenador
// =========================
function AdminLessonsScreen({ uid }: { uid: string }) {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [adminSections, setAdminSections] = useState<AdminSections | null>(null);
  const [reservedProfessors, setReservedProfessors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [adminStatusFilter, setAdminStatusFilter] = useState<AdminLessonFilter>("available");
  const [adminDateOrder, setAdminDateOrder] = useState<DateOrder>("desc");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const sections = await listLessonsForAdminCoordinator();
      setAdminSections(sections);
      const ids = Array.from(
        new Set(
          [
            ...sections.pendingOrReserved,
            ...sections.drafts,
            ...sections.available,
            ...sections.published,
          ]
            .map((lesson) => lesson.professor_reservado_id)
            .filter(Boolean) as string[]
        )
      );
      if (ids.length) {
        const entries = await Promise.all(
          ids.map(async (id) => {
            try {
              const snap = await getDoc(doc(firebaseDb, "users", id));
              if (!snap.exists()) return [id, "Professor reservado"] as const;
              const data = snap.data() as any;
              const name = data.nome_completo || data.nome || data.apelido || "Professor reservado";
              return [id, name] as const;
            } catch (err) {
              console.error("Erro ao buscar professor reservado", err);
              return [id, "Professor reservado"] as const;
            }
          })
        );
        setReservedProfessors(Object.fromEntries(entries));
      } else {
        setReservedProfessors({});
      }
    } catch (err) {
      console.error("[Lessons] Erro ao carregar aulas:", err);
      Alert.alert("Erro", "Nao foi possivel carregar as aulas.");
    } finally {
      setLoading(false);
    }
  }

  function goTo(pathname: string, params?: Record<string, string>) {
    router.push({ pathname, params } as any);
  }

  const adminLessons = useMemo(() => {
    if (!adminSections) return [];
    const combined = [
      ...adminSections.drafts,
      ...adminSections.available,
      ...adminSections.pendingOrReserved,
      ...adminSections.published,
    ];
    const map = new Map<string, Lesson>();
    combined.forEach((lesson) => {
      if (!map.has(lesson.id)) {
        map.set(lesson.id, lesson);
      }
    });
    return Array.from(map.values());
  }, [adminSections]);

  const filteredAdminLessons = useMemo(() => {
    return adminLessons
      .filter((lesson) => {
        const status = normalizeLessonStatus(lesson.status);
        const isMine =
          lesson.criado_por_id === uid ||
          lesson.professor_reservado_id === uid ||
          (lesson as any).publicado_por_id === uid;

        switch (adminStatusFilter) {
          case "all":
            return true;
          case "available":
            return status === "disponivel";
          case "drafts":
            return status === "rascunho";
          case "published":
            return status === "publicada";
          case "reserved":
            return status === "reservada";
          case "pending":
            return status === "pendente";
          default:
            return true;
        }
      })
      .sort((a, b) => {
        const da = getLessonDateValue(a);
        const db = getLessonDateValue(b);
        if (adminDateOrder === "asc") return da - db;
        return db - da;
      });
  }, [adminLessons, adminStatusFilter, adminDateOrder, uid]);

  if (loading) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando aulas...</Text>
        </View>
      </AppBackground>
    );
  }

  function renderAdminFilterChip(label: string, value: AdminLessonFilter) {
    const active = adminStatusFilter === value;
    return (
      <Pressable
        key={value}
        style={[
          styles.filterChip,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          active && [styles.filterChipActive, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }],
        ]}
        onPress={() => setAdminStatusFilter(value)}
      >
        <Text
          style={[
            styles.filterChipText,
            { color: theme.colors.text },
            active && [styles.filterChipTextActive, { color: theme.colors.accent }],
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function toggleAdminDateOrder() {
    setAdminDateOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  return (
    <AppBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={{ gap: 12 }}>
          <View style={styles.filtersRow}>
            {renderAdminFilterChip("Todos", "all")}
            {renderAdminFilterChip("Rascunhos", "drafts")}
            {renderAdminFilterChip("Disponiveis", "available")}
            {renderAdminFilterChip("Publicadas", "published")}
            {renderAdminFilterChip("Reservadas", "reserved")}
            {renderAdminFilterChip("Pendentes", "pending")}
          </View>

          <View style={styles.orderToggleRow}>
            <Text style={styles.sectionTitle}>Aulas</Text>
            <TouchableOpacity onPress={toggleAdminDateOrder} style={styles.orderToggleButton}>
              <Text style={styles.orderToggleText}>Ordenar por data: {adminDateOrder === "desc" ? "↓" : "↑"}</Text>
            </TouchableOpacity>
          </View>

          {filteredAdminLessons.length === 0 ? (
            <Text style={styles.empty}>Nenhuma aula encontrada.</Text>
          ) : (
            filteredAdminLessons.map((lesson) => {
              const status = normalizeLessonStatus(lesson.status);
              const reservedLabel = lesson.professor_reservado_id
                ? reservedProfessors[lesson.professor_reservado_id] || "Professor reservado"
                : null;
              const subtitle = `${formatLessonDate(lesson)} - ${lessonStatusLabel(status)}${
                reservedLabel ? ` • Prof.: ${reservedLabel}` : ""
              }`;
              return (
                <LessonListItem
                  key={lesson.id}
                  title={lesson.titulo}
                  subtitle={subtitle}
                  statusLabel={lessonStatusLabel(status)}
                  statusVariant={lessonStatusVariant(status)}
                  onPress={() => goTo("/lessons/[lessonId]", { lessonId: lesson.id })}
                />
              );
            })
          )}

          <View style={styles.actionsRow}>
            <AppButton title="Criar nova aula" variant="primary" fullWidth={false} onPress={() => goTo("/admin/lessons/new")} />
          </View>
        </View>
      </ScrollView>
    </AppBackground>
  );
}

// =========================
// Tela aluno / público
// =========================
function StudentLessonsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [publishedForStudent, setPublishedForStudent] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<DateOrder>("desc");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const published = await listPublishedLessons();
      setPublishedForStudent(published);
    } catch (err) {
      console.error("[Lessons] Erro ao carregar aulas:", err);
      Alert.alert("Erro", "Nao foi possivel carregar as aulas.");
    } finally {
      setLoading(false);
    }
  }

  function goTo(pathname: string, params?: Record<string, string>) {
    router.push({ pathname, params } as any);
  }

  if (loading) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando aulas...</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={{ gap: 8 }}>
          <View style={styles.orderRow}>
            <View />
            <View style={styles.orderButtons}>
              <Text
                style={[
                  styles.orderChip,
                  { borderColor: theme.colors.border, color: theme.colors.text },
                  order === "desc" && [styles.orderChipActive, { backgroundColor: theme.colors.primary, color: theme.colors.accent }],
                ]}
                onPress={() => setOrder("desc")}
              >
                Mais recentes
              </Text>
              <Text
                style={[
                  styles.orderChip,
                  { borderColor: theme.colors.border, color: theme.colors.text },
                  order === "asc" && [styles.orderChipActive, { backgroundColor: theme.colors.primary, color: theme.colors.accent }],
                ]}
                onPress={() => setOrder("asc")}
              >
                Mais antigas
              </Text>
            </View>
          </View>
          <Section
            title=""
            empty="Nenhuma publicada"
            data={[...publishedForStudent].sort((a, b) => {
              const aDate = (a.data_aula as any)?.toDate?.() ?? new Date(a.data_aula as any);
              const bDate = (b.data_aula as any)?.toDate?.() ?? new Date(b.data_aula as any);
              return order === "desc" ? bDate.getTime() - aDate.getTime() : aDate.getTime() - bDate.getTime();
            })}
            styles={styles}
          >
            {(lesson) => (
              <StudentLessonCard lesson={lesson} onPress={() => goTo("/lessons/[lessonId]", { lessonId: lesson.id })} styles={styles} />
            )}
          </Section>
        </View>
      </ScrollView>
    </AppBackground>
  );
}

// =========================
// Tela do professor
// =========================
function ProfessorLessonsTabScreen({ uid }: { uid: string }) {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [profSections, setProfSections] = useState<ProfessorSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LessonStatusFilter>("all");
  const [mySubFilter, setMySubFilter] = useState<MyLessonsSubFilter>("all");
  const [dateOrder, setDateOrder] = useState<DateOrder>("desc");

  useEffect(() => {
    void loadData();
  }, [uid]);

  async function loadData() {
    try {
      setLoading(true);
      const sections = await listLessonsForProfessor(uid);
      setProfSections(sections);
    } catch (err) {
      console.error("[Lessons] Erro ao carregar aulas (professor):", err);
      Alert.alert("Erro", "Nao foi possivel carregar as aulas.");
    } finally {
      setLoading(false);
    }
  }

  const professorLessons = useMemo(() => {
    if (!profSections) return [];
    const combined = [...profSections.available, ...profSections.mine, ...profSections.published];
    const map = new Map<string, Lesson>();
    combined.forEach((lesson) => {
      if (!map.has(lesson.id)) {
        map.set(lesson.id, lesson);
      }
    });
    return Array.from(map.values());
  }, [profSections]);

  const filteredLessons = useMemo(() => {
    return professorLessons
      .filter((lesson) => {
        const status = normalizeLessonStatus(lesson.status);
        switch (statusFilter) {
          case "available":
            return status === "disponivel";
          case "reserved":
            return status === "reservada";
          case "published":
            return status === "publicada";
          case "pending":
            return status === "pendente";
          case "mine": {
            const isMine = lesson.professor_reservado_id === uid || (lesson as any).publicado_por_id === uid;
            if (!isMine) return false;
            if (mySubFilter === "all") return true;
            if (mySubFilter === "pending") return status === "pendente";
            if (mySubFilter === "reserved") return status === "reservada";
            if (mySubFilter === "published") return status === "publicada";
            return true;
          }
          case "all":
          default:
            return true;
        }
      })
      .sort((a, b) => {
        const da = getLessonDateValue(a);
        const db = getLessonDateValue(b);
        if (dateOrder === "asc") return da - db;
        return db - da;
      });
  }, [professorLessons, statusFilter, mySubFilter, dateOrder, uid]);

  const counts = useMemo(() => {
    const base = {
      all: 0,
      available: 0,
      reserved: 0,
      published: 0,
      pending: 0,
      mine: 0,
    };
    if (!professorLessons.length) return base;
    professorLessons.forEach((lesson) => {
      const status = normalizeLessonStatus(lesson.status);
      const isMine = lesson.professor_reservado_id === uid || (lesson as any).publicado_por_id === uid;
      base.all += 1;
      if (status === "disponivel") base.available += 1;
      if (status === "reservada") base.reserved += 1;
      if (status === "publicada") base.published += 1;
      if (status === "pendente") base.pending += 1;
      if (isMine) base.mine += 1;
    });
    return base;
  }, [professorLessons, uid]);

  function renderFilterChip(label: string, value: LessonStatusFilter, count?: number) {
    const active = statusFilter === value;
    const displayLabel = typeof count === "number" ? `${label} (${count})` : label;
    return (
      <Pressable key={value} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setStatusFilter(value)}>
        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{displayLabel}</Text>
      </Pressable>
    );
  }

  function renderMyFilterChip(label: string, value: MyLessonsSubFilter) {
    const active = mySubFilter === value;
    return (
      <Pressable key={value} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setMySubFilter(value)}>
        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
      </Pressable>
    );
  }

  function toggleDateOrder() {
    setDateOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  if (loading) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando aulas...</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={{ gap: 12 }}>
          <View style={styles.filtersRow}>
            {renderFilterChip("Todas", "all", counts.all)}
            {renderFilterChip("Disponiveis", "available", counts.available)}
            {renderFilterChip("Reservadas", "reserved", counts.reserved)}
            {renderFilterChip("Publicadas", "published", counts.published)}
            {renderFilterChip("Pendentes", "pending", counts.pending)}
            {renderFilterChip("Minhas aulas", "mine", counts.mine)}
          </View>

          {statusFilter === "mine" ? (
            <View style={styles.filtersRow}>
              {renderMyFilterChip("Todas minhas", "all")}
              {renderMyFilterChip("Pendentes", "pending")}
              {renderMyFilterChip("Reservadas", "reserved")}
              {renderMyFilterChip("Publicadas", "published")}
            </View>
          ) : null}

          <View style={styles.orderToggleRow}>
            <Text style={styles.sectionTitle}>Aulas</Text>
            <TouchableOpacity onPress={toggleDateOrder} style={styles.orderToggleButton}>
              <Text style={styles.orderToggleText}>{dateOrder === "asc" ? "Data asc" : "Data desc"}</Text>
            </TouchableOpacity>
          </View>

          {filteredLessons.length === 0 ? (
            <Text style={styles.empty}>Nenhuma aula encontrada.</Text>
          ) : (
            filteredLessons.map((lesson) => {
              const status = normalizeLessonStatus(lesson.status);
              return (
                <AppCard
                  key={lesson.id}
                  title={lesson.titulo}
                  subtitle={formatLessonDate(lesson)}
                  statusLabel={lessonStatusLabel(status)}
                  statusVariant={lessonStatusVariant(status)}
                  onPress={() => router.push({ pathname: "/lessons/[lessonId]", params: { lessonId: lesson.id } } as any)}
                />
              );
            })
          )}
        </View>
      </ScrollView>
    </AppBackground>
  );
}

type SectionProps<T> = {
  title: string;
  empty: string;
  data: T[];
  styles: Styles;
  children: (item: T) => React.ReactNode;
};

function Section<T>({ title, empty, data, styles, children }: SectionProps<T>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data.length === 0 ? <Text style={styles.empty}>{empty}</Text> : data.map((item, idx) => <View key={idx}>{children(item)}</View>)}
    </View>
  );
}

function StudentLessonCard({ lesson, onPress, styles }: { lesson: Lesson; onPress: () => void; styles: Styles }) {
  return (
    <View style={styles.studentCard}>
      <Pressable onPress={onPress} style={styles.studentPressable}>
        <Text style={styles.sectionTitle}>{lesson.titulo}</Text>
        <Text style={styles.desc}>Data: {formatLessonDate(lesson)}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "transparent",
    },
    content: {
      padding: 12,
      paddingBottom: 32,
      gap: 12,
    },
    center: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      color: theme.colors.text,
      marginTop: 12,
    },
    section: {
      gap: 8,
    },
    sectionTitle: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    empty: {
      color: theme.colors.muted || theme.colors.text,
    },
    desc: {
      color: theme.colors.muted || theme.colors.text,
      marginTop: 6,
    },
    actionsRow: {
      marginTop: 12,
    },
    orderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    orderButtons: {
      flexDirection: "row",
      gap: 8,
    },
    orderChip: {
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border || theme.colors.card,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: theme.colors.card,
    },
    orderChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      color: theme.colors.accent,
    },
    studentCard: {
      borderWidth: 1,
      borderColor: theme.colors.border || theme.colors.card,
      borderRadius: 12,
      padding: 12,
      backgroundColor: theme.colors.card,
      marginTop: 8,
    },
    studentPressable: {
      gap: 4,
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
      borderColor: theme.colors.border || theme.colors.card,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.card,
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
      borderColor: theme.colors.border || theme.colors.card,
      backgroundColor: theme.colors.card,
    },
    orderToggleText: {
      color: theme.colors.text,
      fontWeight: "600",
    },
  });
}
