import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

import { firebaseAuth } from "../../lib/firebase";
import {
  PasswordRequirements,
  getPasswordValidation,
} from "../../components/PasswordRequirements";
import { mapAuthErrorToMessage } from "../../lib/auth/errorMessages";

export default function ChangePasswordScreen() {
  const router = useRouter();

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
    if (
      !validation.lengthOk ||
      !validation.hasUppercase ||
      !validation.numberAndSpecialOk
    ) {
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
      console.error("[ChangePassword] Erro na reautenticacao", err);
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

      setTimeout(() => {
        router.replace("/" as any);
      }, 800);
    } catch (err: any) {
      console.error("[ChangePassword] Erro ao atualizar senha", err);
      const msg = mapAuthErrorToMessage(err?.code ?? "auth/unknown", "reset");
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#020617" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Alterar senha</Text>
        <Text style={styles.subtitle}>
          Para sua seguranca, informe sua senha atual e escolha uma nova senha forte.
        </Text>

        <Text style={styles.label}>Senha atual</Text>
        <TextInput
          style={styles.input}
          placeholder="Senha atual"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />

        <Text style={styles.label}>Nova senha</Text>
        <TextInput
          style={styles.input}
          placeholder="Nova senha"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <PasswordRequirements password={newPassword} />

        <Text style={styles.label}>Confirmar nova senha</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirmar nova senha"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        {successMessage && <Text style={styles.successText}>{successMessage}</Text>}

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={submitting || !currentPassword || !newPassword}
        >
          {submitting ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.buttonText}>Salvar nova senha</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
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
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: "#e5e7eb",
    marginBottom: 4,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#020617",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#e5e7eb",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#facc15",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 16,
  },
  errorText: {
    color: "#f97316",
    marginBottom: 4,
  },
  successText: {
    color: "#22c55e",
    marginBottom: 4,
  },
  backButton: {
    marginTop: 16,
  },
  backText: {
    color: "#60a5fa",
    fontSize: 14,
  },
});
