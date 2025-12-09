// app/auth/login.tsx - tela de login com UI compartilhada
import { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Link, useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { firebaseAuth, firebaseDb } from "../../lib/firebase";
import { Card } from "../../components/ui/Card";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { useTheme } from "../../hooks/useTheme";
import { isNonEmpty, isValidEmail } from "../../utils/validation";
import { mapAuthErrorToMessage } from "../../lib/auth/errorMessages";

export default function LoginScreen() {
  const router = useRouter();
  const { themeSettings } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function validate() {
    if (!isValidEmail(email)) {
      setErrorMessage("Informe um email valido.");
      return false;
    }
    if (!isNonEmpty(password)) {
      setErrorMessage("Informe sua senha.");
      return false;
    }
    setErrorMessage(null);
    return true;
  }

  async function handleLogin() {
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const trimmedEmail = email.trim();

      const cred = await signInWithEmailAndPassword(
        firebaseAuth,
        trimmedEmail,
        password
      );

      const uid = cred.user.uid;
      const userRef = doc(firebaseDb, "users", uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          id: uid,
          nome: cred.user.displayName || trimmedEmail,
          sobrenome: "",
          nome_completo: cred.user.displayName || trimmedEmail,
          email: cred.user.email || trimmedEmail,
          codigo_pais: null,
          telefone: null,
          telefone_completo: null,
          data_nascimento: null,
          papel: "aluno",
          status: "pendente",
          aprovado_por_id: null,
          aprovado_em: null,
          alterado_por_id: null,
          alterado_em: serverTimestamp(),
          papel_anterior: null,
          motivo_rejeicao: null,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        router.replace("/auth/pending" as any);
        return;
      }

      const data = snap.data() as any;
      const status = data.status ?? "pendente";

      if (status === "pendente" || status === "rejeitado" || status === "vazio") {
        router.replace("/auth/pending" as any);
      } else {
        router.replace("/" as any);
      }
    } catch (error: any) {
      console.error("[Auth] Erro ao fazer login", error);
      const message = mapAuthErrorToMessage(error?.code ?? "auth/unknown", "login");
      setErrorMessage(message);
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
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <View style={styles.linksRow}>
          <Link href="/auth/forgot-password" style={styles.linkText}>
            Esqueci minha senha
          </Link>
        </View>
        <View style={styles.linksRow}>
          <Text style={styles.smallText}>Ainda nao tem conta? </Text>
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
  errorText: {
    color: "#f97316",
    marginTop: 8,
  },
});
