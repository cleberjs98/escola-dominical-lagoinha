// app/(tabs)/devotionals/index.tsx - lista de devocionais publicados
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { DevocionalCard } from "../../../components/cards/DevocionalCard";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import { listPublishedDevotionals } from "../../../lib/devotionals";
import type { Devotional } from "../../../types/devotional";
import { formatDate } from "../../../utils/publishAt";

export default function DevotionalsTabScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[DevotionalsTab] tela carregada");
  }, []);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (user?.status && user.status !== "aprovado") {
      router.replace("/auth/pending" as any);
      return;
    }
    void load();
  }, [firebaseUser, isInitializing, user?.status]);

  async function load() {
    try {
      console.log("[DevotionalsTab] carregando devocionais...");
      setIsLoading(true);
      setError(null);
      const list = await listPublishedDevotionals();
      console.log("[DevotionalsTab] devocionais carregados:", list.length);
      setDevotionals(list);
    } catch (err) {
      console.error("[DevotionalsTab] erro ao carregar devocionais:", err);
      setError("Erro ao carregar devocionais. Tente novamente mais tarde.");
      Alert.alert("Erro", "Não foi possível carregar os devocionais.");
    } finally {
      setIsLoading(false);
    }
  }

  const bg = themeSettings?.cor_fundo || "#020617";
  const textColor = themeSettings?.cor_texto || "#e5e7eb";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: textColor }]}>Tela de devocionais carregada</Text>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={themeSettings?.cor_info || "#facc15"} />
          <Text style={styles.loadingText}>Carregando devocionais...</Text>
        </View>
      ) : error ? (
        <EmptyState title={error} />
      ) : devotionals.length === 0 ? (
        <EmptyState title="Nenhum devocional publicado no momento." />
      ) : (
        devotionals.map((devo) => (
          <DevocionalCard
            key={devo.id}
            devotional={devo}
            onPress={() => router.push(`/devotionals/${devo.id}` as any)}
            showStatus
            style={styles.card}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 32, gap: 12 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: { color: "#e5e7eb" },
  title: { fontSize: 18, fontWeight: "700" },
  card: { marginBottom: 8 },
});
