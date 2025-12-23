export const options = {
  title: "Criar aviso",
};

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@react-navigation/elements";

import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { RichTextEditor } from "../../components/editor/RichTextEditor";
import { StatusFilter } from "../../components/filters/StatusFilter";
import { createAviso } from "../../lib/avisos";
import type { AvisoDestino, AvisoTipo } from "../../types/aviso";
import { AppBackground } from "../../components/layout/AppBackground";
import { KeyboardScreen } from "../../components/layout/KeyboardScreen";
import type { AppTheme } from "../../types/theme";

export default function NewAvisoScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const backTarget = "/avisos";

  const [titulo, setTitulo] = useState("");
  const [destino, setDestino] = useState<AvisoDestino>("todos");
  const [tipo, setTipo] = useState<AvisoTipo>("informativo");
  const [conteudo, setConteudo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const papel = user?.papel;
  const canPost = papel === "professor" || papel === "coordenador" || papel === "administrador";

  const destinoOptions = useMemo(() => {
    if (papel === "professor") {
      return ["todos", "professores"] as AvisoDestino[];
    }
    return ["todos", "alunos", "professores", "coordenadores", "admin"] as AvisoDestino[];
  }, [papel]);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login");
    }
  }, [firebaseUser, isInitializing, router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => (
        <HeaderBackButton onPress={() => router.replace(backTarget as any)} tintColor={theme.colors.text} />
      ),
    });
  }, [navigation, router, theme.colors.text, backTarget]);

  useFocusEffect(
    useMemo(
      () => () => {
        const onBack = () => {
          router.replace(backTarget as any);
          return true;
        };
        const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
        return () => sub.remove();
      },
      [router, backTarget]
    )
  );

  async function handleSubmit(status: "rascunho" | "publicado") {
    if (!firebaseUser) {
      Alert.alert("Sessao expirada", "Faca login novamente para criar avisos.");
      router.replace("/auth/login");
      return;
    }

    if (!canPost) {
      Alert.alert("Sem permissao", "Seu perfil nao pode criar avisos.");
      return;
    }

    if (!titulo.trim() || !conteudo.trim()) {
      Alert.alert("Campos obrigatorios", "Titulo e conteudo sao obrigatorios.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createAviso(
        {
          titulo,
          conteudo,
          destino,
          tipo,
          status,
        },
        {
          id: firebaseUser.uid,
          nome: user?.nome || firebaseUser.displayName || firebaseUser.email || "Usuario",
          papel: user?.papel,
        }
      );
      Alert.alert("Sucesso", status === "publicado" ? "Aviso publicado." : "Rascunho salvo.");
      router.replace(backTarget as any);
    } catch (error) {
      console.error("[Avisos] Erro ao salvar aviso", error);
      Alert.alert("Erro", "Nao foi possivel salvar o aviso agora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInitializing) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <KeyboardScreen style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Criar aviso</Text>

        <AppInput label="Titulo" value={titulo} onChangeText={setTitulo} placeholder="Ex: Reuniao de equipe" />

        <StatusFilter
          label="Destino"
          options={destinoOptions.map((d) => ({ label: destinoLabel(d), value: d }))}
          value={destino}
          onChange={(v) => setDestino(v as AvisoDestino)}
        />

        <StatusFilter
          label="Tipo"
          options={[
            { label: "Informativo", value: "informativo" },
            { label: "Urgente", value: "urgente" },
            { label: "Interno", value: "interno" },
            { label: "Espiritual", value: "espiritual" },
          ]}
          value={tipo}
          onChange={(v) => setTipo(v as AvisoTipo)}
        />

        <RichTextEditor value={conteudo} onChange={setConteudo} placeholder="Conteudo do aviso..." minHeight={180} />

        <View style={styles.actionsRow}>
          <AppButton
            title={isSubmitting ? "Salvando..." : "Salvar como rascunho"}
            variant="secondary"
            onPress={() => handleSubmit("rascunho")}
            disabled={isSubmitting}
          />
          <AppButton
            title={isSubmitting ? "Publicando..." : "Publicar agora"}
            variant="primary"
            onPress={() => handleSubmit("publicado")}
            disabled={isSubmitting}
          />
        </View>

        <View style={[styles.actionsRow, { marginTop: 8 }]}>
          <AppButton title="Cancelar" variant="outline" onPress={() => router.replace(backTarget as any)} fullWidth={false} disabled={isSubmitting} />
        </View>
      </KeyboardScreen>
    </AppBackground>
  );
}

function destinoLabel(destino: AvisoDestino) {
  switch (destino) {
    case "todos":
      return "Todos";
    case "alunos":
      return "Alunos";
    case "professores":
      return "Professores";
    case "coordenadores":
      return "Coordenadores";
    case "admin":
      return "Administradores";
    default:
      return destino;
  }
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 16, gap: 12, paddingBottom: 24 },
    center: { flex: 1, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
    loadingText: { color: theme.colors.text, marginTop: 12 },
    title: { color: theme.colors.textPrimary || theme.colors.text, fontSize: 20, fontWeight: "700" },
    actionsRow: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  });
}
