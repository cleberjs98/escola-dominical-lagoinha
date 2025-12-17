export const options = {
  title: "Admin",
};
import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import { AppInput } from "../../../components/ui/AppInput";
import { AppButton } from "../../../components/ui/AppButton";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import { maskDate, maskDateTime, parseDateTimeToTimestamp } from "../../../utils/publishAt";
import { createLessonAvailable, createLessonDraft } from "../../../lib/lessons";
import { AppBackground } from "../../../components/layout/AppBackground";
import { KeyboardScreen } from "../../../components/layout/KeyboardScreen";
import type { AppTheme } from "../../../theme/tokens";

export default function NewLessonScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [titulo, setTitulo] = useState("");
  const [referencia, setReferencia] = useState("");
  const [dataAula, setDataAula] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [descricao, setDescricao] = useState("");
  const [errors, setErrors] = useState<{ data?: string; publish?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    const papel = user?.papel;
    if (papel !== "coordenador" && papel !== "administrador") {
      Alert.alert("Sem permissão", "Apenas coordenador/admin podem criar aulas.");
      router.replace("/lessons" as any);
    }
  }, [firebaseUser, isInitializing, router, user?.papel]);

  function validateBase(): boolean {
    const newErrors: { data?: string; publish?: string } = {};
    if (!titulo.trim()) {
      Alert.alert("Erro", "Informe o título da aula.");
      return false;
    }
    if (!referencia.trim()) {
      Alert.alert("Erro", "Informe a referência bíblica.");
      return false;
    }
    if (!dataAula.trim()) {
      newErrors.data = "Informe a data da aula (dd/mm/aaaa).";
      setErrors(newErrors);
      return false;
    }
    setErrors(newErrors);
    return true;
  }

  function ensurePublishAtValid(): boolean {
    if (!publishAt.trim()) return true;
    const parsed = parseDateTimeToTimestamp(publishAt.trim());
    if (!parsed) {
      setErrors((prev) => ({ ...prev, publish: "Data/hora inválida (dd/mm/aaaa hh:mm)." }));
      return false;
    }
    setErrors((prev) => ({ ...prev, publish: undefined }));
    return true;
  }

  function clearForm() {
    setTitulo("");
    setReferencia("");
    setDataAula("");
    setPublishAt("");
    setDescricao("");
    setErrors({});
  }

  async function handleSubmit(status: "rascunho" | "disponivel") {
    if (!firebaseUser) return;
    if (!validateBase()) return;
    if (!ensurePublishAtValid()) return;

    try {
      setSubmitting(true);
      if (status === "rascunho") {
        await createLessonDraft(
          {
            titulo: titulo.trim(),
            referencia_biblica: referencia.trim(),
            descricao_base: descricao.trim(),
            data_aula_text: dataAula.trim(),
            publish_at_text: publishAt.trim() || null,
          },
          firebaseUser.uid
        );
        Alert.alert("Sucesso", "Aula salva como rascunho.");
      } else {
        await createLessonAvailable(
          {
            titulo: titulo.trim(),
            referencia_biblica: referencia.trim(),
            descricao_base: descricao.trim(),
            data_aula_text: dataAula.trim(),
            publish_at_text: publishAt.trim() || null,
          },
          firebaseUser.uid
        );
        Alert.alert("Sucesso", "Aula criada e disponibilizada para os professores.");
      }
      clearForm();
      router.replace("/lessons" as any);
    } catch (err) {
      console.error("Erro ao salvar aula:", err);
      Alert.alert("Erro", (err as Error)?.message || "Não foi possível salvar a aula.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isInitializing) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.textPrimary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <KeyboardScreen style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Criar aula</Text>
        <AppInput
          label="Título da aula"
          placeholder="Ex.: Aula sobre Romanos 8"
          value={titulo}
          onChangeText={setTitulo}
        />
        <AppInput
          label="Referência bíblica"
          placeholder="Ex.: Romanos 8"
          value={referencia}
          onChangeText={setReferencia}
        />
        <AppInput
          label="Data da aula"
          placeholder="dd/mm/aaaa"
          keyboardType="number-pad"
          value={dataAula}
          onChangeText={(v) => {
            setDataAula(maskDate(v));
            setErrors((prev) => ({ ...prev, data: undefined }));
          }}
          error={errors.data}
        />
        <AppInput
          label="Publicar automaticamente em (opcional)"
          placeholder="dd/mm/aaaa hh:mm"
          keyboardType="number-pad"
          value={publishAt}
          onChangeText={(v) => {
            setPublishAt(maskDateTime(v));
            setErrors((prev) => ({ ...prev, publish: undefined }));
          }}
          error={errors.publish}
          helperText="Digite ddmmaaaa hh:mm. Deixe vazio para não agendar."
        />
        <RichTextEditor
          value={descricao}
          onChange={setDescricao}
          placeholder="Descrição base da aula..."
          minHeight={180}
        />

        <View style={styles.actions}>
          <AppButton
            title={submitting ? "Salvando..." : "Salvar rascunho"}
            variant="secondary"
            onPress={() => handleSubmit("rascunho")}
            disabled={submitting}
          />
          <AppButton
            title={submitting ? "Criando..." : "Criar aula disponível"}
            variant="primary"
            onPress={() => handleSubmit("disponivel")}
            disabled={submitting}
          />
        </View>
      </KeyboardScreen>
    </AppBackground>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "transparent",
    },
    content: {
      padding: 16,
      gap: 12,
      paddingBottom: 24,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      color: theme.colors.textSecondary,
      marginTop: 12,
    },
    title: {
      color: theme.colors.textPrimary || "#FFFFFF",
      fontSize: 20,
      fontWeight: "700",
    },
    actions: {
      gap: 8,
      marginTop: 12,
    },
  });
}
