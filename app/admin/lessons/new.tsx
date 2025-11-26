// app/admin/lessons/new.tsx
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
import { useRouter } from "expo-router";

import { useAuth } from "../../../hooks/useAuth";
import { createLesson } from "../../../lib/lessons";
import { LessonStatus } from "../../../types/lesson";

export default function NewLessonScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();

  const [titulo, setTitulo] = useState("");
  const [dataAula, setDataAula] = useState("");
  const [dataPublicacaoAuto, setDataPublicacaoAuto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guard de acesso
  useEffect(() => {
    if (isInitializing) return;

    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }

    const papel = user?.papel;
    if (papel !== "coordenador" && papel !== "administrador") {
      Alert.alert("Sem permissão", "Apenas coordenador/admin podem criar aulas.");
      router.replace("/" as any);
    }
  }, [firebaseUser, isInitializing, router, user?.papel]);

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

  async function handleCreate(status: LessonStatus, publishNow = false) {
    if (!firebaseUser) return;
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      const dataPub = dataPublicacaoAuto.trim() || null;
      const lessonId = await createLesson({
        titulo: titulo.trim(),
        descricao_base: descricao.trim(),
        data_aula: dataAula.trim(),
        data_publicacao_auto: dataPub,
        status,
        criado_por_id: firebaseUser.uid,
        publishNow,
      });

      Alert.alert("Sucesso", "Aula criada!", [
        {
          text: "Editar aula",
          onPress: () => router.replace(`/admin/lessons/${lessonId}` as any),
        },
        { text: "OK" },
      ]);
    } catch (error: any) {
      console.error("Erro ao criar aula:", error);
      Alert.alert("Erro", error?.message || "Falha ao criar aula.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInitializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Criar aula</Text>
      <Text style={styles.subtitle}>
        Preencha os campos básicos e escolha a ação desejada.
      </Text>

      <Text style={styles.label}>Título da aula</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex.: Aula sobre Romanos 8"
        placeholderTextColor="#6b7280"
        value={titulo}
        onChangeText={setTitulo}
      />

      <Text style={styles.label}>Data da aula</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD ou DD/MM/YYYY"
        placeholderTextColor="#6b7280"
        value={dataAula}
        onChangeText={setDataAula}
      />

      <Text style={styles.label}>Data de publicação automática (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD ou DD/MM/YYYY"
        placeholderTextColor="#6b7280"
        value={dataPublicacaoAuto}
        onChangeText={setDataPublicacaoAuto}
      />

      <Text style={styles.label}>Descrição base</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Digite a descrição base da aula..."
        placeholderTextColor="#6b7280"
        value={descricao}
        onChangeText={setDescricao}
        multiline
        textAlignVertical="top"
      />

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.buttonSecondary, isSubmitting && styles.disabled]}
          onPress={() => handleCreate(LessonStatus.RASCUNHO)}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonSecondaryText}>
            {isSubmitting ? "Salvando..." : "Salvar rascunho"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonPrimary, isSubmitting && styles.disabled]}
          onPress={() => handleCreate(LessonStatus.DISPONIVEL)}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonPrimaryText}>
            {isSubmitting ? "Enviando..." : "Marcar disponível"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.button, styles.buttonPublish, isSubmitting && styles.disabled]}
        onPress={() => handleCreate(LessonStatus.PUBLICADA, true)}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonPublishText}>
          {isSubmitting ? "Publicando..." : "Publicar agora"}
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
  disabled: {
    opacity: 0.7,
  },
});
