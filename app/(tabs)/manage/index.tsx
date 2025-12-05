import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "../../../hooks/useAuth";
import { firebaseDb } from "../../../lib/firebase";

/* Ajustes fase de testes — Home, notificações, gestão de papéis e permissões */

export default function ManageHubScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const papel = user?.papel || "aluno";
  const allowed = ["professor", "coordenador", "administrador"].includes(papel);
  const isCoordinatorOrAdmin = useMemo(
    () => papel === "coordenador" || papel === "administrador",
    [papel]
  );
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    if (!allowed) return;
    const usersRef = collection(firebaseDb, "users");
    const q = query(usersRef, where("status", "==", "pendente"));
    const unsub = onSnapshot(q, (snapshot) => {
      setPendingCount(snapshot.size);
    });
    return () => unsub();
  }, [allowed]);

  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      router.replace("/auth/login" as any);
    }
  }, [firebaseUser, isInitializing, router]);

  if (isInitializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!firebaseUser) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Redirecionando...</Text>
      </View>
    );
  }

  if (!allowed) {
    Alert.alert("Sem permissao", "Voce nao tem acesso a area de gestao.");
    router.replace("/(tabs)");
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Area de Gestao</Text>
      <Text style={styles.subtitle}>
        Atalhos de coordenacao/administrador/professor para aprovacoes e gestao.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Aprovacoes</Text>
        <Pressable
          style={styles.button}
          onPress={() => router.push("/manager/pending-users" as any)}
        >
          <Text style={styles.buttonText}>
            {`Aprovar usuarios (${pendingCount})`}
          </Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => router.push("/manager/pending-reservations" as any)}
        >
          <Text style={styles.buttonText}>Aprovar reservas de aula</Text>
        </Pressable>
        {isCoordinatorOrAdmin ? (
          <Pressable
            style={styles.button}
            onPress={() => router.push("/manage/user-roles" as any)}
          >
            <Text style={styles.buttonText}>Gerir papeis de usuario</Text>
          </Pressable>
        ) : null}
      </View>

      {isCoordinatorOrAdmin ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Conteudo</Text>
        <Pressable
          style={styles.button}
          onPress={() => router.push("/admin/lessons/new" as any)}
        >
          <Text style={styles.buttonText}>Criar nova aula</Text>
        </Pressable>
          <Pressable
            style={styles.button}
            onPress={() => router.push("/admin/devotionals/new" as any)}
          >
            <Text style={styles.buttonText}>Criar devocional</Text>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() => router.push("/admin/devotionals" as any)}
          >
            <Text style={styles.buttonText}>Gerenciar devocionais</Text>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() => router.push("/avisos" as any)}
          >
            <Text style={styles.buttonText}>Gerenciar avisos</Text>
          </Pressable>
        </View>
      ) : null}
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
    paddingBottom: 32,
    gap: 12,
  },
  title: {
    color: "#e5e7eb",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 12,
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
  card: {
    backgroundColor: "#0b1224",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#22c55e",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "flex-start",
    marginTop: 6,
  },
  buttonText: {
    color: "#022c22",
    fontWeight: "700",
    fontSize: 14,
  },
});
