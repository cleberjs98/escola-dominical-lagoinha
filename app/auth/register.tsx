// app/auth/register.tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function validate() {
    if (!nome.trim()) {
      Alert.alert("Erro", "Informe seu nome completo.");
      return false;
    }

    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Erro", "Informe um email válido.");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("Erro", "A senha deve ter pelo menos 6 caracteres.");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erro", "As senhas não conferem.");
      return false;
    }

    return true;
  }

  async function handleRegister() {
    if (!validate()) return;

    try {
      console.log("[Register] Chamando signUp...");
      await signUp({
        nome: nome.trim(),
        email: email.trim(),
        password,
      });
      console.log("[Register] signUp finalizado com sucesso.");

      Alert.alert(
        "Conta criada",
        "Sua conta foi criada com sucesso. Agora você pode fazer login e completar seu perfil."
      );

      router.replace("/auth/login");
    } catch (error: any) {
      console.error("Erro no cadastro (handleRegister):", error);
      Alert.alert(
        "Erro ao criar conta",
        error?.message || "Tente novamente mais tarde."
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#020617" }}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>
            Preencha os dados abaixo para se cadastrar.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Nome completo</Text>
            <TextInput
              placeholder="Seu nome"
              placeholderTextColor="#6b7280"
              style={styles.input}
              value={nome}
              onChangeText={setNome}
            />

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

            <Text style={styles.label}>Confirmar senha</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#6b7280"
              style={styles.input}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <Pressable style={styles.button} onPress={handleRegister}>
              <Text style={styles.buttonText}>Criar conta</Text>
            </Pressable>

            <View style={styles.linksRow}>
              <Text style={styles.smallText}>Já tem conta? </Text>
              <Link href="/auth/login" style={styles.linkText}>
                Fazer login
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 96,
    paddingBottom: 32,
    backgroundColor: "#020617",
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
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#022c22",
    fontWeight: "600",
    fontSize: 16,
  },
  linksRow: {
    flexDirection: "row",
    marginTop: 16,
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
