// app/auth/forgot-password.tsx
import { useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "../../lib/firebase";
import { mapAuthErrorToMessage } from "../../lib/auth/errorMessages";
import { useTheme } from "../../hooks/useTheme";
import { AppBackground } from "../../components/layout/AppBackground";
import { AppButton } from "../../components/ui/AppButton";
import type { AppTheme } from "../../types/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleResetPassword() {
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
      setSuccessMessage(
        "Enviamos um e-mail com instrucoes para redefinir sua senha. Verifique sua caixa de entrada (e tambem o spam)."
      );
    } catch (err: any) {
      const msg = mapAuthErrorToMessage(err?.code ?? "auth/unknown", "reset");
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppBackground>
      <View style={styles.container}>
        <Text style={styles.title}>Esqueci minha senha</Text>
        <Text style={styles.subtitle}>Informe seu email e enviaremos um link para redefinir sua senha.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="seuemail@exemplo.com"
            placeholderTextColor={theme.colors.inputPlaceholder || theme.colors.muted}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

          <AppButton title={submitting ? "Enviando..." : "Enviar email"} onPress={handleResetPassword} loading={submitting} />

          <View style={styles.linksRow}>
            <Link href="/auth/login" style={styles.linkText}>
              Voltar para login
            </Link>
          </View>
        </View>
      </View>
    </AppBackground>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 96,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.muted || theme.colors.text,
      marginBottom: 24,
    },
    form: {
      gap: 12,
    },
    label: {
      color: theme.colors.text,
      fontSize: 14,
      marginBottom: 4,
    },
    input: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder || theme.colors.border,
      backgroundColor: theme.colors.inputBg || theme.colors.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.colors.inputText || theme.colors.text,
    },
    linksRow: {
      flexDirection: "row",
      marginTop: 12,
      alignItems: "center",
    },
    linkText: {
      color: theme.colors.accent,
      fontWeight: "600",
    },
    errorText: {
      color: theme.colors.status?.dangerBg || theme.colors.primary,
      fontSize: 12,
    },
    successText: {
      color: theme.colors.text,
      fontSize: 12,
    },
  });
}
