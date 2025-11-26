// components/ManageSupportMaterialsSection.tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";

import {
  addSupportMaterial,
  listSupportMaterialsForReference,
  updateSupportMaterial,
  deleteSupportMaterial,
  uploadSupportFile,
} from "../lib/materials";
import type {
  MaterialReferenceType,
  MaterialType,
  SupportMaterial,
} from "../types/material";

interface ManageSupportMaterialsSectionProps {
  tipoReferencia: MaterialReferenceType;
  referenciaId: string;
  canEdit: boolean;
  uploaderId: string;
}

export function ManageSupportMaterialsSection({
  tipoReferencia,
  referenciaId,
  canEdit,
  uploaderId,
}: ManageSupportMaterialsSectionProps) {
  const [materials, setMaterials] = useState<SupportMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const list = await listSupportMaterialsForReference(tipoReferencia, referenciaId);
        setMaterials(list);
      } catch (error) {
        console.error("Erro ao carregar materiais:", error);
        Alert.alert("Erro", "Não foi possível carregar os materiais de apoio.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [tipoReferencia, referenciaId]);

  async function handlePickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });

      if (result.type !== "success") return;

      setIsUploading(true);
      setUploadProgress(0);

      const fileUri = result.uri;
      const fileName = result.name;
      const mimeType = result.mimeType || "application/octet-stream";

      const uploadResult = await uploadSupportFile({
        tipo_referencia: tipoReferencia,
        referencia_id: referenciaId,
        fileUri,
        fileName,
        mimeType,
        onProgress: (p) => setUploadProgress(p),
      });

      await addSupportMaterial({
        tipo_referencia: tipoReferencia,
        referencia_id: referenciaId,
        tipo_material: guessMaterialType(mimeType),
        nome: fileName,
        descricao: null,
        caminho_storage: uploadResult.caminho_storage,
        url_externa: uploadResult.downloadURL,
        tamanho_bytes: uploadResult.tamanho_bytes ?? null,
        mime_type: uploadResult.mime_type,
        enviado_por_id: uploaderId,
      });

      const list = await listSupportMaterialsForReference(tipoReferencia, referenciaId);
      setMaterials(list);
      Alert.alert("Sucesso", "Arquivo enviado com sucesso.");
    } catch (error: any) {
      console.error("Erro ao enviar arquivo:", error);
      Alert.alert("Erro", error?.message || "Falha ao enviar arquivo.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleAddLink() {
    if (!newUrl.trim()) {
      Alert.alert("Erro", "Informe a URL do link externo.");
      return;
    }
    try {
      await addSupportMaterial({
        tipo_referencia: tipoReferencia,
        referencia_id: referenciaId,
        tipo_material: "link",
        nome: newName.trim() || newUrl,
        descricao: newDescription.trim() || null,
        caminho_storage: null,
        url_externa: newUrl.trim(),
        tamanho_bytes: null,
        mime_type: null,
        enviado_por_id: uploaderId,
      });
      setNewName("");
      setNewDescription("");
      setNewUrl("");
      const list = await listSupportMaterialsForReference(tipoReferencia, referenciaId);
      setMaterials(list);
      Alert.alert("Sucesso", "Link adicionado.");
    } catch (error: any) {
      console.error("Erro ao adicionar link:", error);
      Alert.alert("Erro", error?.message || "Falha ao adicionar link.");
    }
  }

  async function handleUpdate(materialId: string, updates: Partial<SupportMaterial>) {
    try {
      await updateSupportMaterial({
        materialId,
        nome: updates.nome,
        descricao: updates.descricao ?? null,
        ordem_exibicao: updates.ordem_exibicao ?? null,
      });
      const list = await listSupportMaterialsForReference(tipoReferencia, referenciaId);
      setMaterials(list);
    } catch (error: any) {
      console.error("Erro ao atualizar material:", error);
      Alert.alert("Erro", error?.message || "Falha ao atualizar material.");
    }
  }

  async function handleDelete(materialId: string) {
    Alert.alert("Confirmar", "Deseja deletar este material?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSupportMaterial(materialId);
            const list = await listSupportMaterialsForReference(tipoReferencia, referenciaId);
            setMaterials(list);
          } catch (error: any) {
            console.error("Erro ao deletar material:", error);
            Alert.alert("Erro", error?.message || "Falha ao deletar material.");
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Materiais de apoio</Text>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#facc15" />
          <Text style={styles.loadingText}>Carregando materiais...</Text>
        </View>
      ) : materials.length === 0 ? (
        <Text style={styles.emptyText}>Nenhum material cadastrado.</Text>
      ) : (
        <ScrollView style={{ maxHeight: 220 }}>
          {materials.map((m) => (
            <View key={m.id} style={styles.card}>
              <Text style={styles.cardTitle}>{m.nome}</Text>
              {m.descricao ? <Text style={styles.cardDesc}>{m.descricao}</Text> : null}
              <Text style={styles.cardLine}>Tipo: {m.tipo_material}</Text>
              {m.url_externa ? (
                <Text style={styles.cardLine}>Link: {m.url_externa}</Text>
              ) : null}
              {m.caminho_storage ? (
                <Text style={styles.cardLine}>Storage: {m.caminho_storage}</Text>
              ) : null}
              {canEdit && (
                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={() =>
                      handleUpdate(m.id, { nome: m.nome, descricao: m.descricao ?? "" })
                    }
                  >
                    <Text style={styles.buttonSecondaryText}>Atualizar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.button, styles.buttonDanger]}
                    onPress={() => handleDelete(m.id)}
                  >
                    <Text style={styles.buttonDangerText}>Deletar</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {canEdit && (
        <>
          <View style={styles.section}>
            <Text style={styles.subtitle}>Adicionar link externo</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome (opcional)"
              placeholderTextColor="#6b7280"
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={styles.input}
              placeholder="Descrição (opcional)"
              placeholderTextColor="#6b7280"
              value={newDescription}
              onChangeText={setNewDescription}
            />
            <TextInput
              style={styles.input}
              placeholder="URL (ex.: https://youtube.com/...)"
              placeholderTextColor="#6b7280"
              value={newUrl}
              onChangeText={setNewUrl}
              autoCapitalize="none"
            />
            <Pressable style={[styles.button, styles.buttonPrimary]} onPress={handleAddLink}>
              <Text style={styles.buttonPrimaryText}>Adicionar link</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.subtitle}>Enviar arquivo</Text>
            <Pressable
              style={[styles.button, styles.buttonPrimary, isUploading && styles.disabled]}
              onPress={handlePickFile}
              disabled={isUploading}
            >
              <Text style={styles.buttonPrimaryText}>
                {isUploading ? `Enviando... ${Math.round(uploadProgress * 100)}%` : "Escolher arquivo"}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function guessMaterialType(mime: string): MaterialType {
  if (mime.startsWith("image/")) return "imagem";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.includes("presentation")) return "apresentacao";
  if (mime.includes("msword") || mime.includes("officedocument")) return "documento";
  return "outro";
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#0b1224",
    marginTop: 12,
  },
  title: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#e5e7eb",
    fontSize: 14,
    marginBottom: 6,
  },
  center: { alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#e5e7eb", marginTop: 8 },
  emptyText: { color: "#9ca3af", fontSize: 13 },
  card: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#020617",
  },
  cardTitle: { color: "#e5e7eb", fontWeight: "700", fontSize: 14 },
  cardDesc: { color: "#cbd5e1", fontSize: 13, marginBottom: 4 },
  cardLine: { color: "#94a3b8", fontSize: 12 },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  button: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  buttonPrimary: { backgroundColor: "#22c55e" },
  buttonPrimaryText: { color: "#022c22", fontWeight: "700" },
  buttonSecondary: { backgroundColor: "#111827", borderWidth: 1, borderColor: "#475569" },
  buttonSecondaryText: { color: "#e5e7eb", fontWeight: "600" },
  buttonDanger: { backgroundColor: "#b91c1c" },
  buttonDangerText: { color: "#fee2e2", fontWeight: "700" },
  disabled: { opacity: 0.7 },
  section: { marginTop: 12, gap: 8 },
  input: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#e5e7eb",
  },
});
