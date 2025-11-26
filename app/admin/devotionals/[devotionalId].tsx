// app/admin/devotionals/[devotionalId].tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";

import { useAuth } from "../../../hooks/useAuth";
import {
  getDevotionalById,
  updateDevotionalBase,
  setDevotionalStatus,
  publishDevotionalNow,
  isDevotionalDateAvailable,
} from "../../../lib/devotionals";
import { firebaseDb } from "../../../lib/firebase";
import { DevotionalStatus, type Devotional } from "../../../types/devotional";

export default function EditDevotionalScreen() {
  const router = useRouter();
  const { devotionalId } = useLocalSearchParams<{ devotionalId: string }>();
  const { firebaseUser, user, isInitializing } = useAuth();

  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [titulo, setTitulo] = useState("");
  const [dataDevocional, setDataDevocional] = useState("");
  const [conteudoBase, setConteudoBase] = useState("");
  const [dataPublicacaoAuto, setDataPublicacaoAuto] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guard + carregar
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
  }, [devotionalId, firebaseUser, isInitializing, router, user?.papel]);

  function validate() {
    if (!titulo.trim()) {
      Alert.alert("Erro", "Informe o título do devocional.");
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

  async function checkDateDuplication(targetDate: string, ignoreId: string) {
    const available = await isDevotionalDateAvailable(targetDate, ignoreId);
    if (!available) {
      Alert.alert("Atenção", "Já existe um devocional para essa data.");
      return false;
    }
    return true;
  }

  async function handleUpdate(status: DevotionalStatus, publishNow = false, archive = false) {
    if (!devotional) return;
    if (!validate()) return;

    // Verifica duplicidade de data
    const ok = await checkDateDuplication(dataDevocional.trim(), devotional.id);
    if (!ok) return;

    try {
      setIsSubmitting(true);

      await updateDevotionalBase({
        devotionalId: devotional.id,
        titulo: titulo.trim(),
        conteudo_base: conteudoBase.trim(),
        data_devocional: dataDevocional.trim(),
        data_publicacao_auto: dataPublicacaoAuto.trim() || null,
        status: archive ? DevotionalStatus.ARQUIVADO : status,
        setPublishedNow: publishNow,
        archive,
      });

      // Se publishNow não for tratado em update, usamos publishDevotionalNow
      if (publishNow && status === DevotionalStatus.PUBLICADO) {
        await publishDevotionalNow(devotional.id);
      } else if (!publishNow && !archive && status !== DevotionalStatus.PUBLICADO) {
        await setDevotionalStatus(devotional.id, archive ? DevotionalStatus.ARQUIVADO : status);
      }

      Alert.alert("Sucesso", "Devocional atualizado.");
    } catch (error: any) {
      console.error("Erro ao atualizar devocional:", error);
      Alert.alert("Erro", error?.message || "Falha ao atualizar devocional.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInitializing || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando devocional...</Text>
      </View>
    );
  }

  if (!devotional) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Devocional não encontrado.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Editar devocional</Text>
      <Text style={styles.subtitle}>Atualize os campos e defina o status.</Text>

      <Text style={styles.label}>Título</Text>
      <TextInput
        style={styles.input}
        value={titulo}
        onChangeText={setTitulo}
        placeholderTextColor="#6b7280"
      />

      <Text style={styles.label}>Data do devocional</Text>
      <TextInput
        style={styles.input}
        value={dataDevocional}
        onChangeText={setDataDevocional}
        placeholder="YYYY-MM-DD ou DD/MM/YYYY"
        placeholderTextColor="#6b7280"
      />

      <Text style={styles.label}>Data de publicação automática (opcional)</Text>
      <TextInput
        style={styles.input}
        value={dataPublicacaoAuto}
        onChangeText={setDataPublicacaoAuto}
        placeholder="YYYY-MM-DD ou DD/MM/YYYY"
        placeholderTextColor="#6b7280"
      />

      <Text style={styles.label}>Conteúdo base</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={conteudoBase}
        onChangeText={setConteudoBase}
        multiline
        textAlignVertical="top"
        placeholderTextColor="#6b7280"
      />

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.buttonSecondary, isSubmitting && styles.disabled]}
          onPress={() => handleUpdate(DevotionalStatus.RASCUNHO)}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonSecondaryText}>
            {isSubmitting ? "Salvando..." : "Salvar rascunho"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonPrimary, isSubmitting && styles.disabled]}
          onPress={() => handleUpdate(DevotionalStatus.DISPONIVEL)}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonPrimaryText}>
            {isSubmitting ? "Atualizando..." : "Disponibilizar"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.button, styles.buttonPublish, isSubmitting && styles.disabled]}
        onPress={() => handleUpdate(DevotionalStatus.PUBLICADO, true)}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonPublishText}>
          {isSubmitting ? "Publicando..." : "Publicar agora"}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.buttonArchive, isSubmitting && styles.disabled]}
        onPress={() => handleUpdate(DevotionalStatus.ARQUIVADO, false, true)}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonArchiveText}>
          {isSubmitting ? "Arquivando..." : "Arquivar devocional"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 24,
    gap: 12,
  },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 12,
  },
  title: {
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 8,
  },
  label: {
    color: "#e5e7eb",
    fontSize: 14,
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#e5e7eb",
  },
  textarea: {
    minHeight: 160,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#475569",
  },
  buttonSecondaryText: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  buttonPrimary: {
    backgroundColor: "#22c55e",
  },
  buttonPrimaryText: {
    color: "#022c22",
    fontWeight: "700",
  },
  buttonPublish: {
    backgroundColor: "#fbbf24",
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonPublishText: {
    color: "#78350f",
    fontWeight: "700",
  },
  buttonArchive: {
    backgroundColor: "#7f1d1d",
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonArchiveText: {
    color: "#fecaca",
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.7,
  },
});
