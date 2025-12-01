import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { listPublishedLessons } from "../../../lib/lessons";
import type { Lesson } from "../../../types/lesson";
import { Card } from "../../../components/ui/Card";
import { AppButton } from "../../../components/ui/AppButton";

export default function LessonsTabScreen() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await listPublishedLessons();
        setLessons(data);
      } catch (error) {
        console.error("Erro ao carregar aulas:", error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando aulas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={lessons}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Text style={styles.title}>Aulas publicadas</Text>
        }
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyText}>Nenhuma aula publicada no momento.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card
            title={item.titulo}
            subtitle={`Data: ${formatDate(item.data_aula)} • Status: ${item.status}`}
            footer={
              <AppButton
                title="Ver detalhes"
                variant="outline"
                fullWidth={false}
                onPress={() => router.push(`/lessons/${item.id}` as any)}
              />
            }
          >
            <Text style={styles.desc}>{item.descricao_base}</Text>
          </Card>
        )}
      />
    </View>
  );
}

function formatDate(value: any) {
  if (!value) return "-";
  if (typeof value === "string") return value;
  if (value?.toDate) return value.toDate().toISOString().slice(0, 10);
  return String(value);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  listContent: {
    padding: 12,
    gap: 8,
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
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyText: {
    color: "#cbd5e1",
  },
  desc: {
    color: "#cbd5e1",
    marginTop: 6,
  },
});
