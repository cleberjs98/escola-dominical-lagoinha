// app/admin/lessons/new.tsx - criação de aula com validações reforçadas
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../../../hooks/useAuth";
import { createLesson } from "../../../lib/lessons";
import { LessonStatus } from "../../../types/lesson";
import { Card } from "../../../components/ui/Card";
import { AppInput } from "../../../components/ui/AppInput";
import { AppButton } from "../../../components/ui/AppButton";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import { useTheme } from "../../../hooks/useTheme";
import { isNonEmpty, isValidDateLike } from "../../../utils/validation";

export default function NewLessonScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

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
    if (!isNonEmpty(titulo, 3)) {
      Alert.alert("Erro", "Informe o título da aula.");
      return false;
    }
    if (!isValidDateLike(dataAula)) {
      Alert.alert("Erro", "Informe a data da aula em YYYY-MM-DD ou DD/MM/YYYY.");
      return false;
    }
    if (dataPublicacaoAuto.trim() && !isValidDateLike(dataPublicacaoAuto)) {
      Alert.alert("Erro", "Data de publicação automática inválida.");
      return false;
    }
    if (!isNonEmpty(descricao, 3)) {
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
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: themeSettings?.cor_fundo || "#020617" },
      ]}
      contentContainerStyle={styles.content}
    >
      <Card title="Criar aula" subtitle="Preencha os campos básicos e escolha a ação.">
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
            title={isSubmitting ? "Salvando..." : "Salvar rascunho"}
            variant="secondary"
            onPress={() => handleCreate(LessonStatus.RASCUNHO)}
            disabled={isSubmitting}
          />
          <AppButton
            title={isSubmitting ? "Enviando..." : "Marcar disponível"}
            variant="primary"
            onPress={() => handleCreate(LessonStatus.DISPONIVEL)}
            disabled={isSubmitting}
          />
        </View>

        <AppButton
          title={isSubmitting ? "Publicando..." : "Publicar agora"}
          variant="secondary"
          onPress={() => handleCreate(LessonStatus.PUBLICADA, true)}
          disabled={isSubmitting}
        />
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
});
