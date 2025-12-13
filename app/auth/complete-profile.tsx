// app/auth/complete-profile.tsx - fluxo legado de completar perfil (visual atualizado)
import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { useAuth } from "../../hooks/useAuth";
import { firebaseDb } from "../../lib/firebase";
import type { User } from "../../types/user";
import { Card } from "../../components/ui/Card";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { useTheme } from "../../hooks/useTheme";
import { AppBackground } from "../../components/layout/AppBackground";
import { isNonEmpty, isValidDateLike, isValidPhone } from "../../utils/validation";
import type { AppTheme } from "../../types/theme";

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
        console.error("[CompleteProfile] Erro ao carregar usuario", error);
      } finally {
        setIsLoadingUserDoc(false);
      }
    }

    void loadUserDoc();
  }, [firebaseUser, user]);

  async function handleSave() {
    if (!firebaseUser) return;
    if (!isNonEmpty(nome) || !isNonEmpty(telefone) || !isNonEmpty(dataNascimento)) {
      Alert.alert("Campos obrigatorios", "Preencha nome, telefone e data de nascimento.");
      return;
    }
    if (!isValidPhone(telefone)) {
      Alert.alert("Telefone invalido", "Informe um telefone valido (com DDD ou codigo de pais).");
      return;
    }
    if (!isValidDateLike(dataNascimento)) {
      Alert.alert("Data invalida", "Use o formato DD/MM/AAAA.");
      return;
    }

    try {
      setIsSubmitting(true);
      const ref = doc(firebaseDb, "users", firebaseUser.uid);
      await setDoc(
        ref,
        {
          nome,
          telefone,
          data_nascimento: dataNascimento,
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );
      Alert.alert("Sucesso", "Dados atualizados.");
      router.replace("/");
    } catch (error) {
      console.error("[CompleteProfile] Erro ao salvar", error);
      Alert.alert("Erro", "Nao foi possivel salvar seus dados agora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInitializing || isLoadingUserDoc) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card title="Completar perfil" subtitle="Informe os dados que faltam para concluir seu cadastro.">
            <AppInput label="Nome" value={nome} onChangeText={setNome} placeholder="Seu nome completo" />
            <AppInput label="Telefone" value={telefone} onChangeText={setTelefone} placeholder="+353..." keyboardType="phone-pad" />
            <AppInput label="Data de nascimento" value={dataNascimento} onChangeText={setDataNascimento} placeholder="DD/MM/AAAA" />

            <AppButton title={isSubmitting ? "Salvando..." : "Salvar dados"} onPress={handleSave} loading={isSubmitting} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      color: theme.colors.text,
      marginTop: 12,
    },
    content: {
      padding: 20,
      gap: 12,
    },
  });
}
