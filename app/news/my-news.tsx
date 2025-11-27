// app/news/my-news.tsx - lista de notícias do autor usando componentes compartilhados
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../../hooks/useAuth";
import { listMyNews, publishNewsNow, deleteNews } from "../../lib/news";
import type { News } from "../../types/news";
import { Card } from "../../components/ui/Card";
import { AppButton } from "../../components/ui/AppButton";
import { EmptyState } from "../../components/ui/EmptyState";
import { NoticiaCard } from "../../components/cards/NoticiaCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useTheme } from "../../hooks/useTheme";

export default function MyNewsScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

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

    void reloadList();
  }, [canAccess, firebaseUser, isInitializing, router]);

  async function reloadList() {
    if (!firebaseUser) return;
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

  async function handlePublish(newsId: string) {
    try {
      setActionId(newsId);
      await publishNewsNow(newsId);
      Alert.alert("Sucesso", "Notícia publicada.");
      await reloadList();
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
            await reloadList();
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
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: themeSettings?.cor_fundo || "#020617" },
      ]}
      contentContainerStyle={styles.content}
    >
      <Card
        title="Minhas notícias"
        subtitle="Crie, edite e publique suas notícias."
        footer={
          <AppButton
            title="Nova notícia"
            variant="primary"
            fullWidth={false}
            onPress={() => router.push("/news/new" as any)}
          />
        }
      />

      {isLoading ? (
        <View style={styles.centerInner}>
          <ActivityIndicator size="large" color="#facc15" />
          <Text style={styles.loadingText}>Buscando notícias...</Text>
        </View>
      ) : newsList.length === 0 ? (
        <EmptyState
          title="Você ainda não criou notícias."
          actionLabel="Criar agora"
          onActionPress={() => router.push("/news/new" as any)}
        />
      ) : (
        newsList.map((news) => {
          const isDraft = news.status === "rascunho";
          const isActing = actionId === news.id;
          return (
            <Card
              key={news.id}
              title={news.titulo}
              subtitle={
                news.publicado_em
                  ? `Publicado em: ${String(news.publicado_em)}`
                  : "Rascunho"
              }
              footer={<StatusBadge status={news.status} variant="news" />}
            >
              <NoticiaCard news={news} showStatus />
              <View style={styles.actions}>
                {isDraft ? (
                  <>
                    <AppButton
                      title="Editar"
                      variant="primary"
                      fullWidth={false}
                      onPress={() => router.push(`/news/edit/${news.id}` as any)}
                      disabled={isActing}
                      loading={isActing}
                    />
                    <AppButton
                      title="Publicar"
                      variant="secondary"
                      fullWidth={false}
                      onPress={() => handlePublish(news.id)}
                      disabled={isActing}
                      loading={isActing}
                    />
                    <AppButton
                      title="Deletar"
                      variant="danger"
                      fullWidth={false}
                      onPress={() => handleDelete(news.id)}
                      disabled={isActing}
                      loading={isActing}
                    />
                  </>
                ) : (
                  <AppButton
                    title="Ver"
                    variant="outline"
                    fullWidth={false}
                    onPress={() => router.push(`/news/edit/${news.id}` as any)}
                  />
                )}
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12 },
  center: { flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center" },
  centerInner: { alignItems: "center", marginTop: 12 },
  loadingText: { color: "#e5e7eb", marginTop: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
});
