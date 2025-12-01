import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../../../hooks/useAuth";
import { createLesson } from "../../../lib/lessons";
import { LessonStatus } from "../../../types/lesson";
import { Card } from "../../../components/ui/Card";
import { AppInput } from "../../../components/ui/AppInput";
import { AppButton } from "../../../components/ui/AppButton";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import { useTheme } from "../../../hooks/useTheme";
import { isNonEmpty } from "../../../utils/validation";

/* Ajustes fase de testes - Home, notificacoes, gestao de papeis e permissoes */

export default function NewLessonScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [title, setTitle] = useState("");
  const [biblicalReference, setBiblicalReference] = useState("");
  const [date, setDate] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [publishDate, setPublishDate] = useState("");
  const [publishHour, setPublishHour] = useState("");
  const [publishDateError, setPublishDateError] = useState<string | null>(null);
  const [publishHourError, setPublishHourError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isInitializing) return;

    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }

    const papel = user?.papel;
    if (papel !== "coordenador" && papel !== "administrador") {
      Alert.alert("Sem permissão", "Apenas coordenador/admin podem criar aulas.");
      router.replace("/" as any);
    }
  }, [firebaseUser, isInitializing, router, user?.papel]);

  function formatDateInput(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const part1 = digits.slice(0, 2);
    const part2 = digits.slice(2, 4);
    const part3 = digits.slice(4, 8);
    let formatted = part1;
    if (part2) formatted = `${part1}/${part2}`;
    if (part3) formatted = `${part1}/${part2}/${part3}`;
    setDate(formatted);
    setDateError(null);
  }

  function isValidDateDDMMYYYY(value: string): boolean {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
    const [d, m, y] = value.split("/").map((v) => Number(v));
    const dateObj = new Date(y, m - 1, d);
    return (
      dateObj.getFullYear() === y &&
      dateObj.getMonth() === m - 1 &&
      dateObj.getDate() === d
    );
  }

  function toISODate(value: string): string | null {
    if (!isValidDateDDMMYYYY(value)) return null;
    const [d, m, y] = value.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  function isValidPublishDateTime(dateStr: string, hourStr: string): boolean {
    if (!isValidDateDDMMYYYY(dateStr)) return false;
    if (!/^\d{2}:\d{2}$/.test(hourStr)) return false;
    const [d, m, y] = dateStr.split("/").map((v) => Number(v));
    const [hh, mm] = hourStr.split(":").map((v) => Number(v));
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return false;
    const dt = new Date(y, m - 1, d, hh, mm, 0);
    return (
      dt.getFullYear() === y &&
      dt.getMonth() === m - 1 &&
      dt.getDate() === d &&
      dt.getHours() === hh &&
      dt.getMinutes() === mm
    );
  }

  function toISODateTime(dateStr: string, hourStr: string): string | null {
    if (!isValidPublishDateTime(dateStr, hourStr)) return null;
    const [d, m, y] = dateStr.split("/").map((v) => v.padStart(2, "0"));
    const [hh, mm] = hourStr.split(":").map((v) => v.padStart(2, "0"));
    return `${y}-${m}-${d}T${hh}:${mm}:00Z`;
  }

  function formatPublishDateInput(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const p1 = digits.slice(0, 2);
    const p2 = digits.slice(2, 4);
    const p3 = digits.slice(4, 8);
    let formatted = p1;
    if (p2) formatted = `${p1}/${p2}`;
    if (p3) formatted = `${p1}/${p2}/${p3}`;
    setPublishDate(formatted);
    setPublishDateError(null);
  }

  function formatPublishHourInput(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    const h = digits.slice(0, 2);
    const m = digits.slice(2, 4);
    let formatted = h;
    if (m) formatted = `${h}:${m}`;
    setPublishHour(formatted);
    setPublishHourError(null);
  }

  function validateForm() {
    if (!isNonEmpty(title, 3)) {
      Alert.alert("Erro", "Informe o título da aula.");
      return false;
    }
    if (!isNonEmpty(biblicalReference, 2)) {
      Alert.alert("Erro", "Informe a referência bíblica.");
      return false;
    }
    if (!date.trim()) {
      setDateError("Informe a data da aula.");
      return false;
    }
    if (!isValidDateDDMMYYYY(date.trim())) {
      setDateError("Data inválida. Use dd/mm/aaaa.");
      return false;
    }
    setDateError(null);
    if (!isNonEmpty(description, 3)) {
      Alert.alert("Erro", "Informe a descrição base.");
      return false;
    }
    return true;
  }

  async function handleSaveDraft() {
    console.log("[CriarAula] handleSaveDraft chamado");
    if (!firebaseUser) return;
    if (!validateForm()) return;

    const isoDate = toISODate(date.trim());
    if (!isoDate) {
      setDateError("Data inválida. Use dd/mm/aaaa.");
      return;
    }

    try {
      setIsSubmitting(true);
      const lessonId = await createLesson({
        titulo: title.trim(),
        descricao_base: description.trim(),
        referencia_biblica: biblicalReference.trim(),
        data_aula: isoDate,
        status: LessonStatus.RASCUNHO,
        criado_por_id: firebaseUser.uid,
      });
      console.log("[CriarAula] Rascunho salvo", lessonId);
      Alert.alert("Sucesso", "Rascunho salvo com sucesso.");
      setTitle("");
      setBiblicalReference("");
      setDate("");
      setPublishDate("");
      setPublishHour("");
      setDescription("");
      router.push("/lessons" as any);
    } catch (error) {
      console.error("[CriarAula] Erro ao salvar rascunho", error);
      Alert.alert("Erro", "Não foi possível salvar o rascunho. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSchedule() {
    console.log("[CriarAula] handleSchedule chamado");
    if (!firebaseUser) return;
    if (!validateForm()) return;

    const isoDate = toISODate(date.trim());
    if (!isoDate) {
      setDateError("Data inválida. Use dd/mm/aaaa.");
      return;
    }
    const isoPublishAt = toISODateTime(publishDate.trim(), publishHour.trim());
    if (!isoPublishAt) {
      setPublishDateError("Informe data e hora válidas (dd/mm/aaaa e hh:mm).");
      setPublishHourError("Informe data e hora válidas (dd/mm/aaaa e hh:mm).");
      return;
    }
    if (new Date(isoPublishAt).getTime() < Date.now()) {
      setPublishHourError("Publicação não pode ser no passado.");
      return;
    }

    try {
      setIsSubmitting(true);
      const lessonId = await createLesson({
        titulo: title.trim(),
        descricao_base: description.trim(),
        referencia_biblica: biblicalReference.trim(),
        data_aula: isoDate,
        publish_at: isoPublishAt,
        status: LessonStatus.DISPONIVEL,
        criado_por_id: firebaseUser.uid,
      });
      console.log("[CriarAula] Aula agendada", lessonId);
      Alert.alert("Sucesso", "Aula criada e agendada para publicação.");
      setTitle("");
      setBiblicalReference("");
      setDate("");
      setPublishDate("");
      setPublishHour("");
      setDescription("");
      router.push("/lessons" as any);
    } catch (error) {
      console.error("[CriarAula] Erro ao agendar publicação", error);
      Alert.alert("Erro", "Não foi possível agendar a publicação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePublish() {
    console.log("[CriarAula] handlePublish chamado");
    if (!firebaseUser) return;
    if (!validateForm()) return;

    const isoDate = toISODate(date.trim());
    if (!isoDate) {
      setDateError("Data inválida. Use dd/mm/aaaa.");
      return;
    }

    try {
      setIsSubmitting(true);
      const lessonId = await createLesson({
        titulo: title.trim(),
        descricao_base: description.trim(),
        referencia_biblica: biblicalReference.trim(),
        data_aula: isoDate,
        status: LessonStatus.PUBLICADA,
        criado_por_id: firebaseUser.uid,
        publishNow: true,
      });
      console.log("[CriarAula] Aula publicada", lessonId);
      Alert.alert("Sucesso", "Aula publicada com sucesso.");
      setTitle("");
      setBiblicalReference("");
      setDate("");
      setPublishDate("");
      setPublishHour("");
      setDescription("");
      router.push("/lessons" as any);
    } catch (error) {
      console.error("[CriarAula] Erro ao publicar", error);
      Alert.alert("Erro", "Não foi possível publicar a aula. Tente novamente.");
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
      <Card title="Criar aula" subtitle="Preencha os campos básicos e escolha a ação.">
        <AppInput
          label="Título da aula"
          placeholder="Ex.: Aula sobre Romanos 8"
          value={title}
          onChangeText={setTitle}
        />
        <AppInput
          label="Referência bíblica"
          placeholder="Ex.: Mateus 5"
          value={biblicalReference}
          onChangeText={setBiblicalReference}
        />
        <AppInput
          label="Data da aula"
          placeholder="dd/mm/aaaa"
          value={date}
          keyboardType="number-pad"
          onChangeText={formatDateInput}
          error={dateError || undefined}
        />
        <AppInput
          label="Publicar automaticamente em (data)"
          placeholder="dd/mm/aaaa"
          value={publishDate}
          keyboardType="number-pad"
          onChangeText={formatPublishDateInput}
          error={publishDateError || undefined}
        />
        <AppInput
          label="Hora da publicação"
          placeholder="hh:mm"
          value={publishHour}
          keyboardType="number-pad"
          onChangeText={formatPublishHourInput}
          error={publishHourError || undefined}
        />

        <RichTextEditor
          value={description}
          onChange={setDescription}
          placeholder="Digite a descrição base da aula..."
          minHeight={180}
        />

        <View style={styles.actionsColumn}>
          <AppButton
            title={isSubmitting ? "Salvando..." : "Salvar rascunho"}
            variant="secondary"
            onPress={handleSaveDraft}
            disabled={isSubmitting}
          />
          <AppButton
            title={isSubmitting ? "Agendando..." : "Criar aula"}
            variant="secondary"
            onPress={handleSchedule}
            disabled={isSubmitting}
          />
          <AppButton
            title={isSubmitting ? "Publicando..." : "Publicar agora"}
            variant="primary"
            onPress={handlePublish}
            disabled={isSubmitting}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  actionsColumn: {
    gap: 8,
    marginTop: 12,
  },
});
