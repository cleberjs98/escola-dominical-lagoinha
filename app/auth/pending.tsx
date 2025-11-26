// app/auth/pending.tsx
import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";

export default function PendingScreen() {
  const router = useRouter();
  const { firebaseUser, isInitializing, isPending, signOut } = useAuth();

  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      router.replace("/auth/login");
    }
  }, [firebaseUser, isInitializing, router]);

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastro em analise</Text>
      <Text style={styles.subtitle}>
        Seu perfil esta com status &quot;pendente&quot;. Nossa equipe vai revisar
        seus dados e liberar o acesso em breve.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>O que voce pode fazer agora?</Text>
        <Text style={styles.cardText}>
          - Aguarde a aprovacao do seu cadastro.{"\n"}- Verifique seu email para
          eventuais atualizacoes.{"\n"}- Caso precise corrigir algo, entre em
          contato com a coordenacao.
        </Text>

        <Pressable style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Sair da conta</Text>
        </Pressable>
      </View>

      {!isPending && (
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.secondaryButtonText}>Voltar para o in��cio</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    paddingHorizontal: 24,
    paddingTop: 96,
  },
  loadingContainer: {
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
    fontSize: 24,
    fontWeight: "700",
    color: "#e5e7eb",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#9ca3af",
    lineHeight: 20,
    marginBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#020617",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 8,
  },
  cardText: {
    color: "#cbd5e1",
    lineHeight: 20,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff7ed",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
});
