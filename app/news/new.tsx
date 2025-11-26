// app/news/new.tsx
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
import { useRouter } from "expo-router";

import { useAuth } from "../../hooks/useAuth";
import { createNewsDraft, publishNewsNow } from "../../lib/news";

export default function NewNewsScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();

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
    if (!firebaseUser || !canPost) return;
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const newsId = await createNewsDraft({
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        autor_id: firebaseUser.uid,
        papel_autor: papel || "desconhecido",
      });
      Alert.alert("Sucesso", "Rascunho criado com sucesso.", [
        {
          text: "Editar notícia",
          onPress: () => router.replace(`/news/edit/${newsId}` as any),
        },
        { text: "OK" },
      ]);
    } catch (error: any) {
      console.error("Erro ao criar notícia:", error);
      Alert.alert("Erro", error?.message || "Falha ao criar notícia.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePublishNow() {
    if (!firebaseUser || !canPost) return;
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      // Estratégia: cria rascunho e publica em seguida
      const newsId = await createNewsDraft({
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        autor_id: firebaseUser.uid,
        papel_autor: papel || "desconhecido",
      });
      await publishNewsNow(newsId);
      Alert.alert("Sucesso", "Notícia publicada com sucesso.", [
        {
          text: "Minhas notícias",
          onPress: () => router.replace("/news/my-news" as any),
        },
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Criar notícia</Text>
      <Text style={styles.subtitle}>
        Título e conteúdo são obrigatórios. Você pode salvar como rascunho ou publicar direto.
      </Text>

      <Text style={styles.label}>Autor</Text>
      <Text style={styles.info}>
        {user?.nome || firebaseUser?.email} ({papel})
      </Text>

      <Text style={styles.label}>Título</Text>
      <TextInput
        style={styles.input}
        value={titulo}
        onChangeText={setTitulo}
        placeholder="Título da notícia"
        placeholderTextColor="#6b7280"
      />

      <Text style={styles.label}>Conteúdo</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={conteudo}
        onChangeText={setConteudo}
        placeholder="Digite o conteúdo..."
        placeholderTextColor="#6b7280"
        multiline
        textAlignVertical="top"
      />

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.buttonSecondary, isSubmitting && styles.disabled]}
          onPress={handleSaveDraft}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonSecondaryText}>
            {isSubmitting ? "Salvando..." : "Salvar rascunho"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonPrimary, isSubmitting && styles.disabled]}
          onPress={handlePublishNow}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonPrimaryText}>
            {isSubmitting ? "Publicando..." : "Publicar agora"}
          </Text>
        </Pressable>
      </View>
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
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 8,
  },
  label: {
    color: "#e5e7eb",
    fontSize: 14,
    marginTop: 12,
    marginBottom: 4,
  },
  info: {
    color: "#cbd5e1",
    fontSize: 13,
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
    minHeight: 180,
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
  disabled: {
    opacity: 0.7,
  },
});
