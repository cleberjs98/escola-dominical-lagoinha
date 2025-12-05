// app/admin/devotionals/[devotionalId].tsx - ediÃ§Ã£o de devocional espelhada em aulas
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Timestamp } from "firebase/firestore";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { Card } from "../../../components/ui/Card";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import {
  getDevotionalById,
  updateDevotional,
  setDevotionalStatus,
  publishDevotionalNow,
  deleteDevotional,
  isDevotionalDateAvailable,
} from "../../../lib/devotionals";
import { DevotionalStatus, type Devotional } from "../../../types/devotional";
import { maskDate, maskDateTime, parseDateTimeToTimestamp, formatTimestampToDateTimeInput } from "../../../utils/publishAt";

export default function EditDevotionalScreen() {
  const router = useRouter();
  const { devotionalId } = useLocalSearchParams<{ devotionalId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [titulo, setTitulo] = useState("");
  const [referenciaBiblica, setReferenciaBiblica] = useState("");
  const [dataDevocional, setDataDevocional] = useState("");
  const [publishAtInput, setPublishAtInput] = useState("");
  const [conteudoBase, setConteudoBase] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    const papel = user?.papel;
    if (papel !== "coordenador" && papel !== "administrador") {
      Alert.alert("Sem permissÃ£o", "Apenas coordenador/admin podem editar devocionais.");
      router.replace("/" as any);
      return;
    }
    void load();
  }, [firebaseUser, isInitializing, user?.papel, devotionalId]);

  async function load() {
    try {
      setLoading(true);
      const data = await getDevotionalById(devotionalId);
      if (!data) {
        Alert.alert("Erro", "Devocional nÃ£o encontrado.");
        router.replace("/(tabs)/devotionals" as any);
        return;
      }
      setDevotional(data);
      setTitulo(data.titulo);
      setReferenciaBiblica(data.referencia_biblica);
      setDataDevocional(formatDateInput(data.data_devocional));
      setConteudoBase(data.conteudo_base || data.devocional_texto || "");
      setPublishAtInput(formatTimestampToDateTimeInput(data.publish_at as Timestamp | null));
    } catch (err) {
      console.error("[DevotionalEdit] erro ao carregar devocional:", err);
      Alert.alert("Erro", "NÃ£o foi possÃ­vel carregar o devocional.");
    } finally {
      setLoading(false);
    }
  }

  function validate() {
    if (!titulo.trim()) {
      Alert.alert("Erro", "Informe o tÃ­tulo.");
      return false;
    }
    if (!referenciaBiblica.trim()) {
      Alert.alert("Erro", "Informe a referÃªncia bÃ­blica.");
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
      Alert.alert("Erro", "Data e hora invÃ¡lidas (dd/mm/aaaa hh:mm).");
      return false;
    }
    return true;
  }

  async function handleSaveEdits() {
    if (!devotional) return;
    if (!validate()) return;
    const isoDate = toISODate(dataDevocional);
    if (!isoDate) return;

    try {
      console.log("[DevotionalEdit] handleSaveEdits");
      setSubmitting(true);
      const available = await isDevotionalDateAvailable(isoDate, devotional.id);
      console.log("[DevotionalEdit] data available?", available);
      if (!available) {
        console.warn("[DevotionalEdit] já existe devocional nessa data, prosseguindo mesmo assim.");
      }
      const publishParsed = parseDateTimeToTimestamp(publishAtInput);
      await updateDevotional({
        devotionalId: devotional.id,
        titulo: titulo.trim(),
        referencia_biblica: referenciaBiblica.trim(),
        conteudo_base: conteudoBase.trim(),
        data_devocional: isoDate,
        publish_at_text: publishAtInput.trim() || null,
        publish_at: publishParsed?.timestamp ?? null,
        data_publicacao_auto: publishParsed?.display ?? null,
      });
      Alert.alert("Sucesso", "Devocional atualizado.");
      router.replace("/(tabs)/devotionals" as any);
    } catch (err) {
      console.error("[DevotionalEdit] Erro ao salvar:", err);
      Alert.alert("Erro", (err as any)?.message || "NÃ£o foi possÃ­vel salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    if (!devotional) return;
    if (!validate()) return;
    const isoDate = toISODate(dataDevocional);
    if (!isoDate) return;
    try {
      console.log("[DevotionalEdit] handleSaveDraft");
      setSubmitting(true);
      const publishParsed = parseDateTimeToTimestamp(publishAtInput);
      await updateDevotional({
        devotionalId: devotional.id,
        titulo: titulo.trim(),
        referencia_biblica: referenciaBiblica.trim(),
        conteudo_base: conteudoBase.trim(),
        data_devocional: isoDate,
        status: DevotionalStatus.RASCUNHO,
        publish_at_text: publishAtInput.trim() || null,
        publish_at: publishParsed?.timestamp ?? null,
        data_publicacao_auto: publishParsed?.display ?? null,
      });
      await setDevotionalStatus(devotional.id, DevotionalStatus.RASCUNHO);
      Alert.alert("Sucesso", "Rascunho salvo.");
      router.replace("/(tabs)/devotionals" as any);
    } catch (err) {
      console.error("[DevotionalEdit] Erro ao salvar rascunho:", err);
      Alert.alert("Erro", (err as any)?.message || "NÃ£o foi possÃ­vel salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMakeAvailable() {
    if (!devotional) return;
    if (!validate()) return;
    const isoDate = toISODate(dataDevocional);
    if (!isoDate) return;
    try {
      console.log("[DevotionalEdit] handleMakeAvailable");
      setSubmitting(true);
      const publishParsed = parseDateTimeToTimestamp(publishAtInput);
      await updateDevotional({
        devotionalId: devotional.id,
        titulo: titulo.trim(),
        referencia_biblica: referenciaBiblica.trim(),
        conteudo_base: conteudoBase.trim(),
        data_devocional: isoDate,
        status: DevotionalStatus.DISPONIVEL,
        publish_at_text: publishAtInput.trim() || null,
        publish_at: publishParsed?.timestamp ?? null,
        data_publicacao_auto: publishParsed?.display ?? null,
      });
      await setDevotionalStatus(devotional.id, DevotionalStatus.DISPONIVEL);
      Alert.alert("Sucesso", "Devocional disponibilizado.");
      router.replace("/(tabs)/devotionals" as any);
    } catch (err) {
      console.error("[DevotionalEdit] Erro ao disponibilizar:", err);
      Alert.alert("Erro", (err as any)?.message || "NÃ£o foi possÃ­vel disponibilizar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublishNow() {
    if (!devotional) return;
    if (!validate()) return;
    try {
      console.log("[DevotionalEdit] handlePublishNow");
      setSubmitting(true);
      await publishDevotionalNow(devotional.id, firebaseUser?.uid || "system");
      Alert.alert("Sucesso", "Devocional publicado.");
      router.replace("/(tabs)/devotionals" as any);
    } catch (err) {
      console.error("[DevotionalEdit] Erro ao publicar agora:", err);
      Alert.alert("Erro", (err as any)?.message || "NÃ£o foi possÃ­vel publicar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!devotional) return;
    console.log("[DevotionalEdit] handleDelete click", devotional.id);

    const doDelete = async () => {
      try {
        setSubmitting(true);
        await deleteDevotional(devotional.id);
        Alert.alert("Sucesso", "Devocional excluído.");
        router.replace("/(tabs)/devotionals" as any);
      } catch (err) {
        console.error("[DevotionalEdit] Erro ao excluir:", err);
        Alert.alert("Erro", (err as any)?.message || "Não foi possível excluir.");
      } finally {
        setSubmitting(false);
      }
    };

    // Fallback web com confirm nativo
    if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.confirm === "function") {
      const ok = window.confirm("Tem certeza que deseja excluir este devocional? Esta ação não pode ser desfeita.");
      if (ok) {
        void doDelete();
      }
      return;
    }

    Alert.alert("Excluir devocional", "Esta ação não pode ser desfeita. Deseja excluir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => void doDelete() },
    ]);
  }
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando devocional...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeSettings?.cor_fundo || "#020617" }]}
      contentContainerStyle={styles.content}
    >
      <Card
        title="Editar devocional"
        subtitle={devotional ? `Status atual: ${devotional.status}` : undefined}
        footer={devotional ? <StatusBadge status={devotional.status} variant="devotional" /> : null}
      >
        <AppInput label="TÃ­tulo" placeholder="Ex.: Devocional sobre fÃ©" value={titulo} onChangeText={setTitulo} />
        <AppInput
          label="ReferÃªncia bÃ­blica"
          placeholder="Ex.: JoÃ£o 3:16"
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
            title={submitting ? "Salvando..." : "Salvar edições"}
            variant="primary"
            onPress={handleSaveEdits}
            disabled={submitting}
          />
          <AppButton
            title={submitting ? "Salvando rascunho..." : "Salvar como rascunho"}
            variant="secondary"
            onPress={handleSaveDraft}
            disabled={submitting}
          />
          <AppButton
            title={submitting ? "Disponibilizando..." : "Disponibilizar"}
            variant="secondary"
            onPress={handleMakeAvailable}
            disabled={submitting}
          />
        </View>

        <View style={[styles.actions, { marginTop: 8 }]}>
          <AppButton
            title={submitting ? "Publicando..." : "Publicar agora"}
            variant="secondary"
            onPress={handlePublishNow}
            disabled={submitting}
          />
          <AppButton title="Excluir devocional" variant="outline" onPress={handleDelete} disabled={submitting} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12 },
  center: { flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#e5e7eb", marginTop: 12 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
});

function formatDateInput(value: string): string {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
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



