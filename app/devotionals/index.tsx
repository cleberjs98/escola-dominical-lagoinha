// app/devotionals/index.tsx - lista real de devocionais (usada pela tab)
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";

import { AppButton } from "../../components/ui/AppButton";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { DevocionalCard } from "../../components/cards/DevocionalCard";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import type { Devotional } from "../../types/devotional";
import {
  listPublishedDevotionals, listDevotionalsForAdmin, listAvailableAndPublishedForProfessor, listAvailableAndPublishedForProfessor,
  publishDevotionalNow,
  setDevotionalStatus,
  deleteDevotional,
} from "../../lib/devotionals";

type Role = "aluno" | "professor" | "coordenador" | "administrador" | undefined;

export default function DevotionalsScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();
  const role = (user?.papel as Role) || "aluno";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishedForStudent, setPublishedForStudent] = useState<Devotional[]>([]);
  const [professorList, setProfessorList] = useState<Devotional[]>([]);
  const [professorList, setProfessorList] = useState<Devotional[]>([]);
  const [adminSections, setAdminSections] = useState<{
    drafts: Devotional[];
    available: Devotional[];
    published: Devotional[];
  } | null>(null);

  useEffect(() => {
    console.log("[DevotionalsTab] tela carregada");
  }, []);

  useEffect(() => {
    if (!firebaseUser || isInitializing) return;
    void loadData();
  }, [firebaseUser, isInitializing, role]);

  async function loadData() {
    try {
      console.log("[DevotionalsTab] carregando devocionais...");
      setLoading(true);
      setError(null);
      if (role === "coordenador" || role === "administrador") {
        const sections = await listDevotionalsForAdmin();
        const total = sections.drafts.length + sections.available.length + sections.published.length;
        console.log("[DevotionalsTab] devocionais carregados:", total);
        setAdminSections(sections);
        setPublishedForStudent([]);
        setProfessorList([]);
      } else if (role === "professor") {
        const list = await listAvailableAndPublishedForProfessor();
        console.log("[DevotionalsTab] devocionais carregados:", list.length);
        setProfessorList(list);
        setPublishedForStudent([]);
        setAdminSections(null);
      } else {
        const published = await listPublishedDevotionals();
        console.log("[DevotionalsTab] devocionais carregados:", published.length);
        setPublishedForStudent(published);
        setAdminSections(null);
        setProfessorList([]);
      }
    } catch (err) {
      console.error("[DevotionalsTab] erro ao carregar devocionais:", err);
      setError("Erro ao carregar devocionais.");
      Alert.alert("Erro", "NÃ£o foi possÃ­vel carregar os devocionais.");
    } finally {
      setLoading(false);
    }
  }

  if (isInitializing || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando devocionais...</Text>
      </View>
    );
  }

  if (!firebaseUser) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Redirecionando para login...</Text>
      </View>
    );
  }

  const bg = themeSettings?.cor_fundo || "#020617";

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={styles.content}>
      {error ? (
        <EmptyState title={error} />
      ) : adminSections ? (
        <AdminSectionsView
          sections={adminSections}
          onEdit={(id) => router.push(`/admin/devotionals/${id}` as any)}
          onPublishNow={handlePublishNow}
          onDelete={handleDelete}
          onMakeAvailable={(id) => handleStatus(id, "disponivel")}
          onMakeDraft={(id) => handleStatus(id, "rascunho")}
        />
      ) : (
        <StudentList devotionals={publishedForStudent} onOpen={(id) => router.push(`/devotionals/${id}` as any)} />
      )}

      <View style={styles.actions}>
        {adminSections ? (
          <AppButton title="Criar devocional" variant="primary" fullWidth={false} onPress={() => router.push("/admin/devotionals/new" as any)} />
        ) : (
          <AppButton title="Atualizar" variant="outline" fullWidth={false} onPress={loadData} />
        )}
      </View>
    </ScrollView>
  );

  async function handlePublishNow(id: string) {
    try {
      await publishDevotionalNow(id, firebaseUser?.uid || "system");
      await loadData();
    } catch (err) {
      console.error("[DevotionalsTab] erro ao publicar agora:", err);
      Alert.alert("Erro", "Não foi possível publicar o devocional.");
    }
  }

  async function handleStatus(id: string, status: DevotionalStatus) {
    try {
      await setDevotionalStatus(id, status);
      await loadData();
    } catch (err) {
      console.error("[DevotionalsTab] erro ao atualizar status:", err);
      Alert.alert("Erro", "Não foi possível atualizar o status.");
    }
  }

  async function handleDelete(id: string) {
    const doDelete = async () => {
      try {
        await deleteDevotional(id);
        await loadData();
      } catch (err) {
        console.error("[DevotionalsTab] erro ao excluir devocional:", err);
        Alert.alert("Erro", "Não foi possível excluir o devocional.");
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.confirm === "function") {
      const ok = window.confirm("Tem certeza que deseja excluir este devocional?");
      if (ok) {
        await doDelete();
      }
      return;
    }

    Alert.alert("Excluir devocional", "Deseja excluir este devocional?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => void doDelete() },
    ]);
  }
}

function StudentList({ devotionals, onOpen, emptyMessage = "Nenhum devocional publicado no momento." }: { devotionals: Devotional[]; onOpen: (id: string) => void; emptyMessage?: string }) {
  if (devotionals.length === 0) {
    return <EmptyState title={emptyMessage} />;
  }
  return (
    <>
      {devotionals.map((devo) => (
        <DevocionalCard key={devo.id} devotional={devo} onPress={() => onOpen(devo.id)} showStatus style={styles.card} />
      ))}
    </>
  );
}

function AdminSectionsView({
  sections,
  onEdit,
  onPublishNow,
  onDelete,
  onMakeAvailable,
  onMakeDraft,
}: {
  sections: { drafts: Devotional[]; available: Devotional[]; published: Devotional[] };
  onEdit: (id: string) => void;
  onPublishNow: (id: string) => void;
  onDelete: (id: string) => void;
  onMakeAvailable: (id: string) => void;
  onMakeDraft: (id: string) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Section title="Rascunhos" empty="Nenhum rascunho" data={sections.drafts}>
        {(devo) => (
          <AdminCard
            devotional={devo}
            onEdit={() => onEdit(devo.id)}
            onPublishNow={() => onPublishNow(devo.id)}
            onDelete={() => onDelete(devo.id)}
            onMakeAvailable={() => onMakeAvailable(devo.id)}
            onMakeDraft={() => onMakeDraft(devo.id)}
          />
        )}
      </Section>

      <Section title="Disponíveis" empty="Nenhum disponível" data={sections.available}>
        {(devo) => (
          <AdminCard
            devotional={devo}
            onEdit={() => onEdit(devo.id)}
            onPublishNow={() => onPublishNow(devo.id)}
            onDelete={() => onDelete(devo.id)}
            onMakeDraft={() => onMakeDraft(devo.id)}
          />
        )}
      </Section>

      <Section title="Publicados" empty="Nenhum devocional publicado" data={sections.published}>
        {(devo) => (
          <AdminCard devotional={devo} onEdit={() => onEdit(devo.id)} onDelete={() => onDelete(devo.id)} />
        )}
      </Section>
    </View>
  );
}

function Section<T>({
  title,
  empty,
  data,
  children,
}: {
  title: string;
  empty: string;
  data: T[];
  children: (item: T) => React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data.length === 0 ? <Text style={styles.empty}>{empty}</Text> : data.map((item, idx) => <View key={idx}>{children(item)}</View>)}
    </View>
  );
}

function AdminCard({
  devotional,
  onEdit,
  onPublishNow,
  onDelete,
  onMakeAvailable,
  onMakeDraft,
}: {
  devotional: Devotional;
  onEdit: () => void;
  onPublishNow?: () => void;
  onDelete: () => void;
  onMakeAvailable?: () => void;
  onMakeDraft?: () => void;
}) {
  return (
    <View style={styles.adminCard}>
      <Card
        title={devotional.titulo}
        subtitle={`${devotional.referencia_biblica} - ${devotional.data_devocional}`}
        footer={
          <View style={styles.cardActions}>
            <AppButton title="Editar" variant="outline" fullWidth={false} onPress={onEdit} />
            {onMakeAvailable ? (
              <AppButton title="Disponibilizar" variant="secondary" fullWidth={false} onPress={onMakeAvailable} />
            ) : null}
            {onMakeDraft ? (
              <AppButton title="Rascunho" variant="secondary" fullWidth={false} onPress={onMakeDraft} />
            ) : null}
            {onPublishNow ? (
              <AppButton title="Publicar agora" variant="primary" fullWidth={false} onPress={onPublishNow} />
            ) : null}
            <AppButton title="Excluir" variant="secondary" fullWidth={false} onPress={onDelete} />
          </View>
        }
      >
        <Text style={styles.desc}>{devotional.conteudo_base || devotional.devocional_texto}</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 12,
    paddingBottom: 32,
    gap: 12,
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
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: "#e5e7eb",
    fontSize: 18,
    fontWeight: "700",
  },
  empty: {
    color: "#cbd5e1",
  },
  desc: {
    color: "#cbd5e1",
    marginTop: 6,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  actions: {
    marginTop: 12,
  },
  adminCard: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 4,
    backgroundColor: "#0b1224",
  },
  card: {
    marginBottom: 8,
  },
});









