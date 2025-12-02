import { useEffect, useState } from "react";
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

type FormErrors = {
  data?: string;
  publish?: string;
};

export default function EditLessonScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();
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
    const papel = user?.papel;
    if (papel !== "coordenador" && papel !== "administrador") {
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
      setPublishAt(formatTimestampToDateTimeInput(data.publish_at as Timestamp | null) || "");
    } catch (err) {
      console.error("Erro ao carregar aula:", err);
      Alert.alert("Erro", "Não foi possível carregar a aula.");
      router.replace("/lessons" as any);
    } finally {
      setLoading(false);
    }
  }

  function validateBase(): boolean {
    const newErrors: FormErrors = {};
    if (!titulo.trim()) {
      Alert.alert("Erro", "Informe o título.");
      return false;
    }
    if (!dataAula.trim()) {
      newErrors.data = "Informe a data da aula (dd/mm/aaaa).";
      setErrors(newErrors);
      return false;
    }
    setErrors(newErrors);
    return true;
  }

  function validatePublishAt(): boolean {
    if (!publishAt.trim()) return true;
    const parsed = parseDateTimeToTimestamp(publishAt.trim());
    if (!parsed) {
      setErrors((prev) => ({ ...prev, publish: "Data/hora inválida (dd/mm/aaaa hh:mm)." }));
      return false;
    }
    setErrors((prev) => ({ ...prev, publish: undefined }));
    return true;
  }

  function redirect() {
    router.replace("/lessons" as any);
  }

  async function handleSave(statusChange?: LessonStatus) {
    if (!lesson || !firebaseUser) return;
    if (!validateBase() || !validatePublishAt()) return;
    try {
      setSubmitting(true);
      await updateLessonFields(lesson.id, {
        titulo: titulo.trim(),
        referencia_biblica: referencia.trim(),
        descricao_base: descricao.trim(),
        data_aula_text: dataAula.trim(),
        publish_at_text: publishAt.trim() || null,
        status: statusChange,
      });
      Alert.alert("Sucesso", "Aula salva.");
      redirect();
    } catch (err) {
      console.error("Erro ao salvar aula:", err);
      Alert.alert("Erro", (err as Error)?.message || "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish() {
    if (!lesson || !firebaseUser) return;
    try {
      setSubmitting(true);
      await publishLessonNow(lesson.id, firebaseUser.uid);
      Alert.alert("Publicado", "Aula publicada.");
      redirect();
    } catch (err) {
      Alert.alert("Erro", "Não foi possível publicar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!lesson) return;
    Alert.alert("Excluir aula", "Deseja excluir esta aula?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            console.log("[Lessons] handleDeleteLesson chamado para", lesson.id);
            setDeleting(true);
            await deleteLesson(lesson.id);
            Alert.alert("Excluída", "Aula excluída com sucesso.");
            redirect();
          } catch (err) {
            console.error("[Lessons] Erro ao excluir aula:", err);
            Alert.alert("Erro", "Não foi possível excluir a aula. Tente novamente.");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  if (isInitializing || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeSettings?.cor_fundo || "#020617" }]}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Editar aula</Text>
      <Text style={styles.helper}>Status atual: {lesson?.status}</Text>

      <AppInput label="Título" value={titulo} onChangeText={setTitulo} />
      <AppInput
        label="Referência bíblica"
        value={referencia}
        onChangeText={setReferencia}
        placeholder="Ex.: Romanos 8"
      />
      <AppInput
        label="Data da aula"
        placeholder="dd/mm/aaaa"
        value={dataAula}
        keyboardType="number-pad"
        onChangeText={(v) => {
          setDataAula(maskDate(v));
          setErrors((prev) => ({ ...prev, data: undefined }));
        }}
        error={errors.data}
      />
      <AppInput
        label="Publicar automaticamente em"
        placeholder="dd/mm/aaaa hh:mm"
        value={publishAt}
        keyboardType="number-pad"
        onChangeText={(v) => {
          setPublishAt(maskDateTime(v));
          setErrors((prev) => ({ ...prev, publish: undefined }));
        }}
        error={errors.publish}
        helperText="Digite ddmmaaaa hh:mm ou deixe vazio."
      />
      <RichTextEditor
        value={descricao}
        onChange={setDescricao}
        placeholder="Descrição base da aula..."
        minHeight={180}
      />

      <View style={styles.actions}>
        <AppButton
          title={submitting ? "Salvando..." : "Salvar alterações"}
          variant="secondary"
          onPress={() => handleSave()}
          disabled={submitting}
        />
        <AppButton
          title={submitting ? "Salvando..." : "Salvar como rascunho"}
          variant="secondary"
          onPress={() => handleSave("rascunho")}
          disabled={submitting}
        />
        <AppButton
          title={submitting ? "Salvando..." : "Disponibilizar para professores"}
          variant="secondary"
          onPress={() => handleSave("disponivel")}
          disabled={submitting}
        />
        <AppButton
          title={submitting ? "Publicando..." : "Publicar agora"}
          variant="primary"
          onPress={handlePublish}
          disabled={submitting}
        />
        {canDelete ? (
          <AppButton
            title={deleting ? "Excluindo..." : "Excluir aula"}
            variant="outline"
            onPress={() => {
              console.log("[Lessons] Botão excluir clicado");
              void handleDelete();
            }}
            disabled={submitting || deleting}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
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
  title: {
    color: "#e5e7eb",
    fontSize: 20,
    fontWeight: "700",
  },
  helper: {
    color: "#cbd5e1",
  },
  actions: {
    gap: 8,
    marginTop: 12,
  },
});
