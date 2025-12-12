// app/devotionals/[devotionalId].tsx - detalhe de devocional com ajustes para aluno
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
  Platform,
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
import { formatDate } from "../../utils/publishAt";
import { deleteDevotional } from "../../lib/devotionals";

export default function DevotionalDetailsScreen() {
  const router = useRouter();
  const { devotionalId } = useLocalSearchParams<{ devotionalId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();
  const role = user?.papel;
  const isStudent = role === "aluno";
  const isProfessor = role === "professor";
  const isAdminOrCoordinator =
    role === "administrador" || role === "admin" || role === "coordenador";
  const isBasicView = isStudent || isProfessor;

  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [materials, setMaterials] = useState<SupportMaterial[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (!isAdminOrCoordinator && user?.status !== "aprovado") {
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
        <AppButton
          title="Voltar"
          variant="outline"
          onPress={() => router.replace("/devotionals" as any)}
        />
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
        title={
          isBasicView
            ? `${devotional.titulo} - ${formatDateString(devotional.data_devocional)}`
            : devotional.titulo
        }
        subtitle={
          isBasicView
            ? devotional.referencia_biblica
            : `Data: ${formatDateString(devotional.data_devocional)} • ${devotional.referencia_biblica}`
        }
        footer={isBasicView ? null : <StatusBadge status={devotional.status} variant="devotional" />}
      />

      <Card title="Devocional">
        <Text style={styles.cardText}>{devotional.devocional_texto}</Text>
      </Card>

      {isBasicView && (
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
      )}

      {!isBasicView ? (
        <View style={styles.actions}>
          <AppButton
            title="Editar"
            variant="primary"
            fullWidth={false}
            onPress={() => router.push(`/admin/devotionals/${devotional.id}` as any)}
          />
          <AppButton
            title={submitting ? "Excluindo..." : "Excluir devocional"}
            variant="secondary"
            fullWidth={false}
            onPress={handleDelete}
            disabled={submitting}
          />
        </View>
      ) : null}

      <View style={styles.footerButtons}>
        <AppButton
          title="Voltar"
          variant="outline"
          fullWidth={false}
          onPress={() => router.replace("/(tabs)/devotionals" as any)}
        />
      </View>
    </ScrollView>
  );

  async function handleDelete() {
    if (!devotional) return;

    const doDelete = async () => {
      try {
        setSubmitting(true);
        await deleteDevotional(devotional.id);
        Alert.alert("Sucesso", "Devocional excluido.");
        router.replace("/(tabs)/devotionals" as any);
      } catch (err) {
        console.error("Erro ao excluir devocional:", err);
        Alert.alert("Erro", "Nao foi possivel excluir o devocional.");
      } finally {
        setSubmitting(false);
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.confirm === "function") {
      const ok = window.confirm("Tem certeza que deseja excluir este devocional? Esta ação não pode ser desfeita.");
      if (ok) {
        void doDelete();
      }
      return;
    }

    Alert.alert("Excluir devocional", "Esta ação não pode ser desfeita. Deseja excluir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => void doDelete() },
    ]);
  }
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
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  footerButtons: {
    marginTop: 12,
  },
});

function formatDateString(value: string): string {
  if (!value) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return formatDate(date);
}


