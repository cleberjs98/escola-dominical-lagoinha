import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { Card } from "../../components/ui/Card";
import { RichTextEditor } from "../../components/editor/RichTextEditor";
import { StatusFilter } from "../../components/filters/StatusFilter";
import { createAviso } from "../../lib/avisos";
import type { AvisoDestino, AvisoTipo } from "../../types/aviso";

export default function NewAvisoScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const papel = user?.papel;
  const canPost =
    papel === "professor" || papel === "coordenador" || papel === "administrador";

  const destinoOptions = useMemo(
    () =>
      papel === "professor"
        ? (["todos", "professores"] as AvisoDestino[])
        : (["todos", "alunos", "professores", "coordenadores", "admin"] as AvisoDestino[]),
    [papel]
  );

  const [titulo, setTitulo] = useState("");
  const [destino, setDestino] = useState<AvisoDestino>(destinoOptions[0]);
  const [tipo, setTipo] = useState<AvisoTipo>("informativo");
  const [conteudo, setConteudo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (!canPost) {
      Alert.alert("Sem permissao", "Voce nao tem permissao para criar avisos.");
      router.replace("/" as any);
    }
  }, [canPost, firebaseUser, isInitializing, router]);

  function validate() {
    if (!titulo.trim()) {
      Alert.alert("Erro", "Informe o titulo do aviso.");
      return false;
    }
    if (!conteudo.trim()) {
      Alert.alert("Erro", "Informe o conteudo do aviso.");
      return false;
    }
    return true;
  }

  async function handleSubmit(status: "rascunho" | "publicado") {
    if (!firebaseUser || !user || !canPost) return;
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await createAviso(
        {
          titulo: titulo.trim(),
          conteudo: conteudo.trim(),
          destino,
          tipo,
          status,
        },
        { id: firebaseUser.uid, nome: user.nome, papel: user.papel }
      );
      Alert.alert("Sucesso", status === "publicado" ? "Aviso publicado." : "Rascunho salvo.");
      router.replace("/avisos" as any);
    } catch (err: any) {
      console.error("[Avisos] erro ao criar aviso:", err);
      Alert.alert("Erro", err?.message || "Nao foi possivel salvar o aviso.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInitializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeSettings?.cor_fundo || "#020617" }]}
      contentContainerStyle={styles.content}
    >
      <Card title="Criar aviso" subtitle="Defina titulo, destino, tipo e conteudo.">
        <AppInput
          label="Titulo"
          placeholder="Ex.: Comunicados da aula de domingo"
          value={titulo}
          onChangeText={setTitulo}
        />

        <StatusFilter
          label="Destino"
          value={destino}
          onChange={(v) => setDestino(v as AvisoDestino)}
          options={destinoOptions.map((opt) => ({ value: opt, label: destinoLabel(opt) }))}
        />

        <StatusFilter
          label="Tipo"
          value={tipo}
          onChange={(v) => setTipo(v as AvisoTipo)}
          options={[
            { value: "informativo", label: "Informativo" },
            { value: "urgente", label: "Urgente" },
            { value: "interno", label: "Interno" },
            { value: "espiritual", label: "Espiritual" },
          ]}
        />

        <RichTextEditor
          value={conteudo}
          onChange={setConteudo}
          placeholder="Conteudo do aviso..."
          minHeight={180}
        />

        <View style={styles.actions}>
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
          <AppButton
            title="Cancelar"
            variant="outline"
            onPress={() => router.back()}
            fullWidth={false}
            disabled={isSubmitting}
          />
        </View>
      </Card>
    </ScrollView>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12 },
  center: { flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#e5e7eb", marginTop: 12 },
  actions: { gap: 8, marginTop: 12 },
});
