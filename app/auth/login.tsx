// app/auth/login.tsx - tela de login com UI compartilhada
import { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Link, useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { firebaseAuth, firebaseDb } from "../../lib/firebase";
import { Card } from "../../components/ui/Card";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { useTheme } from "../../hooks/useTheme";

export default function LoginScreen() {
  const router = useRouter();
  const { themeSettings } = useTheme();

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

      const cred = await signInWithEmailAndPassword(
        firebaseAuth,
        email.trim(),
        password
      );

      const uid = cred.user.uid;
      const userRef = doc(firebaseDb, "users", uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        router.replace("/auth/complete-profile" as any);
        return;
      }

      const data = snap.data() as any;
      const status = data.status ?? "vazio";

      if (status === "vazio") {
        router.replace("/auth/complete-profile" as any);
      } else if (status === "pendente" || status === "rejeitado") {
        router.replace("/auth/pending" as any);
      } else {
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
    <View
      style={[
        styles.container,
        { backgroundColor: themeSettings?.cor_fundo || "#020617" },
      ]}
    >
      <Card title="Entrar" subtitle="Use seu email e senha para acessar o app.">
        <AppInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="email@exemplo.com"
          keyboardType="email-address"
        />
        <AppInput
          label="Senha"
          value={password}
          onChangeText={setPassword}
          placeholder="******"
          secureTextEntry
        />
        <AppButton
          title={isSubmitting ? "Entrando..." : "Entrar"}
          onPress={handleLogin}
          loading={isSubmitting}
        />
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
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 96,
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
