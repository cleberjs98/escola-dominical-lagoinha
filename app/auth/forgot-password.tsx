import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Link } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "../../lib/firebase";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleResetPassword() {
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Erro", "Informe um email válido.");
      return;
    }

    try {
      setIsSubmitting(true);
      await sendPasswordResetEmail(firebaseAuth, email.trim());
      Alert.alert(
        "Email enviado",
        "Se existir uma conta com esse email, você receberá instruções para redefinir a senha."
      );
    } catch (error: any) {
      console.error("Erro ao enviar email de reset:", error);
      Alert.alert(
        "Erro",
        error?.message || "Não foi possível enviar o email. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
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

        <Pressable
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#111827" />
          ) : (
            <Text style={styles.buttonText}>Enviar email</Text>
          )}
        </Pressable>

        <View style={styles.linksRow}>
          <Link href="/auth/login" style={styles.linkText}>
            Voltar para login
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
    opacity: 0.6,
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
});
