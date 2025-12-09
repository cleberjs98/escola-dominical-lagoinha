// app/auth/forgot-password.tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "../../lib/firebase";
import { mapAuthErrorToMessage } from "../../lib/auth/errorMessages";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleResetPassword() {
    console.log("[ForgotPassword] Clique no botão Enviar email");
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage("Informe seu e-mail.");
      setSuccessMessage(null);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await sendPasswordResetEmail(firebaseAuth, trimmedEmail);
      console.log("[ForgotPassword] E-mail de reset enviado com sucesso");
      setSuccessMessage(
        "Enviamos um e-mail com instruções para redefinir sua senha. Verifique sua caixa de entrada (e também o spam)."
      );
    } catch (err: any) {
      console.error("[ForgotPassword] Erro ao enviar e-mail de reset", err);
      const msg = mapAuthErrorToMessage(err?.code ?? "auth/unknown", "reset");
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Esqueci minha senha</Text>
      <Text style={styles.subtitle}>
        Informe seu email e enviaremos um link para redefinir sua senha.
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

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.buttonText}>Enviar email</Text>
          )}
        </Pressable>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Voltar para login</Text>
        </Pressable>

        <View style={styles.linksRow}>
          <Text style={styles.smallText}>Lembrou a senha? </Text>
          <Link href="/auth/login" style={styles.linkText}>
            Fazer login
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
    marginBottom: 4,
  },
  button: {
    backgroundColor: "#facc15",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 16,
  },
  errorText: { color: "#f97316", marginBottom: 4 },
  successText: { color: "#22c55e", marginBottom: 4 },
  backButton: {
    marginTop: 16,
    alignItems: "center",
  },
  backText: {
    color: "#38bdf8",
    fontWeight: "500",
    fontSize: 14,
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
