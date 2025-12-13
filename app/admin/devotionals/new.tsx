// app/admin/devotionals/new.tsx - criação de devocional (layout alinhado à criação de aula)
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, ImageBackground } from "react-native";
import { useRouter } from "expo-router";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import { createDevotional, isDevotionalDateAvailable } from "../../../lib/devotionals";
import { DevotionalStatus } from "../../../types/devotional";
import { maskDate, maskDateTime, parseDateTimeToTimestamp } from "../../../utils/publishAt";
import { AppBackground } from "../../../components/layout/AppBackground";
import type { AppTheme } from "../../../theme/tokens";

export default function NewDevotionalScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
    if (papel !== "coordenador" && papel !== "administrador" && papel !== "admin") {
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
      Alert.alert("Erro", "Data e hora inválidas (dd/mm/aaaa hh:mm).");
      return false;
    }
    return true;
  }

  async function handleSaveDraft() {
    await handleSubmit(DevotionalStatus.RASCUNHO);
  }

  async function handleMakeAvailable() {
    await handleSubmit(DevotionalStatus.DISPONIVEL);
  }

  async function handlePublishNow() {
    await handleSubmit(DevotionalStatus.PUBLICADO, true);
  }

  async function handleSubmit(status: DevotionalStatus, publishNow = false) {
    if (!firebaseUser) return;
    if (!validate()) return;
    const isoDate = toISODate(dataDevocional);
    if (!isoDate) return;

    try {
      setIsSubmitting(true);
      const isAvailable = await isDevotionalDateAvailable(isoDate);
      if (!isAvailable) {
        console.warn("[NewDevotional] já existe devocional nesta data, prosseguindo mesmo assim.");
      }
      const parsed = parseDateTimeToTimestamp(publishAtInput);
      await createDevotional({
        titulo: titulo.trim(),
        referencia_biblica: referenciaBiblica.trim(),
        conteudo_base: conteudoBase.trim(),
        data_devocional: isoDate,
        status,
        publish_at_text: publishAtInput.trim() || null,
        publish_at: parsed?.timestamp ?? null,
        data_publicacao_auto: parsed?.display ?? null,
        publish_now: publishNow,
        criado_por: firebaseUser.uid,
      });
      Alert.alert("Sucesso", "Devocional criado.");
      resetForm();
      router.replace("/(tabs)/devotionals" as any);
    } catch (error) {
      console.error("[NewDevotional] erro ao criar:", error);
      Alert.alert("Erro", "Não foi possível criar o devocional.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInitializing) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando devocional...</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ImageBackground
        source={require("../../../assets/brand/lagoinha-badge-watermark.png")}
        style={styles.bgImage}
        imageStyle={styles.bgImageStyle}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Criar devocional</Text>

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
          <RichTextEditor
            value={conteudoBase}
            onChange={setConteudoBase}
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
          </View>

          <View style={[styles.actions, { marginTop: 8 }]}>
            <AppButton
              title={isSubmitting ? "Publicando..." : "Publicar agora"}
              variant="primary"
              onPress={handlePublishNow}
              disabled={isSubmitting}
            />
          </View>
        </ScrollView>
      </ImageBackground>
    </AppBackground>
  );

  function resetForm() {
    setTitulo("");
    setReferenciaBiblica("");
    setDataDevocional("");
    setPublishAtInput("");
    setConteudoBase("");
  }
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "transparent" },
    content: { padding: 16, gap: 12, paddingBottom: 24 },
    center: { flex: 1, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
    loadingText: { color: theme.colors.text, marginTop: 12 },
    actions: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
    title: { color: theme.colors.textPrimary || "#FFFFFF", fontSize: 20, fontWeight: "700" },
    bgImage: { flex: 1 },
    bgImageStyle: { opacity: 0.05, resizeMode: "cover" },
  });
}

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
