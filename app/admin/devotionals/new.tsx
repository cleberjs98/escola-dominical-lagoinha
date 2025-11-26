// app/admin/devotionals/new.tsx
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
import { useRouter } from "expo-router";

import { useAuth } from "../../../hooks/useAuth";
import {
  createDevotional,
  createDevotionalDraft,
  isDevotionalDateAvailable,
} from "../../../lib/devotionals";
import { DevotionalStatus } from "../../../types/devotional";

export default function NewDevotionalScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();

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
        criado_por_id: firebaseUser.uid,
      };

      let id: string;
      if (status === DevotionalStatus.RASCUNHO) {
        id = await createDevotionalDraft(payloadBase);
      } else {
        id = await createDevotional({
          ...payloadBase,
          status,
          publishNow,
        });
      }

      Alert.alert("Sucesso", "Devocional criado!", [
        {
          text: "Editar devocional",
          onPress: () => router.replace(`/admin/devotionals/${id}` as any),
        },
        { text: "OK" },
      ]);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Criar devocional</Text>
      <Text style={styles.subtitle}>
        Preencha os campos e escolha a ação desejada.
      </Text>

      <Text style={styles.label}>Título</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex.: Devocional sobre João 3"
        placeholderTextColor="#6b7280"
        value={titulo}
        onChangeText={setTitulo}
      />

      <Text style={styles.label}>Data do devocional</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD ou DD/MM/YYYY"
        placeholderTextColor="#6b7280"
        value={dataDevocional}
        onChangeText={setDataDevocional}
      />

      <Text style={styles.label}>Data de publicação automática (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD ou DD/MM/YYYY"
        placeholderTextColor="#6b7280"
        value={dataPublicacaoAuto}
        onChangeText={setDataPublicacaoAuto}
      />

      <Text style={styles.label}>Conteúdo base</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="Digite o conteúdo base..."
        placeholderTextColor="#6b7280"
        value={conteudoBase}
        onChangeText={setConteudoBase}
        multiline
        textAlignVertical="top"
      />

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.buttonSecondary, isSubmitting && styles.disabled]}
          onPress={() => handleCreate(DevotionalStatus.RASCUNHO)}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonSecondaryText}>
            {isSubmitting ? "Salvando..." : "Salvar rascunho"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonPrimary, isSubmitting && styles.disabled]}
          onPress={() => handleCreate(DevotionalStatus.DISPONIVEL)}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonPrimaryText}>
            {isSubmitting ? "Enviando..." : "Disponibilizar"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.button, styles.buttonPublish, isSubmitting && styles.disabled]}
        onPress={() => handleCreate(DevotionalStatus.PUBLICADO, true)}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonPublishText}>
          {isSubmitting ? "Publicando..." : "Publicar agora"}
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
  disabled: {
    opacity: 0.7,
  },
});
