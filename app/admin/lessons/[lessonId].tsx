import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Timestamp } from "firebase/firestore";

import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import { AppInput } from "../../../components/ui/AppInput";
import { AppButton } from "../../../components/ui/AppButton";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import {
  createPublishStringsFromTimestamp,
  formatTimestampToDateInput,
  formatTimestampToDateTimeInput,
  maskDate,
  maskDateTime,
  parseDateTimeToTimestamp,
} from "../../../utils/publishAt";
import {
  deleteLesson,
  getLessonById,
  publishLessonNow,
  setLessonStatus,
  updateLessonFields,
} from "../../../lib/lessons";
import type { Lesson, LessonStatus } from "../../../types/lesson";
import { AppBackground } from "../../../components/layout/AppBackground";
import type { AppTheme } from "../../../theme/tokens";

 type FormErrors = {
  data?: string;
  publish?: string;
};

export default function EditLessonScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const papel = user?.papel;
  const canDelete = papel === "administrador" || papel === "coordenador";

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [titulo, setTitulo] = useState("");
  const [referencia, setReferencia] = useState("");
  const [dataAula, setDataAula] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [descricao, setDescricao] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    const papelAtual = user?.papel;
    if (papelAtual !== "coordenador" && papelAtual !== "administrador" && papelAtual !== "admin") {
      Alert.alert("Sem permissão", "Apenas coordenador/admin podem editar aulas.");
      router.replace("/lessons" as any);
      return;
    }
    void loadLesson();
  }, [firebaseUser, isInitializing, lessonId, router, user?.papel]);

  async function loadLesson() {
    try {
      setLoading(true);
      const data = await getLessonById(lessonId);
      if (!data) {
        Alert.alert("Erro", "Aula não encontrada.");
        router.replace("/lessons" as any);
        return;
      }
      setLesson(data);
      setTitulo(data.titulo);
      setReferencia(data.referencia_biblica || "");
      setDescricao(data.descricao_base);
      setDataAula(formatTimestampToDateInput(data.data_aula as Timestamp));
      setPublishAt(formatTimestampToDateTimeInput((data as any).publish_at as Timestamp | null));
    } catch (err) {
      console.error("[EditLesson] erro ao carregar aula:", err);
      Alert.alert("Erro", "Não foi possível carregar a aula.");
    } finally {
      setLoading(false);
    }
  }

  function validate() {
    const newErrors: FormErrors = {};
    if (!dataAula || !toISODate(dataAula)) newErrors.data = "Informe a data da aula (dd/mm/aaaa).";
    if (publishAt && !parseDateTimeToTimestamp(publishAt)) newErrors.publish = "Data/hora inválidas (dd/mm/aaaa hh:mm).";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave(status?: LessonStatus) {
    if (!lesson) return;
    if (!validate()) return;
    const isoDate = toISODate(dataAula);
    if (!isoDate) return;

    try {
      setSubmitting(true);
      const publishParsed = parseDateTimeToTimestamp(publishAt);
      await updateLessonFields({
        lessonId: lesson.id,
        titulo: titulo.trim(),
        referencia_biblica: referencia.trim(),
        descricao_base: descricao.trim(),
        data_aula: isoDate,
        publish_at_text: publishAt.trim() || null,
        publish_at: publishParsed?.timestamp ?? null,
        data_publicacao_auto: publishParsed?.display ?? null,
      });
      if (status) {
        await setLessonStatus(lesson.id, status);
      }
      Alert.alert("Sucesso", "Aula atualizada.");
      router.replace("/(tabs)/lessons" as any);
    } catch (err) {
      console.error("[EditLesson] Erro ao salvar aula:", err);
      Alert.alert("Erro", (err as any)?.message || "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublishNow() {
    if (!lesson) return;
    try {
      setSubmitting(true);
      await publishLessonNow(lesson.id, firebaseUser?.uid || "system");
      Alert.alert("Sucesso", "Aula publicada.");
      router.replace("/(tabs)/lessons" as any);
    } catch (err) {
      console.error("[EditLesson] Erro ao publicar agora:", err);
      Alert.alert("Erro", "Não foi possível publicar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!lesson) return;
    try {
      setDeleting(true);
      await deleteLesson(lesson.id);
      Alert.alert("Sucesso", "Aula excluída.");
      router.replace("/(tabs)/lessons" as any);
    } catch (err) {
      console.error("[EditLesson] Erro ao excluir aula:", err);
      Alert.alert("Erro", "Não foi possível excluir.");
    } finally {
      setDeleting(false);
    }
  }

  if (isInitializing || loading) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando aula...</Text>
        </View>
      </AppBackground>
    );
  }

  if (!lesson) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Aula não encontrada.</Text>
          <AppButton title="Voltar" variant="outline" onPress={() => router.replace("/(tabs)/lessons" as any)} />
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Título</Text>
            <AppInput value={titulo} placeholder="Ex.: Aula sobre Romanos 8" onChangeText={setTitulo} />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Referência bíblica</Text>
            <AppInput value={referencia} placeholder="Ex.: Romanos 8" onChangeText={setReferencia} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Data da aula</Text>
            <AppInput value={dataAula} placeholder="dd/mm/aaaa" onChangeText={(t) => setDataAula(maskDate(t))} />
            {errors.data ? <Text style={styles.error}>{errors.data}</Text> : null}
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Agendar publicação</Text>
            <AppInput
              value={publishAt}
              placeholder="dd/mm/aaaa hh:mm"
              onChangeText={(t) => setPublishAt(maskDateTime(t))}
            />
            {errors.publish ? <Text style={styles.error}>{errors.publish}</Text> : null}
          </View>
        </View>

        <View style={styles.col}>
          <Text style={styles.label}>Descrição base</Text>
          <RichTextEditor value={descricao} onChange={setDescricao} placeholder="Digite a descrição da aula..." />
        </View>

        <View style={[styles.row, styles.actions]}>
          <AppButton title={submitting ? "Salvando..." : "Salvar edições"} variant="primary" onPress={() => handleSave()} disabled={submitting} />
          <AppButton title={submitting ? "Salvar rascunho..." : "Salvar como rascunho"} variant="secondary" onPress={() => handleSave("rascunho" as LessonStatus)} disabled={submitting} />
          <AppButton title={submitting ? "Disponibilizando..." : "Disponibilizar"} variant="secondary" onPress={() => handleSave("disponivel" as LessonStatus)} disabled={submitting} />
          <AppButton title={submitting ? "Publicando..." : "Publicar agora"} variant="secondary" onPress={handlePublishNow} disabled={submitting} />
          {canDelete ? (
            <AppButton title={deleting ? "Excluindo..." : "Excluir aula"} variant="danger" onPress={handleDelete} disabled={deleting} />
          ) : null}
        </View>
      </ScrollView>
    </AppBackground>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "transparent" },
    content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12, backgroundColor: "transparent" },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16, gap: 12, backgroundColor: "transparent" },
    loadingText: { color: theme.colors.text, marginTop: 12 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    col: { flex: 1, gap: 8, minWidth: 260 },
    label: { color: theme.colors.text, fontWeight: "600" },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    error: { color: theme.colors.status?.dangerText || theme.colors.text, fontSize: 12 },
  });
}

function toISODate(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}
