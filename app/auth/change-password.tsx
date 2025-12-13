// app/auth/change-password.tsx
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";

import { firebaseAuth } from "../../lib/firebase";
import { PasswordRequirements, getPasswordValidation } from "../../components/PasswordRequirements";
import { mapAuthErrorToMessage } from "../../lib/auth/errorMessages";
import { useTheme } from "../../hooks/useTheme";
import { AppBackground } from "../../components/layout/AppBackground";
import type { AppTheme } from "../../types/theme";
import { AppButton } from "../../components/ui/AppButton";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleChangePassword() {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const validation = getPasswordValidation(newPassword);
    if (!validation.lengthOk || !validation.hasUppercase || !validation.numberAndSpecialOk) {
      setErrorMessage("Sua nova senha nao atende aos requisitos minimos.");
      setSubmitting(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("A confirmacao da nova senha nao confere.");
      setSubmitting(false);
      return;
    }

    const user = firebaseAuth.currentUser;
    if (!user || !user.email) {
      setErrorMessage("Nao foi possivel identificar o usuario logado.");
      setSubmitting(false);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
    } catch (err: any) {
      const code = err?.code ?? "auth/unknown";
      if (code === "auth/wrong-password") {
        setErrorMessage("Senha atual incorreta.");
      } else {
        setErrorMessage(mapAuthErrorToMessage(code, "login"));
      }
      setSubmitting(false);
      return;
    }

    try {
      await updatePassword(user, newPassword);
      setSuccessMessage("Senha alterada com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => router.back(), 800);
    } catch (err: any) {
      setErrorMessage(mapAuthErrorToMessage(err?.code ?? "auth/unknown", "reset"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollContainer>
          <View style={styles.container}>
            <Text style={styles.title}>Alterar senha</Text>
            <Text style={styles.subtitle}>Informe sua senha atual e defina uma nova senha.</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Senha atual</Text>
              <TextInput
                placeholder="*******"
                placeholderTextColor={theme.colors.inputPlaceholder || theme.colors.muted}
                secureTextEntry
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nova senha</Text>
              <TextInput
                placeholder="*******"
                placeholderTextColor={theme.colors.inputPlaceholder || theme.colors.muted}
                secureTextEntry
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirmar nova senha</Text>
              <TextInput
                placeholder="*******"
                placeholderTextColor={theme.colors.inputPlaceholder || theme.colors.muted}
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <PasswordRequirements password={newPassword} />

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

            <AppButton title={submitting ? "Salvando..." : "Salvar nova senha"} onPress={handleChangePassword} loading={submitting} />

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={submitting}>
              <Text style={styles.backText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </ScrollContainer>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

function ScrollContainer({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 80,
      gap: 12,
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
      marginBottom: 16,
    },
    formGroup: {
      gap: 6,
    },
    label: {
      fontSize: 14,
      color: theme.colors.text,
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
    errorText: {
      color: theme.colors.status?.dangerBg || theme.colors.primary,
    },
    successText: {
      color: theme.colors.text,
    },
    backButton: {
      marginTop: 12,
    },
    backText: {
      color: theme.colors.accent,
      fontSize: 14,
      fontWeight: "600",
    },
  });
}
