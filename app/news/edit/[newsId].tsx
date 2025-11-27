// app/news/edit/[newsId].tsx - edição de notícia com UI compartilhada
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import {
  getNewsById,
  publishNewsNow,
  updateNewsBase,
  deleteNews,
} from "../../../lib/news";
import type { News } from "../../../types/news";
import { Card } from "../../../components/ui/Card";
import { AppInput } from "../../../components/ui/AppInput";
import { AppButton } from "../../../components/ui/AppButton";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { DeleteConfirmModal } from "../../../components/modals/DeleteConfirmModal";
import { useTheme } from "../../../hooks/useTheme";

export default function EditNewsScreen() {
  const router = useRouter();
  const { newsId } = useLocalSearchParams<{ newsId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [news, setNews] = useState<News | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");

  const papel = user?.papel;
  const canAccess =
    papel === "professor" || papel === "coordenador" || papel === "administrador";

  const isDraft = news?.status === "rascunho";
  const isOwner = firebaseUser && news?.autor_id === firebaseUser.uid;
  const canEdit = (isDraft && isOwner) || (papel === "coordenador" || papel === "administrador");

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (!canAccess) {
      Alert.alert("Sem permissão", "Você não tem permissão para editar notícias.");
      router.replace("/" as any);
      return;
    }

    async function load() {
      try {
        setIsLoading(true);
        const data = await getNewsById(newsId);
        if (!data) {
          Alert.alert("Erro", "Notícia não encontrada.");
          router.replace("/news/my-news" as any);
          return;
        }
        setNews(data);
        setTitulo(data.titulo);
        setConteudo(data.conteudo);
      } catch (error) {
        console.error("Erro ao carregar notícia:", error);
        Alert.alert("Erro", "Não foi possível carregar a notícia.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [canAccess, firebaseUser, isInitializing, newsId, router]);

  function validate() {
    if (!titulo.trim()) {
      Alert.alert("Erro", "Informe o título.");
      return false;
    }
    if (!conteudo.trim()) {
      Alert.alert("Erro", "Informe o conteúdo.");
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (!news || !canEdit) return;
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      await updateNewsBase(news.id, {
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
      });
      Alert.alert("Sucesso", "Notícia atualizada.");
    } catch (error: any) {
      console.error("Erro ao salvar notícia:", error);
      Alert.alert("Erro", error?.message || "Falha ao salvar notícia.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePublish() {
    if (!news || !canAccess) return;
    try {
      setIsSubmitting(true);
      await publishNewsNow(news.id);
      Alert.alert("Sucesso", "Notícia publicada.");
      router.replace("/news/my-news" as any);
    } catch (error: any) {
      console.error("Erro ao publicar notícia:", error);
      Alert.alert("Erro", error?.message || "Falha ao publicar notícia.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!news || !canAccess) return;
    try {
      setIsSubmitting(true);
      await deleteNews(news.id);
      Alert.alert("Excluída", "Notícia deletada.");
      router.replace("/news/my-news" as any);
    } catch (error: any) {
      console.error("Erro ao deletar notícia:", error);
      Alert.alert("Erro", error?.message || "Falha ao deletar notícia.");
    } finally {
      setIsSubmitting(false);
      setDeleteVisible(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando notícia...</Text>
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
        title="Editar notícia"
        subtitle={news ? `Status: ${news.status}` : undefined}
        footer={news ? <StatusBadge status={news.status} variant="news" /> : null}
      >
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
          {canEdit ? (
            <AppButton
              title={isSubmitting ? "Salvando..." : "Salvar"}
              variant="secondary"
              onPress={handleSave}
              disabled={isSubmitting}
            />
          ) : null}
          {canAccess ? (
            <AppButton
              title={isSubmitting ? "Publicando..." : "Publicar agora"}
              variant="primary"
              onPress={handlePublish}
              disabled={isSubmitting}
            />
          ) : null}
        </View>

        {canAccess ? (
          <AppButton
            title="Deletar notícia"
            variant="danger"
            onPress={() => setDeleteVisible(true)}
            disabled={isSubmitting}
          />
        ) : null}
      </Card>

      <DeleteConfirmModal
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={handleDelete}
        title="Confirmar exclusão"
        message="Deseja realmente excluir esta notícia?"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12 },
  center: { flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#e5e7eb", marginTop: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
});
