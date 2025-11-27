// app/auth/complete-profile.tsx - completar perfil com UI compartilhada
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
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
import { Card } from "../../components/ui/Card";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { useTheme } from "../../hooks/useTheme";

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUserDoc, setIsLoadingUserDoc] = useState(true);

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

  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      router.replace("/auth/login" as any);
    }
  }, [firebaseUser, isInitializing, router]);

  function handlePhoneChange(input: string) {
    const digits = input.replace(/\D/g, "");
    setTelefone(digits);
  }

  function validate() {
    if (!nome.trim()) {
      Alert.alert("Erro", "Informe o nome.");
      return false;
    }
    if (!telefone.trim()) {
      Alert.alert("Erro", "Informe o telefone.");
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!firebaseUser) {
      Alert.alert("Erro", "Usuário não autenticado.");
      return;
    }
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      const ref = doc(firebaseDb, "users", firebaseUser.uid);
      await setDoc(
        ref,
        {
          id: firebaseUser.uid,
          email: firebaseUser.email ?? "",
          nome: nome.trim(),
          telefone: telefone.trim(),
          data_nascimento: dataNascimento.trim() || null,
          papel: user?.papel || "aluno",
          status: "pendente",
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert("Sucesso", "Perfil atualizado. Aguarde aprovação.", [
        { text: "OK", onPress: () => router.replace("/auth/pending" as any) },
      ]);
    } catch (error: any) {
      console.error("Erro ao salvar perfil:", error);
      Alert.alert("Erro", error?.message || "Falha ao salvar perfil.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInitializing || isLoadingUserDoc) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: themeSettings?.cor_fundo || "#020617" },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Card
          title="Completar perfil"
          subtitle="Preencha seus dados básicos para enviarmos para aprovação."
        >
          <AppInput label="Nome completo" value={nome} onChangeText={setNome} />
          <AppInput
            label="Telefone"
            value={telefone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            placeholder="Apenas números"
          />
          <AppInput
            label="Data de nascimento (opcional)"
            value={dataNascimento}
            onChangeText={setDataNascimento}
            placeholder="YYYY-MM-DD"
          />
          <AppButton
            title={isSubmitting ? "Enviando..." : "Salvar e enviar para aprovação"}
            onPress={handleSubmit}
            loading={isSubmitting}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 64,
    paddingBottom: 32,
    gap: 12,
  },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 12,
  },
});
