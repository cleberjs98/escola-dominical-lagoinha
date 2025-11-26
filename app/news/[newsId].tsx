// app/news/[newsId].tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../hooks/useAuth";
import { getNewsById } from "../../lib/news";
import { listSupportMaterialsForReference } from "../../lib/materials";
import type { News } from "../../types/news";
import type { SupportMaterial } from "../../types/material";
import { SupportMaterialItem } from "../../components/SupportMaterialItem";

export default function NewsDetailScreen() {
  const router = useRouter();
  const { newsId } = useLocalSearchParams<{ newsId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();

  const [news, setNews] = useState<News | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [materials, setMaterials] = useState<SupportMaterial[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (user?.status !== "aprovado") {
      router.replace("/auth/pending" as any);
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

        try {
          setIsLoadingMaterials(true);
          const mats = await listSupportMaterialsForReference("noticia", newsId);
          setMaterials(mats);
        } catch (err) {
          console.error("Erro ao carregar materiais da notícia:", err);
        } finally {
          setIsLoadingMaterials(false);
        }
      } catch (error) {
        console.error("Erro ao carregar notícia:", error);
        Alert.alert("Erro", "Não foi possível carregar a notícia.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [firebaseUser, isInitializing, newsId, router, user?.status]);

  function openMaterial(material: SupportMaterial) {
    const url = material.url_externa;
    if (url) {
      Linking.openURL(url).catch((err) => {
        console.error("Erro ao abrir link:", err);
        Alert.alert("Erro", "Não foi possível abrir o material.");
      });
      return;
    }
    Alert.alert("Material sem link", "Este material não possui URL acessível.");
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
        <Pressable style={styles.backButton} onPress={() => router.replace("/news/my-news" as any)}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{news.titulo}</Text>
      <Text style={styles.subtitleSmall}>Status: {news.status}</Text>
      {news.publicado_em && (
        <Text style={styles.subtitleSmall}>Publicado em: {String(news.publicado_em)}</Text>
      )}
      <View style={styles.card}>
        <Text style={styles.cardText}>{news.conteudo}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Materiais de apoio</Text>
        {isLoadingMaterials ? (
          <View style={styles.inlineCenter}>
            <ActivityIndicator size="small" color="#facc15" />
            <Text style={styles.loadingText}>Carregando materiais...</Text>
          </View>
        ) : materials.length === 0 ? (
          <Text style={styles.cardTextMuted}>Nenhum material de apoio para esta notícia.</Text>
        ) : (
          materials.map((m) => (
            <SupportMaterialItem
              key={m.id}
              material={m}
              onPress={() => openMaterial(m)}
              previewImage={true}
            />
          ))
        )}
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
    paddingHorizontal: 16,
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 12,
  },
  backButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  backButtonText: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  title: {
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitleSmall: {
    color: "#9ca3af",
    fontSize: 13,
  },
  card: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#0b1224",
    gap: 6,
  },
  cardTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
  },
  cardText: {
    color: "#cbd5e1",
    fontSize: 14,
  },
  cardTextMuted: {
    color: "#94a3b8",
    fontSize: 13,
  },
  inlineCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
