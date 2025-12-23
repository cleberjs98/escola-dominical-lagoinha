// app/admin/devotionals/[devotionalId].tsx - edição de devocional com tema bordô
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform, BackHandler } from "react-native";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@react-navigation/elements";
import { Timestamp } from "firebase/firestore";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { Card } from "../../../components/ui/Card";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { AppBackground } from "../../../components/layout/AppBackground";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import { withAlpha } from "../../../theme/utils";
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
import type { AppTheme } from "../../../theme/tokens";

export default function EditDevotionalScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { devotionalId } = useLocalSearchParams<{ devotionalId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const backTarget = "/(tabs)/devotionals";

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
    if (papel !== "coordenador" && papel !== "administrador" && papel !== "admin") {
      Alert.alert("Sem permissão", "Apenas coordenador/admin podem editar devocionais.");
      router.replace("/(tabs)" as any);
      return;
    }
    void load();
  }, [firebaseUser, isInitializing, user?.papel, devotionalId, router]);

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

  async function load() {
    try {
      setLoading(true);
      const data = await getDevotionalById(devotionalId);
      if (!data) {
        Alert.alert("Erro", "Devocional não encontrado.");
        router.replace(backTarget as any);
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
      Alert.alert("Erro", "Não foi possível carregar o devocional.");
    } finally {
      setLoading(false);
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

  async function handleSaveEdits() {
    if (!devotional) return;
    if (!validate()) return;
    const isoDate = toISODate(dataDevocional);
    if (!isoDate) return;

    try {
      setSubmitting(true);
      const available = await isDevotionalDateAvailable(isoDate, devotional.id);
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
      router.replace(backTarget as any);
    } catch (err) {
      console.error("[DevotionalEdit] Erro ao salvar:", err);
      Alert.alert("Erro", (err as any)?.message || "Não foi possível salvar.");
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
      router.replace(backTarget as any);
    } catch (err) {
      console.error("[DevotionalEdit] Erro ao salvar rascunho:", err);
      Alert.alert("Erro", (err as any)?.message || "Não foi possível salvar.");
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
      router.replace(backTarget as any);
    } catch (err) {
      console.error("[DevotionalEdit] Erro ao disponibilizar:", err);
      Alert.alert("Erro", (err as any)?.message || "Não foi possível disponibilizar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublishNow() {
    if (!devotional) return;
    if (!validate()) return;
    try {
      setSubmitting(true);
      await publishDevotionalNow(devotional.id, firebaseUser?.uid || "system");
      Alert.alert("Sucesso", "Devocional publicado.");
      router.replace(backTarget as any);
    } catch (err) {
      console.error("[DevotionalEdit] Erro ao publicar agora:", err);
      Alert.alert("Erro", (err as any)?.message || "Não foi possível publicar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!devotional) return;

    const doDelete = async () => {
      try {
        setSubmitting(true);
        await deleteDevotional(devotional.id);
        Alert.alert("Sucesso", "Devocional excluído.");
        router.replace(backTarget as any);
      } catch (err) {
        console.error("[DevotionalEdit] Erro ao excluir:", err);
        Alert.alert("Erro", (err as any)?.message || "Não foi possível excluir.");
      } finally {
        setSubmitting(false);
      }
    };

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
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.wrapper}>
          <Card
            title="Editar devocional"
            subtitle={devotional ? `Status atual: ${devotional.status}` : undefined}
            footer={devotional ? <StatusBadge status={devotional.status} variant="devotional" /> : null}
          >
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
            <AppButton
              title={submitting ? "Excluindo..." : "Excluir devocional"}
              variant="secondary"
              onPress={handleDelete}
              disabled={submitting}
            />
          </View>
          </Card>
        </View>
      </ScrollView>
    </AppBackground>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "transparent" },
    content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12 },
    wrapper: {
      backgroundColor: withAlpha(theme.colors.card, 0.82),
      borderColor: withAlpha(theme.colors.border, 0.35),
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 10,
    },
    center: { flex: 1, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
    loadingText: { color: theme.colors.text, marginTop: 12 },
    actions: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  });
}

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






