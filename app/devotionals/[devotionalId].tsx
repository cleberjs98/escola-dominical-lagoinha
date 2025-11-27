// app/devotionals/[devotionalId].tsx - detalhe de devocional com UI compartilhada
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../hooks/useAuth";
import { getDevotionalById } from "../../lib/devotionals";
import type { Devotional } from "../../types/devotional";
import { listSupportMaterialsForReference } from "../../lib/materials";
import type { SupportMaterial } from "../../types/material";
import { SupportMaterialItem } from "../../components/SupportMaterialItem";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { AppButton } from "../../components/ui/AppButton";
import { useTheme } from "../../hooks/useTheme";

export default function DevotionalDetailsScreen() {
  const router = useRouter();
  const { devotionalId } = useLocalSearchParams<{ devotionalId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [devotional, setDevotional] = useState<Devotional | null>(null);
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
        const data = await getDevotionalById(devotionalId);
        if (!data) {
          Alert.alert("Erro", "Devocional não encontrado.");
          router.replace("/devotionals" as any);
          return;
        }
        setDevotional(data);

        try {
          setIsLoadingMaterials(true);
          const mats = await listSupportMaterialsForReference("devocional", devotionalId);
          setMaterials(mats);
        } catch (err) {
          console.error("Erro ao carregar materiais do devocional:", err);
        } finally {
          setIsLoadingMaterials(false);
        }
      } catch (error) {
        console.error("Erro ao carregar devocional:", error);
        Alert.alert("Erro", "Não foi possível carregar o devocional.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [devotionalId, firebaseUser, isInitializing, router, user?.status]);

  if (isInitializing || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando devocional...</Text>
      </View>
    );
  }

  if (!devotional) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Devocional não encontrado.</Text>
        <AppButton title="Voltar" variant="outline" onPress={() => router.replace("/devotionals" as any)} />
      </View>
    );
  }

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

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: themeSettings?.cor_fundo || "#020617" },
      ]}
      contentContainerStyle={styles.content}
    >
      <Card
        title={devotional.titulo}
        subtitle={`Data: ${String(devotional.data_devocional)}`}
        footer={<StatusBadge status={devotional.status} variant="devotional" />}
      />

      <Card title="Conteúdo">
        <Text style={styles.cardText}>{devotional.conteudo_base}</Text>
      </Card>

      <Card title="Materiais de apoio">
        {isLoadingMaterials ? (
          <ActivityIndicator size="small" color="#facc15" />
        ) : materials.length === 0 ? (
          <EmptyState title="Nenhum material de apoio disponível para este devocional." />
        ) : (
          materials.map((mat) => (
            <SupportMaterialItem
              key={mat.id}
              material={mat}
              onPress={() => openMaterial(mat)}
              previewImage
            />
          ))
        )}
      </Card>

      <AppButton
        title="Voltar"
        variant="outline"
        fullWidth={false}
        onPress={() => router.replace("/devotionals" as any)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12 },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  loadingText: { color: "#e5e7eb", marginTop: 12 },
  cardText: { color: "#cbd5e1", fontSize: 14 },
});
