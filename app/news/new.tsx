// app/news/new.tsx - criação de notícia com validações reforçadas
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../../hooks/useAuth";
import { createNewsDraft, publishNewsNow } from "../../lib/news";
import { Card } from "../../components/ui/Card";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { RichTextEditor } from "../../components/editor/RichTextEditor";
import { useTheme } from "../../hooks/useTheme";
import { isNonEmpty } from "../../utils/validation";

export default function NewNewsScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const papel = user?.papel;
  const canPost =
    papel === "professor" || papel === "coordenador" || papel === "administrador";

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (!canPost) {
      Alert.alert("Sem permissão", "Você não tem permissão para criar notícias.");
      router.replace("/" as any);
    }
  }, [canPost, firebaseUser, isInitializing, router]);

  function validate() {
    if (!isNonEmpty(titulo, 3)) {
      Alert.alert("Erro", "Informe o título.");
      return false;
    }
    if (!isNonEmpty(conteudo, 10)) {
      Alert.alert("Erro", "Informe o conteúdo.");
      return false;
    }
    return true;
  }

  async function handleSaveDraft() {
    if (!firebaseUser || !canPost) return;
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const newsId = await createNewsDraft({
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        autor_id: firebaseUser.uid,
        papel_autor: papel!,
      });
      Alert.alert("Sucesso", "Rascunho criado com sucesso.", [
        { text: "Editar", onPress: () => router.replace(`/news/edit/${newsId}` as any) },
        { text: "OK" },
      ]);
    } catch (error: any) {
      console.error("Erro ao salvar rascunho:", error);
      Alert.alert("Erro", error?.message || "Falha ao salvar rascunho.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePublishNow() {
    if (!firebaseUser || !canPost) return;
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const newsId = await createNewsDraft({
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        autor_id: firebaseUser.uid,
        papel_autor: papel!,
      });
      await publishNewsNow(newsId);
      Alert.alert("Sucesso", "Notícia publicada.", [
        { text: "Ver minhas notícias", onPress: () => router.replace("/news/my-news" as any) },
        { text: "OK" },
      ]);
    } catch (error: any) {
      console.error("Erro ao publicar notícia:", error);
      Alert.alert("Erro", error?.message || "Falha ao publicar notícia.");
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
      <Card title="Criar notícia" subtitle="Escreva uma nova notícia para a comunidade.">
        <AppInput
          label="Título"
          placeholder="Ex.: Novo cronograma de aulas"
          value={titulo}
          onChangeText={setTitulo}
        />
        <RichTextEditor
          value={conteudo}
          onChange={setConteudo}
          placeholder="Conteúdo da notícia"
          minHeight={180}
        />
        <View style={styles.actions}>
          <AppButton
            title={isSubmitting ? "Salvando..." : "Salvar rascunho"}
            variant="secondary"
            onPress={handleSaveDraft}
            disabled={isSubmitting}
          />
          <AppButton
            title={isSubmitting ? "Publicando..." : "Publicar agora"}
            variant="primary"
            onPress={handlePublishNow}
            disabled={isSubmitting}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12 },
  center: { flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#e5e7eb", marginTop: 12 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
});
