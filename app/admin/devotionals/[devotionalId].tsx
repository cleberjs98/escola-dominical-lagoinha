// app/admin/devotionals/[devotionalId].tsx - edição completa de devocionais
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Timestamp } from "firebase/firestore";

import { useAuth } from "../../../hooks/useAuth";
import {
  getDevotionalById,
  updateDevotionalBase,
  publishDevotionalNow,
  isDevotionalDateAvailable,
  archiveDevotional,
} from "../../../lib/devotionals";
import { DevotionalStatus, type Devotional } from "../../../types/devotional";
import { Card } from "../../../components/ui/Card";
import { AppInput } from "../../../components/ui/AppInput";
import { AppButton } from "../../../components/ui/AppButton";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useTheme } from "../../../hooks/useTheme";
import {
  formatTimestampToDateInput,
  formatTimestampToDateTimeInput,
  maskDate,
  maskDateTime,
  parseDateTimeToTimestamp,
} from "../../../utils/publishAt";

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
  const [devocionalTexto, setDevocionalTexto] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    const papel = user?.papel;
    if (papel !== "coordenador" && papel !== "administrador") {
      Alert.alert("Sem permissão", "Apenas coordenador/admin podem editar devocionais.");
      router.replace("/" as any);
      return;
    }

    void load();
  }, [firebaseUser, isInitializing, devotionalId, router, user?.papel]);

  async function load() {
    try {
      setIsLoading(true);
      const data = await getDevotionalById(devotionalId);
      if (!data) {
        Alert.alert("Erro", "Devocional não encontrado.");
        router.replace("/admin/devotionals" as any);
        return;
      }
      setDevotional(data);
      setTitulo(data.titulo);
      setReferenciaBiblica(data.referencia_biblica);
      setDataDevocional(formatDateInput(data.data_devocional));
      setDevocionalTexto(data.devocional_texto);
      setPublishAtInput(formatTimestampToDateTimeInput(data.publish_at as Timestamp | null));
    } catch (error) {
      console.error("[Devocionais][Editar] Erro ao carregar devocional:", error);
      Alert.alert("Erro", "Não foi possível carregar o devocional.");
    } finally {
      setIsLoading(false);
    }
  }

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
    if (!devocionalTexto.trim()) {
      Alert.alert("Erro", "Informe o devocional.");
      return false;
    }
    if (publishAtInput.trim() && !parseDateTimeToTimestamp(publishAtInput)) {
      Alert.alert("Erro", "Data e hora de publicação automática inválidas (use dd/mm/aaaa hh:mm).");
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
      setIsSubmitting(true);
      const available = await isDevotionalDateAvailable(isoDate, devotional.id);
      if (!available) {
        Alert.alert("Atenção", "Já existe um devocional para essa data.");
        return;
      }
      const publishParsed = parseDateTimeToTimestamp(publishAtInput);
      await updateDevotionalBase({
        devotionalId: devotional.id,
        titulo: titulo.trim(),
        referencia_biblica: referenciaBiblica.trim(),
        devocional_texto: devocionalTexto.trim(),
        data_devocional: isoDate,
        publish_at: publishParsed?.timestamp ?? null,
        data_publicacao_auto: publishParsed?.display ?? null,
      });
      Alert.alert("Sucesso", "Devocional atualizado.");
      router.replace("/admin/devotionals" as any);
    } catch (error) {
      console.error("[Devocionais][Editar] Erro ao salvar:", error);
      Alert.alert("Erro", (error as any)?.message || "Não foi possível salvar o devocional.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    if (!devotional) return;
    if (!validate()) return;
    const isoDate = toISODate(dataDevocional);
    if (!isoDate) return;
    try {
      setIsSubmitting(true);
      const available = await isDevotionalDateAvailable(isoDate, devotional.id);
      if (!available) {
        Alert.alert("Atenção", "Já existe um devocional para essa data.");
        return;
      }
      const publishParsed = parseDateTimeToTimestamp(publishAtInput);
      await updateDevotionalBase({
        devotionalId: devotional.id,
        titulo: titulo.trim(),
        referencia_biblica: referenciaBiblica.trim(),
        devocional_texto: devocionalTexto.trim(),
        data_devocional: isoDate,
        status: DevotionalStatus.RASCUNHO,
        publish_at: publishParsed?.timestamp ?? null,
        data_publicacao_auto: publishParsed?.display ?? null,
      });
      Alert.alert("Sucesso", "Rascunho salvo.");
      router.replace("/admin/devotionals" as any);
    } catch (error) {
      console.error("[Devocionais][Editar] Erro ao salvar rascunho:", error);
      Alert.alert("Erro", (error as any)?.message || "Não foi possível salvar o rascunho.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePublishNow() {
    if (!devotional) return;
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      await publishDevotionalNow(devotional.id);
      await updateDevotionalBase({
        devotionalId: devotional.id,
        publish_at: null,
        data_publicacao_auto: null,
      });
      Alert.alert("Sucesso", "Devocional publicado.");
      router.replace("/admin/devotionals" as any);
    } catch (error) {
      console.error("[Devocionais][Editar] Erro ao publicar agora:", error);
      Alert.alert("Erro", (error as any)?.message || "Não foi possível publicar o devocional.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!devotional) return;
    Alert.alert(
      "Excluir devocional",
      "Tem certeza que deseja excluir este devocional? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await archiveDevotional(devotional.id);
              Alert.alert("Sucesso", "Devocional excluído com sucesso.");
              router.replace("/admin/devotionals" as any);
            } catch (error) {
              console.error("[Devocionais][Editar] Erro ao excluir:", error);
              Alert.alert("Erro", (error as any)?.message || "Não foi possível excluir o devocional.");
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando devocional...</Text>
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
      <Card
        title="Editar devocional"
        subtitle={devotional ? `Status: ${devotional.status}` : undefined}
        footer={devotional ? <StatusBadge status={devotional.status} variant="devotional" /> : null}
      >
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
            title={isSubmitting ? "Salvando..." : "Salvar edições"}
            variant="primary"
            onPress={handleSaveEdits}
            disabled={isSubmitting}
          />
          <AppButton
            title={isSubmitting ? "Salvando rascunho..." : "Salvar como rascunho"}
            variant="secondary"
            onPress={handleSaveDraft}
            disabled={isSubmitting}
          />
        </View>

        <View style={[styles.actions, { marginTop: 8 }]}>
          <AppButton
            title={isSubmitting ? "Publicando..." : "Publicar agora"}
            variant="secondary"
            onPress={handlePublishNow}
            disabled={isSubmitting}
          />
          <AppButton
            title="Excluir devocional"
            variant="outline"
            onPress={handleDelete}
            disabled={isSubmitting}
          />
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
  return formatTimestampToDateInput(
    Timestamp.fromDate(new Date(Number(year), Number(month) - 1, Number(day)))
  );
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
