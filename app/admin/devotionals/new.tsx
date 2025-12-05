// app/admin/devotionals/new.tsx - criação de devocional espelhada no fluxo de aulas
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { Card } from "../../../components/ui/Card";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import { createDevotional, isDevotionalDateAvailable } from "../../../lib/devotionals";
import { DevotionalStatus } from "../../../types/devotional";
import { maskDate, maskDateTime, parseDateTimeToTimestamp } from "../../../utils/publishAt";

export default function NewDevotionalScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [titulo, setTitulo] = useState("");
  const [referenciaBiblica, setReferenciaBiblica] = useState("");
  const [dataDevocional, setDataDevocional] = useState("");
  const [publishAtInput, setPublishAtInput] = useState("");
  const [conteudoBase, setConteudoBase] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!titulo.trim()) {
      Alert.alert("Erro", "Informe o título.");
      return false;
    }
    if (!referenciaBiblica.trim()) {
      Alert.alert("Erro", "Informe a referência bíblica.");
      return false;
    }
    if (!toISODate(dataDevocional)) {
      Alert.alert("Erro", "Informe a data do devocional em dd/mm/aaaa.");
      return false;
    }
    if (!conteudoBase.trim()) {
      Alert.alert("Erro", "Informe o devocional.");
      return false;
    }
    if (publishAtInput.trim() && !parseDateTimeToTimestamp(publishAtInput)) {
      Alert.alert("Erro", "Data e hora de publicação automática inválidas (dd/mm/aaaa hh:mm).");
      return false;
    }
    return true;
  }

  async function handleSaveDraft() {
    await handleSubmit(DevotionalStatus.RASCUNHO, "[NewDevotional] handleSaveDraft chamado");
  }

  async function handleMakeAvailable() {
    await handleSubmit(DevotionalStatus.DISPONIVEL, "[NewDevotional] handleMakeAvailable chamado");
  }

  async function handlePublishNow() {
    await handleSubmit(DevotionalStatus.PUBLICADO, "[NewDevotional] handlePublishNow chamado", true);
  }

  async function handleSubmit(status: DevotionalStatus, logPrefix: string, publishNow = false) {
    if (!firebaseUser) return;
    if (!validate()) return;
    const isoDate = toISODate(dataDevocional);
    if (!isoDate) return;

    try {
      const publishInfo = parseDateTimeToTimestamp(publishAtInput);
      console.log(logPrefix, {
        isoDate,
        publishAtInput,
        publishAtDisplay: publishInfo?.display,
        publishAtTimestamp: publishInfo?.timestamp?.toDate?.() ?? null,
        status,
        publishNow,
      });
      setIsSubmitting(true);

      const available = await isDevotionalDateAvailable(isoDate);
      console.log("[NewDevotional] data available?", available);
      // Se já existir devocional na mesma data, apenas avisa mas deixa seguir (evita travar criação)
      if (!available) {
        console.warn("[NewDevotional] já existe devocional nessa data, prosseguindo mesmo assim.");
      }

      const id = await createDevotional({
        titulo: titulo.trim(),
        referencia_biblica: referenciaBiblica.trim(),
        conteudo_base: conteudoBase.trim(),
        data_devocional: isoDate,
        publish_at_text: publishAtInput.trim() || null,
        publish_at: publishInfo?.timestamp ?? null,
        data_publicacao_auto: publishInfo?.display ?? null,
        criado_por_id: firebaseUser.uid,
        status: publishNow ? DevotionalStatus.PUBLICADO : status,
        publishNow,
      });

      console.log(`${logPrefix} sucesso:`, id);
      Alert.alert("Sucesso", status === DevotionalStatus.PUBLICADO ? "Devocional publicado." : "Devocional salvo.");
      resetForm();
      router.replace("/(tabs)/devotionals" as any);
    } catch (error) {
      console.error("[NewDevotional] Erro ao salvar devocional:", error);
      const message = (error as any)?.message || "Não foi possível salvar o devocional.";
      Alert.alert("Erro", message);
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
      <Card title="Criar devocional" subtitle="Preencha os campos e escolha a ação.">
        <AppInput label="Título" placeholder="Ex.: Devocional sobre fé" value={titulo} onChangeText={setTitulo} />
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
        <RichTextEditor value={conteudoBase} onChange={setConteudoBase} placeholder="Digite o devocional..." minHeight={180} />

        <View style={styles.actions}>
          <AppButton
            title={isSubmitting ? "Salvando..." : "Salvar como rascunho"}
            variant="secondary"
            onPress={handleSaveDraft}
            disabled={isSubmitting}
          />
          <AppButton
            title={isSubmitting ? "Disponibilizando..." : "Disponibilizar para professores"}
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
    setConteudoBase("");
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
