// app/news/edit/[newsId].tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import {
  getNewsById,
  publishNewsNow,
  updateNewsBase,
  deleteNews,
} from "../../../lib/news";
import type { News } from "../../../types/news";

export default function EditNewsScreen() {
  const router = useRouter();
  const { newsId } = useLocalSearchParams<{ newsId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();

  const [news, setNews] = useState<News | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");

  const papel = user?.papel;
  const canAccess =
    papel === "professor" || papel === "coordenador" || papel === "administrador";

  const isDraft = news?.status === "rascunho";
  const isOwner = firebaseUser && news?.autor_id === firebaseUser.uid;
  const canEdit = (isDraft && isOwner) || (papel === "coordenador" || papel === "administrador");

  // Guard + load
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

  async function handleSaveDraft() {
    if (!news || !canEdit) return;
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await updateNewsBase({
        newsId: news.id,
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
      });
      Alert.alert("Sucesso", "Rascunho salvo.");
    } catch (error: any) {
      console.error("Erro ao salvar rascunho:", error);
      Alert.alert("Erro", error?.message || "Falha ao salvar rascunho.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePublish() {
    if (!news || !canEdit) return;
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      // Se quiser garantir o conteúdo atualizado antes de publicar:
      await updateNewsBase({
        newsId: news.id,
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
      });
      await publishNewsNow(news.id);
      Alert.alert("Sucesso", "Notícia publicada.", [
        {
          text: "Minhas notícias",
          onPress: () => router.replace("/news/my-news" as any),
        },
      ]);
    } catch (error: any) {
      console.error("Erro ao publicar notícia:", error);
      Alert.alert("Erro", error?.message || "Falha ao publicar notícia.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!news) return;
    Alert.alert("Confirmar", "Deseja deletar esta notícia?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            setIsSubmitting(true);
            await deleteNews(news.id);
            router.replace("/news/my-news" as any);
          } catch (error: any) {
            console.error("Erro ao deletar notícia:", error);
            Alert.alert("Erro", error?.message || "Falha ao deletar notícia.");
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  }

  if (isInitializing || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando notícia...</Text>
      </View>
    );
  }

  if (!news) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Notícia não encontrada.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Editar notícia</Text>
      <Text style={styles.subtitle}>
        {isDraft ? "Rascunho" : "Publicada"} {isOwner ? "" : "(edição ampliada)"}
      </Text>

      <Text style={styles.label}>Título</Text>
      <TextInput
        style={[styles.input, !canEdit && styles.readonly]}
        value={titulo}
        onChangeText={setTitulo}
        editable={canEdit}
        placeholderTextColor="#6b7280"
      />

      <Text style={styles.label}>Conteúdo</Text>
      <TextInput
        style={[styles.input, styles.textarea, !canEdit && styles.readonly]}
        value={conteudo}
        onChangeText={setConteudo}
        editable={canEdit}
        multiline
        textAlignVertical="top"
        placeholderTextColor="#6b7280"
      />

      <View style={styles.actions}>
        {canEdit && (
          <Pressable
            style={[styles.button, styles.buttonSecondary, isSubmitting && styles.disabled]}
            onPress={handleSaveDraft}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonSecondaryText}>
              {isSubmitting ? "Salvando..." : "Salvar rascunho"}
            </Text>
          </Pressable>
        )}

        {canEdit && (
          <Pressable
            style={[styles.button, styles.buttonPrimary, isSubmitting && styles.disabled]}
            onPress={handlePublish}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonPrimaryText}>
              {isSubmitting ? "Publicando..." : "Publicar agora"}
            </Text>
          </Pressable>
        )}
      </View>

      {canEdit && (
        <Pressable
          style={[styles.button, styles.buttonDanger, isSubmitting && styles.disabled, { marginTop: 8 }]}
          onPress={handleDelete}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonDangerText}>Deletar notícia</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12 },
  center: { flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#e5e7eb", marginTop: 12 },
  title: { color: "#e5e7eb", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#9ca3af", fontSize: 13, marginBottom: 8 },
  label: { color: "#e5e7eb", fontSize: 14, marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#e5e7eb",
  },
  textarea: { minHeight: 180 },
  readonly: { opacity: 0.6 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  button: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, alignItems: "center", flex: 1 },
  buttonSecondary: { backgroundColor: "#111827", borderWidth: 1, borderColor: "#475569" },
  buttonSecondaryText: { color: "#e5e7eb", fontWeight: "600" },
  buttonPrimary: { backgroundColor: "#22c55e" },
  buttonPrimaryText: { color: "#022c22", fontWeight: "700" },
  buttonDanger: { backgroundColor: "#b91c1c" },
  buttonDangerText: { color: "#fee2e2", fontWeight: "700" },
  disabled: { opacity: 0.7 },
});
