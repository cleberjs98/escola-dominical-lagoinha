// app/index.tsx
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Link } from "expo-router";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Escola Dominical Lagoinha Dublin</Text>
      <Text style={styles.subtitle}>
        App em construcao - Fase 2.4{"\n"}Tela de espera para status pendente
      </Text>

      <View style={styles.buttonsContainer}>
        <Link href="/auth/login" asChild>
          <Pressable style={styles.buttonPrimary}>
            <Text style={styles.buttonPrimaryText}>Entrar</Text>
          </Pressable>
        </Link>

        <Link href="/auth/register" asChild>
          <Pressable style={styles.buttonSecondary}>
            <Text style={styles.buttonSecondaryText}>Criar conta</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  buttonsContainer: {
    width: "100%",
    gap: 12,
  },
  buttonPrimary: {
    backgroundColor: "#facc15",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonPrimaryText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 16,
  },
  buttonSecondary: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4b5563",
  },
  buttonSecondaryText: {
    color: "#e5e7eb",
    fontWeight: "500",
    fontSize: 16,
  },
});
