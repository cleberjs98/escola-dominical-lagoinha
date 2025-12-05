import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import { AppInput } from "../../../components/ui/AppInput";
import { AppButton } from "../../../components/ui/AppButton";
import { Card } from "../../../components/ui/Card";
import { RichTextEditor } from "../../../components/editor/RichTextEditor";
import { StatusFilter } from "../../../components/filters/StatusFilter";
import { getAvisoById, updateAviso, deleteAviso } from "../../../lib/avisos";
import type { Aviso, AvisoDestino, AvisoStatus, AvisoTipo } from "../../../types/aviso";
import { StatusBadge } from "../../../components/ui/StatusBadge";

export default function EditAvisoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ avisoId: string }>();
  const avisoId = params.avisoId;

  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const papel = user?.papel;
  const isCoordinatorOrAdmin = papel === "coordenador" || papel === "administrador";
  const destinoOptions =
    papel === "professor"
      ? (["todos", "professores"] as AvisoDestino[])
      : (["todos", "alunos", "professores", "coordenadores", "admin"] as AvisoDestino[]);

  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [titulo, setTitulo] = useState("");
  const [destino, setDestino] = useState<AvisoDestino>("todos");
  const [tipo, setTipo] = useState<AvisoTipo>("informativo");
  const [conteudo, setConteudo] = useState("");
  const [status, setStatus] = useState<AvisoStatus>("rascunho");
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = useMemo(() => {
    if (!firebaseUser || !aviso) return false;
    if (isCoordinatorOrAdmin) return true;
    return aviso.criado_por_id === firebaseUser.uid && papel === "professor";
  }, [aviso, firebaseUser, isCoordinatorOrAdmin, papel]);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (papel && !["professor", "coordenador", "administrador"].includes(papel)) {
      Alert.alert("Sem permissao", "Voce nao pode editar avisos.");
      router.replace("/avisos" as any);
      return;
    }
    if (avisoId) {
      void loadAviso(avisoId);
    }
  }, [avisoId, firebaseUser, isInitializing, papel, router]);

  async function loadAviso(id: string) {
    try {
      const data = await getAvisoById(id);
      if (!data) {
        Alert.alert("Aviso", "Aviso nao encontrado.");
        router.replace("/avisos" as any);
        return;
      }
      if (papel === "professor" && data.criado_por_id !== firebaseUser?.uid) {
        Alert.alert("Permissao", "Voce nao tem permissao para editar este aviso.");
        router.replace("/avisos" as any);
        return;
      }
      setAviso(data);
      setTitulo(data.titulo);
      setDestino(data.destino);
      setTipo(data.tipo);
      setConteudo(data.conteudo);
      setStatus(data.status);
    } catch (err) {
      console.error("[Avisos] erro ao carregar aviso:", err);
      Alert.alert("Erro", "Nao foi possivel carregar o aviso.");
      router.replace("/avisos" as any);
    }
  }

  async function handleSave(nextStatus?: AvisoStatus) {
    if (!aviso || !canEdit) return;
    if (!titulo.trim() || !conteudo.trim()) {
      Alert.alert("Erro", "Preencha titulo e conteudo.");
      return;
    }
    try {
      setIsSaving(true);
      const newStatus = nextStatus || status;
      await updateAviso(aviso.id, {
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        destino,
        tipo,
        status: newStatus,
      });
      setStatus(newStatus);
      Alert.alert("Sucesso", "Aviso atualizado.");
      router.replace("/avisos" as any);
    } catch (err: any) {
      console.error("[Avisos] erro ao salvar aviso:", err);
      Alert.alert("Erro", err?.message || "Nao foi possivel atualizar o aviso.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!aviso || !canEdit) return;
    Alert.alert("Excluir aviso", "Deseja excluir este aviso?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            setIsSaving(true);
            await deleteAviso(aviso.id);
            router.replace("/avisos" as any);
          } catch (err) {
            console.error("[Avisos] erro ao excluir aviso:", err);
            Alert.alert("Erro", "Nao foi possivel excluir o aviso.");
          } finally {
            setIsSaving(false);
          }
        },
      },
    ]);
  }

  if (isInitializing || !aviso) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando aviso...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeSettings?.cor_fundo || "#020617" }]}
      contentContainerStyle={styles.content}
    >
      <Card
        title="Editar aviso"
        subtitle={aviso?.titulo}
        footer={<StatusBadge status={status} />}
      >
        <AppInput label="Titulo" value={titulo} onChangeText={setTitulo} />

        <StatusFilter
          label="Destino"
          value={destino}
          onChange={(v) => setDestino(v as AvisoDestino)}
          options={destinoOptions.map((opt) => ({ value: opt, label: destinoLabel(opt) }))}
        />

        <StatusFilter
          label="Tipo"
          value={tipo}
          onChange={(v) => setTipo(v as AvisoTipo)}
          options={[
            { value: "informativo", label: "Informativo" },
            { value: "urgente", label: "Urgente" },
            { value: "interno", label: "Interno" },
            { value: "espiritual", label: "Espiritual" },
          ]}
        />

        <RichTextEditor
          value={conteudo}
          onChange={setConteudo}
          placeholder="Conteudo do aviso..."
          minHeight={180}
        />

        <View style={styles.actions}>
          <AppButton
            title={isSaving ? "Salvando..." : "Salvar alteracoes"}
            variant="primary"
            onPress={() => handleSave()}
            disabled={isSaving || !canEdit}
          />
          {status === "rascunho" ? (
            <AppButton
              title={isSaving ? "Publicando..." : "Publicar"}
              variant="secondary"
              onPress={() => handleSave("publicado")}
              disabled={isSaving || !canEdit}
            />
          ) : (
            <AppButton
              title={isSaving ? "Atualizando..." : "Salvar como rascunho"}
              variant="secondary"
              onPress={() => handleSave("rascunho")}
              disabled={isSaving || !canEdit}
            />
          )}
          <AppButton
            title={isSaving ? "Excluindo..." : "Excluir aviso"}
            variant="danger"
            onPress={handleDelete}
            disabled={isSaving || !canEdit}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

function destinoLabel(destino: AvisoDestino) {
  switch (destino) {
    case "todos":
      return "Todos";
    case "alunos":
      return "Alunos";
    case "professores":
      return "Professores";
    case "coordenadores":
      return "Coordenadores";
    case "admin":
      return "Administradores";
    default:
      return destino;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12 },
  center: { flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#e5e7eb", marginTop: 12 },
  actions: { gap: 8, marginTop: 12 },
});
