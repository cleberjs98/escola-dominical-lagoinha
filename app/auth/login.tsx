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
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { firebaseAuth, firebaseDb } from "../../lib/firebase";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Erro", "Informe email e senha.");
      return false;
    }

    if (!email.includes("@")) {
      Alert.alert("Erro", "Informe um email válido.");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("Erro", "A senha deve ter pelo menos 6 caracteres.");
      return false;
    }

    return true;
  }

  async function handleLogin() {
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      console.log("[Login] Fazendo login no Firebase Auth...");
      const cred = await signInWithEmailAndPassword(
        firebaseAuth,
        email.trim(),
        password
      );

      const uid = cred.user.uid;
      console.log("[Login] Usuário autenticado:", uid);

      // Buscar dados do usuário no Firestore
      const userRef = doc(firebaseDb, "users", uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        console.log(
          "[Login] Nenhum documento em 'users' para esse UID. Indo para completar perfil."
        );
        router.replace("/auth/complete-profile" as any);
        return;
      }

      const data = snap.data() as any;
      const status = data.status ?? "vazio";

      console.log("[Login] Status do usuário no Firestore:", status);

      if (status === "vazio") {
        router.replace("/auth/complete-profile" as any);
      } else if (status === "pendente") {
        // Tela que você criou na Fase 2.4 (ajuste o caminho se for diferente)
        router.replace("/auth/pending" as any);
      } else if (status === "rejeitado") {
        // Por enquanto podemos mandar para a mesma tela de pendente
        // ou criar uma tela específica depois.
        router.replace("/auth/pending" as any);
      } else {
        // Aprovado → vai para a home
        router.replace("/" as any);
      }
    } catch (error: any) {
      console.error("Erro no login:", error);
      Alert.alert("Erro ao entrar", error?.message || "Tente novamente.");
    } finally {
      setIsSubmitting(false);
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

        <Pressable
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Text>
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
  buttonDisabled: {
    opacity: 0.7,
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
