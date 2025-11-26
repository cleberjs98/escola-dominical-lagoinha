// app/news/my-news.tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../../hooks/useAuth";
import {
  listMyNews,
  publishNewsNow,
  deleteNews,
  updateNewsBase,
  getNewsById,
} from "../../lib/news";
import type { News } from "../../types/news";

export default function MyNewsScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();

  const [newsList, setNewsList] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const papel = user?.papel;
  const canAccess =
    papel === "professor" || papel === "coordenador" || papel === "administrador";

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (!canAccess) {
      Alert.alert("Sem permissão", "Você não tem permissão para ver suas notícias.");
      router.replace("/" as any);
      return;
    }

    async function load() {
      try {
        setIsLoading(true);
        const list = await listMyNews(firebaseUser.uid);
        setNewsList(list);
      } catch (error) {
        console.error("Erro ao carregar notícias:", error);
        Alert.alert("Erro", "Não foi possível carregar suas notícias.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [canAccess, firebaseUser, isInitializing, router]);

  async function handlePublish(newsId: string) {
    try {
      setActionId(newsId);
      await publishNewsNow(newsId);
      Alert.alert("Sucesso", "Notícia publicada.");
      setNewsList((prev) =>
        prev.map((n) => (n.id === newsId ? { ...n, status: "publicada", publicado_em: null } : n))
      );
    } catch (error: any) {
      console.error("Erro ao publicar notícia:", error);
      Alert.alert("Erro", error?.message || "Falha ao publicar notícia.");
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(newsId: string) {
    Alert.alert("Confirmar", "Deseja deletar esta notícia?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            setActionId(newsId);
            await deleteNews(newsId);
            setNewsList((prev) => prev.filter((n) => n.id !== newsId));
          } catch (error: any) {
            console.error("Erro ao deletar notícia:", error);
            Alert.alert("Erro", error?.message || "Falha ao deletar notícia.");
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
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
      <Text style={styles.title}>Minhas notícias</Text>
      <Text style={styles.subtitle}>Crie, edite e publique suas notícias.</Text>

      {isLoading ? (
        <View style={styles.centerInner}>
          <ActivityIndicator size="large" color="#facc15" />
          <Text style={styles.loadingText}>Buscando notícias...</Text>
        </View>
      ) : newsList.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Você ainda não criou notícias.</Text>
        </View>
      ) : (
        newsList.map((news) => {
          const isDraft = news.status === "rascunho";
          const isActing = actionId === news.id;
          return (
            <View key={news.id} style={styles.card}>
              <Text style={styles.cardTitle}>{news.titulo}</Text>
              <Text style={styles.cardLine}>Status: {news.status}</Text>
              {news.publicado_em && <Text style={styles.cardLine}>Publicado em: {String(news.publicado_em)}</Text>}
              {news.data_expiracao && (
                <Text style={styles.cardLine}>Expira em: {String(news.data_expiracao)}</Text>
              )}

              <View style={styles.actions}>
                {isDraft && (
                  <>
                    <Pressable
                      style={[styles.button, styles.buttonPrimary, isActing && styles.disabled]}
                      onPress={() => router.push(`/news/edit/${news.id}` as any)}
                      disabled={isActing}
                    >
                      <Text style={styles.buttonPrimaryText}>Editar</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.button, styles.buttonSecondary, isActing && styles.disabled]}
                      onPress={() => handlePublish(news.id)}
                      disabled={isActing}
                    >
                      <Text style={styles.buttonSecondaryText}>Publicar</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.button, styles.buttonDanger, isActing && styles.disabled]}
                      onPress={() => handleDelete(news.id)}
                      disabled={isActing}
                    >
                      <Text style={styles.buttonDangerText}>Deletar</Text>
                    </Pressable>
                  </>
                )}

                {!isDraft && (
                  <Pressable
                    style={[styles.button, styles.buttonOutline]}
                    onPress={() => router.push(`/news/edit/${news.id}` as any)}
                  >
                    <Text style={styles.buttonOutlineText}>Ver</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12 },
  center: { flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center" },
  centerInner: { alignItems: "center", marginTop: 12 },
  loadingText: { color: "#e5e7eb", marginTop: 12 },
  title: { color: "#e5e7eb", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#9ca3af", fontSize: 13, marginBottom: 8 },
  emptyBox: { borderWidth: 1, borderColor: "#1f2937", borderRadius: 12, padding: 16 },
  emptyText: { color: "#9ca3af", fontSize: 13 },
  card: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#0b1224",
    gap: 6,
  },
  cardTitle: { color: "#e5e7eb", fontSize: 16, fontWeight: "700" },
  cardLine: { color: "#cbd5e1", fontSize: 13 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  button: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: "center" },
  buttonPrimary: { backgroundColor: "#22c55e" },
  buttonPrimaryText: { color: "#022c22", fontWeight: "700" },
  buttonSecondary: { backgroundColor: "#fbbf24" },
  buttonSecondaryText: { color: "#78350f", fontWeight: "700" },
  buttonDanger: { backgroundColor: "#b91c1c" },
  buttonDangerText: { color: "#fee2e2", fontWeight: "700" },
  buttonOutline: { borderWidth: 1, borderColor: "#22c55e" },
  buttonOutlineText: { color: "#bbf7d0", fontWeight: "600" },
  disabled: { opacity: 0.7 },
});
