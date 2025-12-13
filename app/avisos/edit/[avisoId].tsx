import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import { AppInput } from "../../../components/ui/AppInput";
import { AppButton } from "../../../components/ui/AppButton";
import { Card } from "../../../components/ui/Card";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import { StatusFilter } from "../../../components/filters/StatusFilter";
import { getAvisoById, updateAviso } from "../../../lib/avisos";
import type { Aviso, AvisoDestino, AvisoTipo } from "../../../types/aviso";
import { AppBackground } from "../../../components/layout/AppBackground";
import type { AppTheme } from "../../../types/theme";

export default function EditAvisoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const avisoId = params.avisoId as string;
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const papel = user?.papel;
  const canEdit = papel === "professor" || papel === "coordenador" || papel === "administrador";

  const destinoOptions = useMemo(
    () =>
      papel === "professor"
        ? (["todos", "professores"] as AvisoDestino[])
        : (["todos", "alunos", "professores", "coordenadores", "admin"] as AvisoDestino[]),
    [papel]
  );

  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [titulo, setTitulo] = useState("");
  const [destino, setDestino] = useState<AvisoDestino>("todos");
  const [tipo, setTipo] = useState<AvisoTipo>("informativo");
  const [conteudo, setConteudo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login");
      return;
    }
    void loadAviso();
  }, [firebaseUser, isInitializing]);

  async function loadAviso() {
    try {
      setIsLoading(true);
      const fetched = await getAvisoById(avisoId);
      if (!fetched) {
        Alert.alert("Aviso não encontrado", "Ele pode ter sido removido.");
        router.replace("/avisos");
        return;
      }
      setAviso(fetched);
      setTitulo(fetched.titulo || "");
      setDestino((fetched.destino as AvisoDestino) || "todos");
      setTipo((fetched.tipo as AvisoTipo) || "informativo");
      setConteudo(fetched.conteudo || "");
    } catch (error) {
      console.error("[Avisos] Erro ao carregar aviso", error);
      Alert.alert("Erro", "Nao foi possivel carregar o aviso.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(status: "rascunho" | "publicado") {
    if (!firebaseUser || !canEdit || !aviso) return;
    if (!titulo.trim() || !conteudo.trim()) {
      Alert.alert("Campos obrigatorios", "Titulo e conteudo sao obrigatorios.");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateAviso(avisoId, {
        titulo,
        conteudo,
        destino,
        tipo,
        status,
      });
      Alert.alert("Sucesso", status === "publicado" ? "Aviso atualizado e publicado." : "Rascunho atualizado.");
      router.replace("/avisos");
    } catch (error) {
      console.error("[Avisos] Erro ao atualizar aviso", error);
      Alert.alert("Erro", "Nao foi possivel salvar o aviso agora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInitializing || isLoading) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando aviso...</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card title="Editar aviso" subtitle="Atualize as informacoes do aviso.">
          <AppInput label="Titulo" value={titulo} onChangeText={setTitulo} placeholder="Ex: Atualizacao importante" />

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
            <AppButton title="Cancelar" variant="outline" onPress={() => router.back()} fullWidth={false} disabled={isSubmitting} />
          </View>
        </Card>
      </ScrollView>
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
    container: { flex: 1 },
    content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12 },
    center: { flex: 1, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center" },
    loadingText: { color: theme.colors.text, marginTop: 12 },
    actions: { gap: 8, marginTop: 12 },
  });
}
