import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Alert, Linking } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  addSupportMaterial,
  listSupportMaterialsForReference,
  uploadSupportFile,
} from "../../lib/materials";
import {
  MaterialReferenceType,
  MaterialType,
  type SupportMaterial,
} from "../../types/material";
import { AppButton } from "../ui/AppButton";
import { Card } from "../ui/Card";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  lessonId: string;
  canUpload: boolean;
  currentUserId: string;
};

export function LessonMaterialsSection({
  lessonId,
  canUpload,
  currentUserId,
}: Props) {
  const { theme, themeSettings } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [materials, setMaterials] = useState<SupportMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    void loadMaterials();
  }, [lessonId]);

  async function loadMaterials() {
    try {
      setLoading(true);
      const list = await listSupportMaterialsForReference(
        MaterialReferenceType.AULA,
        lessonId
      );
      setMaterials(list);
    } catch (err) {
      console.error("Erro ao carregar materiais:", err);
    } finally {
      setLoading(false);
    }
  }

  function inferMaterialType(mime: string, fileName: string): MaterialType {
    const lowerMime = mime.toLowerCase();
    const lowerName = fileName.toLowerCase();
    if (lowerMime.includes("pdf") || lowerName.endsWith(".pdf")) return MaterialType.PDF;
    if (lowerMime.startsWith("image/")) return MaterialType.IMAGEM;
    if (lowerMime.startsWith("video/") || lowerName.endsWith(".mp4") || lowerName.endsWith(".mov")) {
      return MaterialType.VIDEO;
    }
    return MaterialType.OUTRO;
  }

  async function handleUploadFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      await uploadAndSave(asset.uri, asset.name || "arquivo", asset.mimeType || "application/octet-stream");
    } catch (err) {
      console.error("Erro ao selecionar arquivo:", err);
      Alert.alert("Erro", "Não foi possível selecionar o arquivo.");
    }
  }

  async function handleUploadImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.9,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      const fileName = asset.fileName || "imagem.jpg";
      await uploadAndSave(asset.uri, fileName, asset.mimeType || "image/jpeg");
    } catch (err) {
      console.error("Erro ao selecionar imagem:", err);
      Alert.alert("Erro", "Não foi possível selecionar a imagem.");
    }
  }

  async function uploadAndSave(uri: string, name: string, mimeType: string) {
    try {
      setUploading(true);
      const cleanName = name.replace(/\s+/g, "_");
      const { caminho_storage, mime_type, tamanho_bytes, downloadURL } = await uploadSupportFile({
        tipo_referencia: MaterialReferenceType.AULA,
        referencia_id: lessonId,
        fileUri: uri,
        fileName: `${Date.now()}-${cleanName}`,
        mimeType,
      });

      const tipo_material = inferMaterialType(mime_type, cleanName);

      await addSupportMaterial({
        tipo_referencia: MaterialReferenceType.AULA,
        referencia_id: lessonId,
        tipo_material,
        nome: cleanName,
        descricao: null as any,
        caminho_storage,
        url_externa: downloadURL,
        tamanho_bytes,
        mime_type,
        enviado_por_id: currentUserId,
      });

      Alert.alert("Sucesso", "Material enviado com sucesso.");
      await loadMaterials();
    } catch (err: any) {
      console.error("Erro ao enviar material:", err);
      Alert.alert("Erro", err?.message || "Não foi possível enviar o material.");
    } finally {
      setUploading(false);
    }
  }

  function openUrl(url?: string | null) {
    if (!url) return;
    const safeUrl = typeof url === "string" ? url : "";
    if (!safeUrl) return;
    Linking.openURL(safeUrl).catch((err) => {
      console.error("Erro ao abrir link:", err);
      Alert.alert("Erro", "Não foi possível abrir o material.");
    });
  }

  const iconByType: Record<MaterialType, string> = useMemo(
    () => ({
      [MaterialType.PDF]: "📄",
      [MaterialType.VIDEO]: "🎬",
      [MaterialType.IMAGEM]: "🖼️",
      [MaterialType.APRESENTACAO]: "📊",
      [MaterialType.DOCUMENTO]: "📃",
      [MaterialType.LINK]: "🔗",
      [MaterialType.OUTRO]: "📁",
    }),
    []
  );

  return (
    <Card title="Materiais da aula">
      {loading ? (
        <ActivityIndicator color={themeSettings?.cor_info || "#facc15"} />
      ) : materials.length === 0 ? (
        <Text style={styles.helper}>Nenhum material enviado ainda.</Text>
      ) : (
        <View style={styles.list}>
          {materials.map((mat) => {
            const data: any = mat as any;
            const displayName =
              typeof data.nome === "string" ? data.nome : JSON.stringify(data.nome ?? "");
            const displayMime =
              typeof data.mime_type === "string"
                ? data.mime_type
                : typeof data.tipo_material === "string"
                ? data.tipo_material
                : "";
            const displaySender =
              typeof data.enviado_por_id === "string"
                ? data.enviado_por_id
                : JSON.stringify(data.enviado_por_id ?? "Desconhecido");

            const url =
              typeof data.url_externa === "string"
                ? data.url_externa
                : typeof data.caminho_storage === "string"
                ? data.caminho_storage
                : undefined;

            const icon = iconByType[data.tipo_material as MaterialType] || "📁";

            return (
              <Pressable key={mat.id} style={styles.materialItem} onPress={() => openUrl(url)}>
                <Text style={styles.materialIcon}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.materialName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.helperSmall}>
                    Enviado por: {displaySender} • {displayMime}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {canUpload ? (
        <View style={styles.actionsRow}>
          <AppButton
            title={uploading ? "Enviando..." : "Enviar arquivo (PDF / vídeo / outros)"}
            variant="secondary"
            onPress={handleUploadFile}
            disabled={uploading}
          />
          <AppButton
            title={uploading ? "Enviando..." : "Enviar imagem"}
            variant="primary"
            onPress={handleUploadImage}
            disabled={uploading}
          />
        </View>
      ) : null}
    </Card>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    list: {
      gap: 8,
      marginTop: 8,
    },
    materialItem: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border || theme.colors.card,
      borderRadius: 12,
      backgroundColor: theme.colors.card,
    },
    materialIcon: {
      fontSize: 18,
    },
    materialName: {
      color: theme.colors.text,
      fontWeight: "700",
    },
    helper: {
      color: theme.colors.muted || theme.colors.text,
    },
    helperSmall: {
      color: theme.colors.muted || theme.colors.text,
      fontSize: 12,
    },
    actionsRow: {
      gap: 8,
      marginTop: 12,
    },
  });
}
