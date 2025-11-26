// app/auth/complete-profile.tsx
import { useEffect, useState } from "react";
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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { useAuth } from "../../hooks/useAuth";
import { firebaseDb } from "../../lib/firebase";
import type { User } from "../../types/user";

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUserDoc, setIsLoadingUserDoc] = useState(true);

  // Carregar dados existentes (se já houver doc no Firestore)
  useEffect(() => {
    async function loadUserDoc() {
      if (!firebaseUser) {
        setIsLoadingUserDoc(false);
        return;
      }

      try {
        const ref = doc(firebaseDb, "users", firebaseUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data() as User;
          setNome(data.nome ?? "");
          setTelefone(data.telefone ?? "");
          setDataNascimento(data.data_nascimento ?? "");
        } else {
          setNome(user?.nome ?? "");
        }
      } catch (error) {
        console.error("Erro ao carregar doc do usuário:", error);
      } finally {
        setIsLoadingUserDoc(false);
      }
    }

    loadUserDoc();
  }, [firebaseUser, user]);

  // Se não estiver logado, manda pra login
  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      router.replace("/auth/login" as any);
    }
  }, [firebaseUser, isInitializing, router]);

  // -----------------------------
  // Helpers de formatação
  // -----------------------------

  function handlePhoneChange(input: string) {
    // Mantém apenas dígitos
    const digits = input.replace(/\D/g, "");
    if (!digits) {
      setTelefone("");
      return;
    }

    // Formatação simples em blocos (ex: 089 123 4567)
    let formatted = digits;

    if (digits.length > 3 && digits.length <= 7) {
      formatted = `${digits.slice(0, 3)} ${digits.slice(3)}`;
    } else if (digits.length > 7) {
      formatted = `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(
        7
      )}`;
    }

    setTelefone(formatted);
  }

  function handleDateChange(input: string) {
    // Remove tudo que não for número
    const digits = input.replace(/\D/g, "").slice(0, 8); // até ddmmaaaa

    let formatted = digits;

    if (digits.length > 2 && digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(
        4
      )}`;
    }

    setDataNascimento(formatted);
  }

  function validate() {
    if (!nome.trim()) {
      Alert.alert("Erro", "Informe seu nome completo.");
      return false;
    }

    const phoneDigits = telefone.replace(/\D/g, "");
    if (phoneDigits.length < 9) {
      Alert.alert("Erro", "Informe um telefone válido (mínimo 9 dígitos).");
      return false;
    }

    if (!dataNascimento.trim()) {
      Alert.alert("Erro", "Informe sua data de nascimento (dd/mm/aaaa).");
      return false;
    }

    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dataNascimento.trim().match(regex);
    if (!match) {
      Alert.alert("Erro", "Use o formato dd/mm/aaaa para a data de nascimento.");
      return false;
    }

    const dia = Number(match[1]);
    const mes = Number(match[2]);
    const ano = Number(match[3]);

    const date = new Date(ano, mes - 1, dia);
    if (
      date.getFullYear() !== ano ||
      date.getMonth() !== mes - 1 ||
      date.getDate() !== dia
    ) {
      Alert.alert("Erro", "Data de nascimento inválida.");
      return false;
    }

    const hoje = new Date();
    const idade = hoje.getFullYear() - ano;
    if (idade < 10) {
      Alert.alert(
        "Atenção",
        "A idade mínima considerada aqui é 10 anos. Verifique a data informada."
      );
      return false;
    }

    return true;
  }

  async function handleSaveProfile() {
    if (!firebaseUser) {
      Alert.alert("Erro", "Nenhum usuário autenticado. Faça login novamente.");
      router.replace("/auth/login" as any);
      return;
    }

    if (!validate()) return;

    try {
      setIsSubmitting(true);

      const uid = firebaseUser.uid;
      const ref = doc(firebaseDb, "users", uid);
      const now = serverTimestamp();

      const payload: Partial<User> = {
        id: uid,
        nome: nome.trim(),
        email: firebaseUser.email ?? "",
        telefone: telefone.trim(),
        data_nascimento: dataNascimento.trim(),
        papel: user?.papel ?? "aluno",
        status: "pendente",
        aprovado_por_id: null,
        aprovado_em: null,
        alterado_por_id: null,
        alterado_em: now as any,
        papel_anterior: user?.papel_anterior ?? null,
        motivo_rejeicao: null,
        updated_at: now as any,
      };

      const snap = await getDoc(ref);
      if (!snap.exists()) {
        (payload as any).created_at = now;
      }

      await setDoc(ref, payload, { merge: true });
      console.log("[CompleteProfile] Perfil salvo com sucesso, redirecionando...");

      // Alerta nativo do navegador (funciona bem no Web)
      if (typeof window !== "undefined") {
        window.alert(
          "Perfil atualizado! Seus dados foram enviados para análise. Aguarde aprovação."
        );
      }

      // Agora mandamos direto para a tela de espera (status pendente)
      router.replace("/auth/pending" as any);
    } catch (error: any) {
      console.error("Erro ao salvar perfil:", error);
      Alert.alert(
        "Erro ao salvar perfil",
        error?.message || "Tente novamente mais tarde."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInitializing || isLoadingUserDoc) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
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
          <Text style={styles.title}>Completar perfil</Text>
          <Text style={styles.subtitle}>
            Preencha seus dados para concluir o cadastro.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dados pessoais</Text>

            <Text style={styles.label}>Nome completo</Text>
            <TextInput
              placeholder="Seu nome"
              placeholderTextColor="#6b7280"
              style={styles.input}
              value={nome}
              onChangeText={setNome}
            />

            <Text style={styles.label}>Telefone (WhatsApp)</Text>
            <TextInput
              placeholder="089 123 4567"
              placeholderTextColor="#6b7280"
              style={styles.input}
              keyboardType="phone-pad"
              value={telefone}
              onChangeText={handlePhoneChange}
            />

            <Text style={styles.helperText}>
              Use o número com DDD (mínimo 9 dígitos).
            </Text>

            <Text style={styles.label}>Data de nascimento</Text>
            <TextInput
              placeholder="dd/mm/aaaa"
              placeholderTextColor="#6b7280"
              style={styles.input}
              keyboardType="numeric"
              value={dataNascimento}
              onChangeText={handleDateChange}
              maxLength={10}
            />

            <Text style={styles.helperText}>
              Digite apenas números, nós formatamos para você.
            </Text>

            <Pressable
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#111827" />
              ) : (
                <Text style={styles.buttonText}>
                  Salvar e enviar para análise
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 12,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 32,
    backgroundColor: "#020617",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#e5e7eb",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#020617",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: "#e5e7eb",
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#e5e7eb",
  },
  helperText: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  button: {
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#022c22",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
});
