// app/admin/devotionals/index.tsx - lista de gestão de devocionais
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Timestamp } from "firebase/firestore";

import { AppButton } from "../../../components/ui/AppButton";
import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import {
  archiveDevotional,
  listDevotionalsForAdmin,
  publishDevotionalNow,
  setDevotionalStatus,
} from "../../../lib/devotionals";
import { DevotionalStatus, type Devotional } from "../../../types/devotional";
import { formatDate } from "../../../utils/publishAt";

type Sections = Awaited<ReturnType<typeof listDevotionalsForAdmin>>;

export default function AdminDevotionalsScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [sections, setSections] = useState<Sections | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    const papel = user?.papel;
    if (papel !== "coordenador" && papel !== "administrador") {
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

  async function handlePublishNow(id: string) {
    try {
      console.log("[Devocionais][Lista] handlePublishNow", id);
      await publishDevotionalNow(id);
      await loadData();
    } catch (error) {
      console.error("[Devocionais][Lista] Erro ao publicar agora:", error);
      Alert.alert("Erro", "Não foi possível publicar o devocional.");
    }
  }

  async function handleDraft(id: string) {
    try {
      console.log("[Devocionais][Lista] handleDraft", id);
      await setDevotionalStatus(id, DevotionalStatus.RASCUNHO);
      await loadData();
    } catch (error) {
      console.error("[Devocionais][Lista] Erro ao salvar rascunho:", error);
      Alert.alert("Erro", "Não foi possível salvar como rascunho.");
    }
  }

  async function handleMakeAvailable(id: string) {
    try {
      console.log("[Devocionais][Lista] handleMakeAvailable", id);
      await setDevotionalStatus(id, DevotionalStatus.DISPONIVEL);
      await loadData();
    } catch (error) {
      console.error("[Devocionais][Lista] Erro ao disponibilizar:", error);
      Alert.alert("Erro", "Não foi possível disponibilizar o devocional.");
    }
  }

  async function handleDelete(id: string) {
    Alert.alert(
      "Excluir devocional",
      "Tem certeza que deseja excluir este devocional? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await archiveDevotional(id);
              await loadData();
              Alert.alert("Sucesso", "Devocional excluído.");
            } catch (error) {
              console.error("[Devocionais][Lista] Erro ao excluir:", error);
              Alert.alert("Erro", "Não foi possível excluir o devocional.");
            }
          },
        },
      ]
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

      <Section title="Agendados" empty="Nenhum devocional agendado" data={sections.scheduledDrafts}>
        {(devo) => (
          <DevotionalAdminCard
            devotional={devo}
            onEdit={() => router.push(`/admin/devotionals/${devo.id}` as any)}
            onPublishNow={() => handlePublishNow(devo.id)}
            onMakeAvailable={() => handleMakeAvailable(devo.id)}
            onDelete={() => handleDelete(devo.id)}
            extraBadge="Agendado"
          />
        )}
      </Section>

      <Section title="Rascunhos" empty="Nenhum rascunho" data={sections.drafts}>
        {(devo) => (
          <DevotionalAdminCard
            devotional={devo}
            onEdit={() => router.push(`/admin/devotionals/${devo.id}` as any)}
            onPublishNow={() => handlePublishNow(devo.id)}
            onMakeAvailable={() => handleMakeAvailable(devo.id)}
            onDelete={() => handleDelete(devo.id)}
            onSaveDraft={() => handleDraft(devo.id)}
          />
        )}
      </Section>

      <Section title="Publicados" empty="Nenhum devocional publicado" data={sections.published}>
        {(devo) => (
          <DevotionalAdminCard
            devotional={devo}
            onEdit={() => router.push(`/admin/devotionals/${devo.id}` as any)}
            onDelete={() => handleDelete(devo.id)}
          />
        )}
      </Section>
    </ScrollView>
  );
}

function Header({ title, onCreate }: { title: string; onCreate: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <AppButton title="Criar devocional" variant="primary" fullWidth={false} onPress={onCreate} />
    </View>
  );
}

type SectionProps<T> = {
  title: string;
  empty: string;
  data: T[];
  children: (item: T) => React.ReactNode;
};

function Section<T>({ title, empty, data, children }: SectionProps<T>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data.length === 0 ? (
        <Text style={styles.empty}>{empty}</Text>
      ) : (
        data.map((item, idx) => <View key={idx}>{children(item)}</View>)
      )}
    </View>
  );
}

function DevotionalAdminCard({
  devotional,
  onEdit,
  onPublishNow,
  onSaveDraft,
  onMakeAvailable,
  onDelete,
  extraBadge,
}: {
  devotional: Devotional;
  onEdit: () => void;
  onPublishNow?: () => void;
  onSaveDraft?: () => void;
  onMakeAvailable?: () => void;
  onDelete: () => void;
  extraBadge?: string;
}) {
  const dateLabel = formatDevotionalDate(devotional.data_devocional);
  return (
    <Card
      title={devotional.titulo}
      subtitle={`${devotional.referencia_biblica} • Data: ${dateLabel}`}
      footer={
        <View style={styles.cardActions}>
          <AppButton title="Editar" variant="outline" fullWidth={false} onPress={onEdit} />
          {onPublishNow ? (
            <AppButton title="Publicar agora" variant="primary" fullWidth={false} onPress={onPublishNow} />
          ) : null}
          {onMakeAvailable ? (
            <AppButton title="Disponibilizar" variant="secondary" fullWidth={false} onPress={onMakeAvailable} />
          ) : null}
          {onSaveDraft ? (
            <AppButton title="Salvar rascunho" variant="secondary" fullWidth={false} onPress={onSaveDraft} />
          ) : null}
          <AppButton title="Excluir" variant="secondary" fullWidth={false} onPress={onDelete} />
        </View>
      }
    >
      <View style={styles.badges}>
        <StatusBadge status={devotional.status} variant="devotional" />
        {extraBadge ? <Text style={styles.extraBadge}>{extraBadge}</Text> : null}
        {devotional.publish_at ? (
          <Text style={styles.extraBadge}>
            Publicação auto: {formatPublishAt(devotional.publish_at as Timestamp)}
          </Text>
        ) : null}
      </View>
      <Text style={styles.desc} numberOfLines={3}>
        {devotional.devocional_texto}
      </Text>
    </Card>
  );
}

function formatDevotionalDate(value: string): string {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return formatDate(new Date(Number(year), Number(month) - 1, Number(day)));
}

function formatPublishAt(ts: Timestamp): string {
  const date = ts.toDate();
  return `${formatDate(date)} ${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(
    2,
    "0"
  )}`;
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
  cardActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  extraBadge: {
    color: "#facc15",
    fontSize: 12,
    backgroundColor: "rgba(250,204,21,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  desc: {
    color: "#cbd5e1",
    marginTop: 6,
  },
});
