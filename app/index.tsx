// app/index.tsx
import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../hooks/useAuth";

export default function HomeScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing, signOut } = useAuth();

  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      // Se não estiver logado, manda pra tela de login
      router.replace("/auth/login" as any);
    }
  }, [firebaseUser, isInitializing, router]);

  if (isInitializing || (!firebaseUser && isInitializing)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!firebaseUser) {
    // Enquanto o redirecionamento acontece
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Redirecionando para login...</Text>
      </View>
    );
  }

  const nome = user?.nome || firebaseUser.email || "Usuário";
  const papel = user?.papel || "desconhecido";
  const status = user?.status || "vazio";

  const isAluno = papel === "aluno";
  const isProfessor = papel === "professor";
  const isCoordenador = papel === "coordenador";
  const isAdmin = papel === "administrador";

  async function handleSignOut() {
    try {
      await signOut();
      router.replace("/auth/login" as any);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.welcome}>Bem-vindo(a),</Text>
        <Text style={styles.name}>{nome}</Text>
        <Text style={styles.infoLine}>
          Papel: <Text style={styles.badge}>{papel}</Text>
        </Text>
        <Text style={styles.infoLine}>
          Status: <Text style={styles.status}>{status}</Text>
        </Text>
      </View>

      {/* Aviso para pendentes / rejeitados */}
      {status !== "aprovado" && (
        <View style={styles.cardWarning}>
          <Text style={styles.cardTitle}>Seu cadastro ainda não foi aprovado</Text>
          <Text style={styles.cardText}>
            Aguarde até que a liderança revise seus dados. Assim que for aprovado,
            novas funcionalidades serão liberadas para você.
          </Text>
          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => router.replace("/auth/pending" as any)}
          >
            <Text style={styles.buttonSecondaryText}>Ver detalhes</Text>
          </Pressable>
        </View>
      )}

      {/* Bloco para ALUNO */}
      {status === "aprovado" && isAluno && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Área do Aluno</Text>
          <Text style={styles.cardText}>
            Em breve você verá aqui as próximas aulas, devocional do dia e
            materiais de apoio.
          </Text>
        </View>
      )}

      {/* Bloco para PROFESSOR */}
      {status === "aprovado" && isProfessor && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Área do Professor</Text>
          <Text style={styles.cardText}>
            Em breve você poderá reservar aulas, ver suas aulas reservadas e
            publicar notícias.
          </Text>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/professor/available-lessons" as any)}
          >
            <Text style={styles.buttonOutlineText}>
              Ver aulas disponíveis para reserva
            </Text>
          </Pressable>
        </View>
      )}

      {/* Bloco para COORDENADOR */}
      {status === "aprovado" && isCoordenador && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Painel do Coordenador</Text>
          <Text style={styles.cardText}>
            Acesse rapidamente as aprovações de cadastro e, futuramente, a gestão
            de aulas e devocionais.
          </Text>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/admin/lessons/new" as any)}
          >
            <Text style={styles.buttonOutlineText}>Criar nova aula</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/manager/pending-reservations" as any)}
          >
            <Text style={styles.buttonOutlineText}>Ver reservas de aula pendentes</Text>
          </Pressable>

          <Pressable
            style={styles.button}
            onPress={() => router.push("/manager/pending-users" as any)}
          >
            <Text style={styles.buttonText}>Aprovar usuários pendentes</Text>
          </Pressable>
        </View>
      )}

      {/* Bloco para ADMINISTRADOR */}
      {status === "aprovado" && isAdmin && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Painel do Administrador</Text>
          <Text style={styles.cardText}>
            Atalhos para aprovações e gerenciamento completo de usuários.
          </Text>

          <Pressable
            style={styles.button}
            onPress={() => router.push("/admin/pending-users" as any)}
          >
            <Text style={styles.buttonText}>Aprovar usuários pendentes</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/admin/users" as any)}
          >
            <Text style={styles.buttonOutlineText}>Gerenciar todos os usuários</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/admin/lessons/new" as any)}
          >
            <Text style={styles.buttonOutlineText}>Criar nova aula</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.buttonOutline]}
            onPress={() => router.push("/manager/pending-reservations" as any)}
          >
            <Text style={styles.buttonOutlineText}>Ver reservas de aula pendentes</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.footer}>
        <Pressable style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutText}>Sair</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  welcome: {
    color: "#9ca3af",
    fontSize: 14,
  },
  name: {
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 2,
  },
  infoLine: {
    color: "#9ca3af",
    marginTop: 4,
    fontSize: 13,
  },
  badge: {
    color: "#facc15",
    fontWeight: "600",
  },
  status: {
    color: "#38bdf8",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#020617",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 16,
    marginBottom: 16,
  },
  cardWarning: {
    backgroundColor: "#451a03",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#92400e",
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  cardText: {
    color: "#d1d5db",
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#22c55e",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonText: {
    color: "#022c22",
    fontWeight: "600",
    fontSize: 14,
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#22c55e",
    marginTop: 8,
  },
  buttonOutlineText: {
    color: "#bbf7d0",
    fontWeight: "600",
    fontSize: 14,
  },
  buttonSecondary: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  buttonSecondaryText: {
    color: "#fbbf24",
    fontWeight: "600",
    fontSize: 14,
  },
  footer: {
    marginTop: 24,
    alignItems: "flex-start",
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  logoutText: {
    color: "#f97316",
    fontSize: 13,
    fontWeight: "500",
  },
});
