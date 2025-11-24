// app/auth/login.tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Erro", "Informe email e senha.");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Erro", "Informe um email válido.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Erro", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      await signIn(email.trim(), password);
      router.replace("/"); // por enquanto manda pra home
    } catch (error: any) {
      console.error("Erro no login:", error);
      Alert.alert("Erro ao entrar", error?.message || "Tente novamente.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entrar</Text>
      <Text style={styles.subtitle}>
        Use seu email e senha para acessar o app.
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="seuemail@exemplo.com"
          placeholderTextColor="#6b7280"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor="#6b7280"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Entrar</Text>
        </Pressable>

        <View style={styles.linksRow}>
          <Link href="/auth/forgot-password" style={styles.linkText}>
            Esqueci minha senha
          </Link>
        </View>

        <View style={styles.linksRow}>
          <Text style={styles.smallText}>Ainda não tem conta? </Text>
          <Link href="/auth/register" style={styles.linkText}>
            Criar conta
          </Link>
        </View>
      </View>
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
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#e5e7eb",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginBottom: 24,
  },
  form: {
    marginTop: 8,
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: "#e5e7eb",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#e5e7eb",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#facc15",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 16,
  },
  linksRow: {
    flexDirection: "row",
    marginTop: 12,
    alignItems: "center",
  },
  linkText: {
    color: "#38bdf8",
    fontWeight: "500",
  },
  smallText: {
    color: "#9ca3af",
    fontSize: 13,
  },
});
