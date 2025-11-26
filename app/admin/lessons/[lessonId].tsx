// app/admin/lessons/[lessonId].tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../../hooks/useAuth";
import { getLessonById, updateLesson } from "../../../lib/lessons";
import { LessonStatus, type Lesson } from "../../../types/lesson";

export default function EditLessonScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [dataAula, setDataAula] = useState("");
  const [dataPublicacaoAuto, setDataPublicacaoAuto] = useState("");
  const [descricao, setDescricao] = useState("");

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
        status: archive ? LessonStatus.ARQUIVADA : status,
        setPublishedNow: publishNow,
        clearPublished: !publishNow && status !== LessonStatus.PUBLICADA,
        setDraftSavedNow: status === LessonStatus.RASCUNHO,
      });

      Alert.alert("Sucesso", "Aula atualizada.");
    } catch (error: any) {
      console.error("Erro ao atualizar aula:", error);
      Alert.alert("Erro", error?.message || "Falha ao atualizar aula.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInitializing || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando aula...</Text>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Aula não encontrada.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Editar aula</Text>
      <Text style={styles.subtitle}>Atualize os dados e escolha a ação.</Text>

      <Text style={styles.label}>Título da aula</Text>
      <TextInput
        style={styles.input}
        value={titulo}
        onChangeText={setTitulo}
        placeholderTextColor="#6b7280"
      />

      <Text style={styles.label}>Data da aula</Text>
      <TextInput
        style={styles.input}
        value={dataAula}
        onChangeText={setDataAula}
        placeholder="YYYY-MM-DD ou DD/MM/YYYY"
        placeholderTextColor="#6b7280"
      />

      <Text style={styles.label}>Data de publicação automática (opcional)</Text>
      <TextInput
        style={styles.input}
        value={dataPublicacaoAuto}
        onChangeText={setDataPublicacaoAuto}
        placeholder="YYYY-MM-DD ou DD/MM/YYYY"
        placeholderTextColor="#6b7280"
      />

      <Text style={styles.label}>Descrição base</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={descricao}
        onChangeText={setDescricao}
        multiline
        textAlignVertical="top"
        placeholderTextColor="#6b7280"
      />

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.buttonSecondary, isSubmitting && styles.disabled]}
          onPress={() => handleSave(LessonStatus.RASCUNHO)}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonSecondaryText}>
            {isSubmitting ? "Salvando..." : "Salvar rascunho"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonPrimary, isSubmitting && styles.disabled]}
          onPress={() => handleSave(LessonStatus.DISPONIVEL)}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonPrimaryText}>
            {isSubmitting ? "Atualizando..." : "Marcar disponível"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.button, styles.buttonPublish, isSubmitting && styles.disabled]}
        onPress={() => handleSave(LessonStatus.PUBLICADA, true)}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonPublishText}>
          {isSubmitting ? "Publicando..." : "Publicar agora"}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.buttonArchive, isSubmitting && styles.disabled]}
        onPress={() => handleSave(LessonStatus.ARQUIVADA, false, true)}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonArchiveText}>
          {isSubmitting ? "Arquivando..." : "Arquivar aula"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 24,
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
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 16,
  },
  label: {
    color: "#e5e7eb",
    fontSize: 14,
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#e5e7eb",
  },
  textarea: {
    minHeight: 140,
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#475569",
  },
  buttonSecondaryText: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  buttonPrimary: {
    backgroundColor: "#22c55e",
  },
  buttonPrimaryText: {
    color: "#022c22",
    fontWeight: "700",
  },
  buttonPublish: {
    backgroundColor: "#fbbf24",
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonPublishText: {
    color: "#78350f",
    fontWeight: "700",
  },
  buttonArchive: {
    backgroundColor: "#7f1d1d",
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonArchiveText: {
    color: "#fecaca",
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.7,
  },
});
