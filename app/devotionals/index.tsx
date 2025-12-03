// Lista de devocionais publicados (rota compartilhada para /devotionals e /(tabs)/devotionals)
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { DevocionalCard } from "../../components/cards/DevocionalCard";
import { AppButton } from "../../components/ui/AppButton";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { listPublishedDevotionals } from "../../lib/devotionals";
import type { Devotional } from "../../types/devotional";

export default function DevotionalsScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (user?.status && user.status !== "aprovado") {
      router.replace("/auth/pending" as any);
    }
  }, [firebaseUser, isInitializing, router, user?.status]);

  useEffect(() => {
    if (!firebaseUser || isInitializing) return;
    if (user?.status !== "aprovado") return;
    void loadDevotionals();
  }, [firebaseUser, isInitializing, user?.status]);

  async function loadDevotionals() {
    try {
      setIsLoading(true);
      const list = await listPublishedDevotionals();
      setDevotionals(list);
    } catch (error) {
      console.error("[Devocionais][Lista] Erro ao carregar devocionais:", error);
      Alert.alert("Erro", "Não foi possível carregar os devocionais.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isInitializing || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando devocionais...</Text>
      </View>
    );
  }

  if (!firebaseUser) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Redirecionando para login...</Text>
      </View>
    );
  }

  const bg = themeSettings?.cor_fundo || "#020617";
  const textColor = themeSettings?.cor_texto || "#e5e7eb";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: textColor }]}>Devocionais</Text>

      {devotionals.length === 0 ? (
        <EmptyState title="Nenhum devocional publicado." />
      ) : (
        devotionals.map((devo) => (
          <DevocionalCard
            key={devo.id}
            devotional={devo}
            onPress={() => router.push(`/devotionals/${devo.id}` as any)}
          />
        ))
      )}

      <View style={styles.actions}>
        <AppButton title="Atualizar" variant="outline" fullWidth={false} onPress={loadDevotionals} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  loadingText: { color: "#e5e7eb", marginTop: 12 },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  actions: {
    marginTop: 4,
  },
});
