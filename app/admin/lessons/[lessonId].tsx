// app/admin/lessons/[lessonId].tsx - edição de aula com componentes reutilizáveis
import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Alert, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../../hooks/useAuth";
import { getLessonById, updateLesson } from "../../../lib/lessons";
import type { LessonStatus, Lesson } from "../../../types/lesson";
import { Card } from "../../../components/ui/Card";
import { AppInput } from "../../../components/ui/AppInput";
import { AppButton } from "../../../components/ui/AppButton";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useTheme } from "../../../hooks/useTheme";

const AUTOSAVE_DELAY = 3000; // ms

export default function EditLessonScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [dataAula, setDataAula] = useState("");
  const [dataPublicacaoAuto, setDataPublicacaoAuto] = useState("");
  const [descricao, setDescricao] = useState("");

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Guard + carregar aula
  useEffect(() => {
    if (isInitializing) return;

    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }

    const papel = user?.papel;
    if (papel !== "coordenador" && papel !== "administrador") {
      Alert.alert("Sem permissão", "Apenas coordenador/admin podem editar aulas.");
      router.replace("/" as any);
      return;
    }

    async function load() {
      try {
        const data = await getLessonById(lessonId);
        if (!data) {
          Alert.alert("Erro", "Aula não encontrada.");
          router.replace("/" as any);
          return;
        }
        setLesson(data);
        setTitulo(data.titulo);
        setDataAula(typeof data.data_aula === "string" ? data.data_aula : "");
        setDataPublicacaoAuto(
          typeof data.data_publicacao_auto === "string" ? data.data_publicacao_auto : ""
        );
        setDescricao(data.descricao_base);
      } catch (error) {
        console.error("Erro ao carregar aula:", error);
        Alert.alert("Erro", "Não foi possível carregar a aula.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [firebaseUser, isInitializing, lessonId, router, user?.papel]);

  function validate() {
    if (!titulo.trim()) {
      Alert.alert("Erro", "Informe o título da aula.");
      return false;
    }
    if (!dataAula.trim()) {
      Alert.alert("Erro", "Informe a data da aula.");
      return false;
    }
    if (!descricao.trim()) {
      Alert.alert("Erro", "Informe a descrição base.");
      return false;
    }
    return true;
  }

  async function handleSave(status: LessonStatus, publishNow = false, archive = false) {
    if (!validate() || !lesson) return;

    try {
      setIsSubmitting(true);
      const dataPub = dataPublicacaoAuto.trim() || null;

      await updateLesson({
        lessonId: lesson.id,
        titulo: titulo.trim(),
        descricao_base: descricao.trim(),
        data_aula: dataAula.trim(),
        data_publicacao_auto: dataPub,
        status: archive ? ("arquivada" as LessonStatus) : status,
        setPublishedNow: publishNow,
        clearPublished: !publishNow && status !== "publicada",
        setDraftSavedNow: status === "rascunho",
      });

      Alert.alert("Sucesso", "Aula atualizada.");
    } catch (error: any) {
      console.error("Erro ao atualizar aula:", error);
      Alert.alert("Erro", error?.message || "Falha ao atualizar aula.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Auto-save rascunho
  useEffect(() => {
    if (!lesson) return;

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = setTimeout(() => {
      void handleAutoSave();
    }, AUTOSAVE_DELAY);

    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo, dataAula, dataPublicacaoAuto, descricao]);

  async function handleAutoSave() {
    if (!lesson) return;
    try {
      setIsSavingDraft(true);
      await updateLesson({
        lessonId: lesson.id,
        titulo: titulo.trim(),
        descricao_base: descricao.trim(),
        data_aula: dataAula.trim(),
        data_publicacao_auto: dataPublicacaoAuto.trim() || null,
        status: lesson.status,
        setDraftSavedNow: true,
      });
      setLastSavedAt(new Date());
    } catch (error) {
      console.error("Erro ao salvar rascunho:", error);
    } finally {
      setIsSavingDraft(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando aula...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: themeSettings?.cor_fundo || "#020617" },
      ]}
      contentContainerStyle={styles.content}
    >
      <Card
        title="Editar aula"
        subtitle={lesson ? `Status atual: ${lesson.status}` : undefined}
        footer={lesson ? <StatusBadge status={lesson.status} variant="lesson" /> : null}
      >
        <AppInput
          label="Título da aula"
          placeholder="Ex.: Aula sobre Romanos 8"
          value={titulo}
          onChangeText={setTitulo}
        />
        <AppInput
          label="Data da aula"
          placeholder="YYYY-MM-DD ou DD/MM/YYYY"
          value={dataAula}
          onChangeText={setDataAula}
        />
        <AppInput
          label="Data de publicação automática (opcional)"
          placeholder="YYYY-MM-DD ou DD/MM/YYYY"
          value={dataPublicacaoAuto}
          onChangeText={setDataPublicacaoAuto}
        />
        <RichTextEditor
          value={descricao}
          onChange={setDescricao}
          placeholder="Digite a descrição base da aula..."
          minHeight={160}
        />

        <View style={styles.actions}>
          <AppButton
            title={isSubmitting || isSavingDraft ? "Salvando..." : "Salvar rascunho"}
            variant="secondary"
            onPress={() => handleSave("rascunho", false, false)}
            disabled={isSubmitting || isSavingDraft}
          />
          <AppButton
            title={isSubmitting ? "Enviando..." : "Marcar disponível"}
            variant="primary"
            onPress={() => handleSave("disponivel", false, false)}
            disabled={isSubmitting}
          />
        </View>

        <View style={[styles.actions, { marginTop: 8 }]}>
          <AppButton
            title={isSubmitting ? "Publicando..." : "Publicar agora"}
            variant="secondary"
            onPress={() => handleSave("publicada", true, false)}
            disabled={isSubmitting}
          />
          <AppButton
            title="Arquivar aula"
            variant="outline"
            onPress={() => handleSave("publicada", false, true)}
            disabled={isSubmitting}
          />
        </View>

        {isSavingDraft ? (
          <Text style={styles.savingText}>Salvando rascunho...</Text>
        ) : lastSavedAt ? (
          <Text style={styles.savingText}>Rascunho salvo {lastSavedAt.toLocaleTimeString()}</Text>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 24,
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
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  savingText: {
    color: "#9ca3af",
    marginTop: 6,
  },
});
