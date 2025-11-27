// app/lessons/[lessonId].tsx - detalhe da aula com UI compartilhada
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
import { doc, getDoc } from "firebase/firestore";

import { useAuth } from "../../hooks/useAuth";
import { firebaseDb } from "../../lib/firebase";
import { getLessonById } from "../../lib/lessons";
import type { Lesson } from "../../types/lesson";
import type { User } from "../../types/user";
import { listSupportMaterialsForReference } from "../../lib/materials";
import type { SupportMaterial } from "../../types/material";
import { SupportMaterialItem } from "../../components/SupportMaterialItem";
import { Card } from "../../components/ui/Card";
import { AppButton } from "../../components/ui/AppButton";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useTheme } from "../../hooks/useTheme";

export default function LessonDetailsScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [professor, setProfessor] = useState<User | null>(null);
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
        const data = await getLessonById(lessonId);
        if (!data) {
          Alert.alert("Erro", "Aula não encontrada.");
          router.replace("/lessons" as any);
          return;
        }
        setLesson(data);

        if (data.professor_reservado_id) {
          const profRef = doc(firebaseDb, "users", data.professor_reservado_id);
          const profSnap = await getDoc(profRef);
          if (profSnap.exists()) {
            setProfessor(profSnap.data() as User);
          }
        }

        try {
          setIsLoadingMaterials(true);
          const mats = await listSupportMaterialsForReference("aula", lessonId);
          setMaterials(mats);
        } catch (err) {
          console.error("Erro ao carregar materiais da aula:", err);
        } finally {
          setIsLoadingMaterials(false);
        }
      } catch (error) {
        console.error("Erro ao carregar aula:", error);
        Alert.alert("Erro", "Não foi possível carregar a aula.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [firebaseUser, isInitializing, lessonId, router, user?.status]);

  if (isInitializing || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando aula...</Text>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Aula não encontrada.</Text>
        <AppButton title="Voltar" variant="outline" onPress={() => router.replace("/lessons" as any)} />
      </View>
    );
  }

  const professorNome =
    professor?.nome || professor?.email || lesson.professor_reservado_id || "Professor não definido";

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
        title={lesson.titulo}
        subtitle={`Data da aula: ${String(lesson.data_aula)}`}
        footer={<StatusBadge status={lesson.status} variant="lesson" />}
      >
        {lesson.professor_reservado_id ? (
          <Text style={styles.subtitleSmall}>Professor: {professorNome}</Text>
        ) : null}
      </Card>

      <Card title="Descrição base">
        <Text style={styles.cardText}>{lesson.descricao_base}</Text>
      </Card>

      <Card title="Complemento do professor">
        {lesson.complemento_professor ? (
          <Text style={styles.cardText}>{lesson.complemento_professor}</Text>
        ) : (
          <Text style={styles.cardTextMuted}>
            O professor ainda não adicionou complementos para esta aula.
          </Text>
        )}
      </Card>

      <Card title="Materiais de apoio">
        {isLoadingMaterials ? (
          <ActivityIndicator size="small" color="#facc15" />
        ) : materials.length === 0 ? (
          <EmptyState title="Nenhum material de apoio disponível para esta aula." />
        ) : (
          materials.map((m) => (
            <SupportMaterialItem
              key={m.id}
              material={m}
              onPress={() => openMaterial(m)}
              previewImage
            />
          ))
        )}
      </Card>

      <AppButton
        title="Voltar"
        variant="outline"
        fullWidth={false}
        onPress={() => router.replace("/lessons" as any)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  subtitleSmall: {
    color: "#9ca3af",
    fontSize: 13,
  },
  cardText: {
    color: "#cbd5e1",
    fontSize: 14,
  },
  cardTextMuted: {
    color: "#94a3b8",
    fontSize: 13,
  },
});
