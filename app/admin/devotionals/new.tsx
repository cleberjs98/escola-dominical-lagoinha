// app/admin/devotionals/new.tsx - criação de devocional com validações reforçadas
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../../../hooks/useAuth";
import {
  createDevotional,
  createDevotionalDraft,
  isDevotionalDateAvailable,
} from "../../../lib/devotionals";
import { DevotionalStatus } from "../../../types/devotional";
import { Card } from "../../../components/ui/Card";
import { AppInput } from "../../../components/ui/AppInput";
import { AppButton } from "../../../components/ui/AppButton";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import { useTheme } from "../../../hooks/useTheme";
import { isNonEmpty, isValidDateLike } from "../../../utils/validation";

export default function NewDevotionalScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [titulo, setTitulo] = useState("");
  const [dataDevocional, setDataDevocional] = useState("");
  const [conteudoBase, setConteudoBase] = useState("");
  const [dataPublicacaoAuto, setDataPublicacaoAuto] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guard de acesso
  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    const papel = user?.papel;
    if (papel !== "coordenador" && papel !== "administrador") {
      Alert.alert("Sem permissão", "Apenas coordenador/admin podem criar devocionais.");
      router.replace("/" as any);
    }
  }, [firebaseUser, isInitializing, router, user?.papel]);

  function validate() {
    if (!isNonEmpty(titulo, 3)) {
      Alert.alert("Erro", "Informe o título do devocional.");
      return false;
    }
    if (!isValidDateLike(dataDevocional)) {
      Alert.alert("Erro", "Informe a data do devocional em YYYY-MM-DD ou DD/MM/YYYY.");
      return false;
    }
    if (dataPublicacaoAuto.trim() && !isValidDateLike(dataPublicacaoAuto)) {
      Alert.alert("Erro", "Data de publicação automática inválida.");
      return false;
    }
    if (!isNonEmpty(conteudoBase, 3)) {
      Alert.alert("Erro", "Informe o conteúdo base.");
      return false;
    }
    return true;
  }

  async function handleCreate(status: DevotionalStatus, publishNow = false) {
    if (!firebaseUser) return;
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      const isAvailable = await isDevotionalDateAvailable(dataDevocional);
      if (!isAvailable) {
        Alert.alert("Atenção", "Já existe um devocional para essa data.");
        return;
      }

      const payloadBase = {
        titulo: titulo.trim(),
        conteudo_base: conteudoBase.trim(),
        data_devocional: dataDevocional.trim(),
        data_publicacao_auto: dataPublicacaoAuto.trim() || null,
      };

      if (status === "rascunho") {
        await createDevotionalDraft({
          ...payloadBase,
          criado_por_id: firebaseUser.uid,
        });
        Alert.alert("Sucesso", "Rascunho salvo.");
      } else if (publishNow) {
        const id = await createDevotional({
          ...payloadBase,
          criado_por_id: firebaseUser.uid,
          status,
          publishNow: true,
        });
        Alert.alert("Sucesso", "Devocional publicado.", [
          { text: "Editar", onPress: () => router.replace(`/admin/devotionals/${id}` as any) },
          { text: "OK" },
        ]);
      } else {
        const id = await createDevotional({
          ...payloadBase,
          criado_por_id: firebaseUser.uid,
          status,
        });
        Alert.alert("Sucesso", "Devocional criado.", [
          { text: "Editar", onPress: () => router.replace(`/admin/devotionals/${id}` as any) },
          { text: "OK" },
        ]);
      }
    } catch (error: any) {
      console.error("Erro ao criar devocional:", error);
      Alert.alert("Erro", error?.message || "Falha ao criar devocional.");
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
      style={[
        styles.container,
        { backgroundColor: themeSettings?.cor_fundo || "#020617" },
      ]}
      contentContainerStyle={styles.content}
    >
      <Card title="Criar devocional" subtitle="Preencha os campos básicos e escolha a ação.">
        <AppInput
          label="Título"
          placeholder="Ex.: Devocional sobre fé"
          value={titulo}
          onChangeText={setTitulo}
        />
        <AppInput
          label="Data do devocional"
          placeholder="YYYY-MM-DD"
          value={dataDevocional}
          onChangeText={setDataDevocional}
        />
        <AppInput
          label="Data de publicação automática (opcional)"
          placeholder="YYYY-MM-DD"
          value={dataPublicacaoAuto}
          onChangeText={setDataPublicacaoAuto}
        />
        <RichTextEditor
          value={conteudoBase}
          onChange={setConteudoBase}
          placeholder="Conteúdo base"
          minHeight={160}
        />

        <View style={styles.actions}>
          <AppButton
            title={isSubmitting ? "Salvando..." : "Salvar rascunho"}
            variant="secondary"
            onPress={() => handleCreate("rascunho")}
            disabled={isSubmitting}
          />
          <AppButton
            title={isSubmitting ? "Disponibilizando..." : "Disponibilizar"}
            variant="primary"
            onPress={() => handleCreate("disponivel")}
            disabled={isSubmitting}
          />
        </View>
        <AppButton
          title={isSubmitting ? "Publicando..." : "Publicar agora"}
          variant="secondary"
          onPress={() => handleCreate("publicado", true)}
          disabled={isSubmitting}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12 },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { color: "#e5e7eb", marginTop: 12 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
});
