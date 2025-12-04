// app/admin/devotionals/new.tsx - criação de devocional alinhada ao fluxo de aulas
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
import { maskDate, maskDateTime, parseDateTimeToTimestamp } from "../../../utils/publishAt";

export default function NewDevotionalScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [titulo, setTitulo] = useState("");
  const [referenciaBiblica, setReferenciaBiblica] = useState("");
  const [dataDevocional, setDataDevocional] = useState("");
  const [publishAtInput, setPublishAtInput] = useState("");
  const [devocionalTexto, setDevocionalTexto] = useState("");
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

  function validateInputs() {
    if (!titulo.trim()) {
      Alert.alert("Erro", "Informe o título do devocional.");
      return false;
    }
    if (!referenciaBiblica.trim()) {
      Alert.alert("Erro", "Informe a referência bíblica.");
      return false;
    }
    const isoDate = toISODate(dataDevocional);
    if (!isoDate) {
      Alert.alert("Erro", "Informe a data do devocional no formato dd/mm/aaaa.");
      return false;
    }
    if (!devocionalTexto.trim()) {
      Alert.alert("Erro", "Digite o devocional.");
      return false;
    }
    if (publishAtInput.trim()) {
      const parsed = parseDateTimeToTimestamp(publishAtInput);
      if (!parsed) {
        Alert.alert("Erro", "Data e hora de publicação automática inválidas (use dd/mm/aaaa hh:mm).");
        return false;
      }
    }
    return true;
  }

  async function handleSaveDraft() {
    if (!firebaseUser) return;
    if (!validateInputs()) return;
    const isoDate = toISODate(dataDevocional);
    if (!isoDate) return;

    try {
      console.log("[DevotionalNew] handleSaveDraft chamado");
      setIsSubmitting(true);
      const available = await isDevotionalDateAvailable(isoDate);
      if (!available) {
        Alert.alert("Atenção", "Já existe um devocional para essa data.");
        return;
      }

      const publishInfo = parseDateTimeToTimestamp(publishAtInput);

      await createDevotionalDraft({
        titulo: titulo.trim(),
        referencia_biblica: referenciaBiblica.trim(),
        devocional_texto: devocionalTexto.trim(),
        data_devocional: isoDate,
        publish_at: publishInfo?.timestamp ?? null,
        data_publicacao_auto: publishInfo?.display ?? null,
        criado_por_id: firebaseUser.uid,
      });

      Alert.alert("Sucesso", "Devocional salvo como rascunho.");
      resetForm();
      router.replace("/admin/devotionals" as any);
    } catch (error) {
      console.error("[Devocionais][Criar] Erro ao salvar rascunho:", error);
      Alert.alert("Erro", (error as any)?.message || "Não foi possível salvar o devocional.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePublishNow() {
    if (!firebaseUser) return;
    if (!validateInputs()) return;
    const isoDate = toISODate(dataDevocional);
    if (!isoDate) return;

    try {
      console.log("[DevotionalNew] handlePublishNow chamado");
      setIsSubmitting(true);
      const available = await isDevotionalDateAvailable(isoDate);
      if (!available) {
        Alert.alert("Atenção", "Já existe um devocional para essa data.");
        return;
      }

      await createDevotional({
        titulo: titulo.trim(),
        referencia_biblica: referenciaBiblica.trim(),
        devocional_texto: devocionalTexto.trim(),
        data_devocional: isoDate,
        publish_at: null,
        data_publicacao_auto: null,
        criado_por_id: firebaseUser.uid,
        status: DevotionalStatus.PUBLICADO,
        publishNow: true,
      });

      Alert.alert("Sucesso", "Devocional publicado com sucesso.");
      resetForm();
      router.replace("/admin/devotionals" as any);
    } catch (error) {
      console.error("[Devocionais][Criar] Erro ao publicar devocional:", error);
      Alert.alert("Erro", (error as any)?.message || "Não foi possível publicar o devocional.");
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
          label="Referência bíblica"
          placeholder="Ex.: João 3:16"
          value={referenciaBiblica}
          onChangeText={setReferenciaBiblica}
        />

        <AppInput
          label="Data do devocional"
          placeholder="dd/mm/aaaa"
          value={dataDevocional}
          onChangeText={(text) => setDataDevocional(maskDate(text))}
        />

        <AppInput
          label="Publicar automaticamente em (data e hora)"
          placeholder="dd/mm/aaaa hh:mm"
          value={publishAtInput}
          onChangeText={(text) => setPublishAtInput(maskDateTime(text))}
        />

        <RichTextEditor
          value={devocionalTexto}
          onChange={setDevocionalTexto}
          placeholder="Digite o devocional..."
          minHeight={180}
        />

        <View style={styles.actions}>
          <AppButton
            title={isSubmitting ? "Salvando..." : "Salvar como rascunho"}
            variant="secondary"
            onPress={handleSaveDraft}
            disabled={isSubmitting}
          />
          <AppButton
            title={isSubmitting ? "Disponibilizando..." : "Disponibilizar"}
            variant="secondary"
            onPress={handleMakeAvailable}
            disabled={isSubmitting}
          />
          <AppButton
            title={isSubmitting ? "Publicando..." : "Publicar agora"}
            variant="primary"
            onPress={handlePublishNow}
            disabled={isSubmitting}
          />
        </View>
      </Card>
    </ScrollView>
  );

  function resetForm() {
    setTitulo("");
    setReferenciaBiblica("");
    setDataDevocional("");
    setPublishAtInput("");
    setDevocionalTexto("");
  }
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
  actions: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
});

function toISODate(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}
  async function handleMakeAvailable() {
    if (!firebaseUser) return;
    if (!validateInputs()) return;
    const isoDate = toISODate(dataDevocional);
    if (!isoDate) return;

    try {
      console.log("[DevotionalNew] handleMakeAvailable chamado");
      setIsSubmitting(true);
      const available = await isDevotionalDateAvailable(isoDate);
      if (!available) {
        Alert.alert("Atenção", "Já existe um devocional para essa data.");
        return;
      }

      const publishInfo = parseDateTimeToTimestamp(publishAtInput);

      await createDevotional({
        titulo: titulo.trim(),
        referencia_biblica: referenciaBiblica.trim(),
        devocional_texto: devocionalTexto.trim(),
        data_devocional: isoDate,
        publish_at: publishInfo?.timestamp ?? null,
        data_publicacao_auto: publishInfo?.display ?? null,
        criado_por_id: firebaseUser.uid,
        status: DevotionalStatus.DISPONIVEL,
      });

      Alert.alert("Sucesso", "Devocional disponibilizado.");
      resetForm();
      router.replace("/admin/devotionals" as any);
    } catch (error) {
      console.error("[Devocionais][Criar] Erro ao disponibilizar devocional:", error);
      Alert.alert("Erro", (error as any)?.message || "Não foi possível disponibilizar o devocional.");
    } finally {
      setIsSubmitting(false);
    }
  }
