// app/admin/devotionals/[devotionalId].tsx - edição de devocional com UI compartilhada
import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../../hooks/useAuth";
import {
  getDevotionalById,
  updateDevotionalBase,
  setDevotionalStatus,
  publishDevotionalNow,
  isDevotionalDateAvailable,
  saveDevotionalDraft,
} from "../../../lib/devotionals";
import { DevotionalStatus, type Devotional } from "../../../types/devotional";
import { Card } from "../../../components/ui/Card";
import { AppInput } from "../../../components/ui/AppInput";
import { AppButton } from "../../../components/ui/AppButton";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useTheme } from "../../../hooks/useTheme";

const AUTOSAVE_DELAY = 3000; // ms

export default function EditDevotionalScreen() {
  const router = useRouter();
  const { devotionalId } = useLocalSearchParams<{ devotionalId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [titulo, setTitulo] = useState("");
  const [dataDevocional, setDataDevocional] = useState("");
  const [conteudoBase, setConteudoBase] = useState("");
  const [dataPublicacaoAuto, setDataPublicacaoAuto] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    async function load() {
      try {
        setIsLoading(true);
        const data = await getDevotionalById(devotionalId);
        if (!data) {
          Alert.alert("Erro", "Devocional não encontrado.");
          router.replace("/" as any);
          return;
        }
        setDevotional(data);
        setTitulo(data.titulo);
        setDataDevocional(typeof data.data_devocional === "string" ? data.data_devocional : "");
        setConteudoBase(data.conteudo_base);
        setDataPublicacaoAuto(
          typeof data.data_publicacao_auto === "string" ? data.data_publicacao_auto : ""
        );
      } catch (error) {
        console.error("Erro ao carregar devocional:", error);
        Alert.alert("Erro", "Não foi possível carregar o devocional.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [firebaseUser, isInitializing, devotionalId, router, user?.papel]);

  function validate() {
    if (!titulo.trim()) {
      Alert.alert("Erro", "Informe o título.");
      return false;
    }
    if (!dataDevocional.trim()) {
      Alert.alert("Erro", "Informe a data do devocional.");
      return false;
    }
    if (!conteudoBase.trim()) {
      Alert.alert("Erro", "Informe o conteúdo base.");
      return false;
    }
    return true;
  }

  async function handleSave(status: DevotionalStatus, publishNow = false, archive = false) {
    if (!validate() || !devotional) return;

    try {
      setIsSubmitting(true);
      const dataPub = dataPublicacaoAuto.trim() || null;

      if (publishNow) {
        await publishDevotionalNow(devotional.id);
      } else {
        await setDevotionalStatus({
          devotionalId: devotional.id,
          status: archive ? ("arquivado" as DevotionalStatus) : status,
          data_publicacao_auto: dataPub,
        });
        await updateDevotionalBase({
          devotionalId: devotional.id,
          titulo: titulo.trim(),
          conteudo_base: conteudoBase.trim(),
          data_devocional: dataDevocional.trim(),
          data_publicacao_auto: dataPub,
        });
      }

      Alert.alert("Sucesso", "Devocional atualizado.");
    } catch (error: any) {
      console.error("Erro ao atualizar devocional:", error);
      Alert.alert("Erro", error?.message || "Falha ao atualizar devocional.");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!devotional) return;
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => {
      void handleAutoSave();
    }, AUTOSAVE_DELAY);
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo, dataDevocional, conteudoBase, dataPublicacaoAuto]);

  async function handleAutoSave() {
    if (!devotional) return;
    try {
      setIsSavingDraft(true);
      const available = await isDevotionalDateAvailable(dataDevocional);
      if (!available) return;
      await saveDevotionalDraft({
        devotionalId: devotional.id,
        titulo: titulo.trim(),
        conteudo_base: conteudoBase.trim(),
        data_devocional: dataDevocional.trim(),
        data_publicacao_auto: dataPublicacaoAuto.trim() || null,
      });
      setLastSavedAt(new Date());
    } catch (error) {
      console.error("Erro ao salvar rascunho:", error);
    } finally {
      setIsSavingDraft(false);
    }
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
            title={isSubmitting || isSavingDraft ? "Salvando..." : "Salvar rascunho"}
            variant="secondary"
            onPress={() => handleSave("rascunho")}
            disabled={isSubmitting || isSavingDraft}
          />
          <AppButton
            title={isSubmitting ? "Disponibilizando..." : "Disponibilizar"}
            variant="primary"
            onPress={() => handleSave("disponivel")}
            disabled={isSubmitting}
          />
        </View>

        <View style={[styles.actions, { marginTop: 8 }]}>
          <AppButton
            title={isSubmitting ? "Publicando..." : "Publicar agora"}
            variant="secondary"
            onPress={() => handleSave("publicado", true, false)}
            disabled={isSubmitting}
          />
          <AppButton
            title="Arquivar"
            variant="outline"
            onPress={() => handleSave("publicado", false, true)}
            disabled={isSubmitting}
          />
        </View>

        {isSavingDraft ? (
          <Text style={styles.savingText}>Salvando rascunho...</Text>
        ) : lastSavedAt ? (
          <Text style={styles.savingText}>Rascunho salvo {lastSavedAt.toLocaleTimeString()}</Text>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12 },
  center: { flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#e5e7eb", marginTop: 12 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  savingText: { color: "#9ca3af", marginTop: 6 },
});
