import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Alert, Linking, Modal, Image, Platform, useWindowDimensions, TextInput } from "react-native";
import { Video, ResizeMode, type AVPlaybackStatus } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { getDownloadURL, ref } from "firebase/storage";
import { addSupportMaterial, deleteSupportMaterial, listSupportMaterialsForReference, updateSupportMaterial, uploadSupportFile } from "../../lib/materials";
import { MaterialReferenceType, MaterialType, type SupportMaterial } from "../../types/material";
import { AppButton } from "../ui/AppButton";
import { Card } from "../ui/Card";
import { useTheme } from "../../hooks/useTheme";
import type { UserRole } from "../../types/user";
import { firebaseStorage } from "../../lib/firebase";

type Props = {
  lessonId: string;
  canUpload: boolean;
  currentUserId: string;
  currentUserRole: UserRole | null;
};

export function LessonMaterialsSection({
  lessonId,
  canUpload,
  currentUserId,
  currentUserRole,
}: Props) {
  const { theme, themeSettings } = useTheme();
  // Pegamos as dimensões para calcular o tamanho exato do vídeo
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, windowWidth, windowHeight), [theme, windowWidth, windowHeight]);
  const isWeb = Platform.OS === "web";
  
  const videoRef = useRef<Video | null>(null);
  const [materials, setMaterials] = useState<SupportMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Estados do Preview
  const [preview, setPreview] = useState<SupportMaterial | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<MaterialType | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewBuffering, setPreviewBuffering] = useState(false);
  const [previewProgress, setPreviewProgress] = useState<number | null>(null);
  
  // Estado de erro do vídeo
  const [videoError, setVideoError] = useState(false);

  // Cache de URLs reproduzíveis (convertido ou fallback) por material
  const [playableCache, setPlayableCache] = useState<
    Record<
      string,
      {
        url: string | null;
        processing: boolean;
        convertedUrl?: string | null;
        originalUrl?: string | null;
      }
    >
  >({});

  const [editing, setEditing] = useState<SupportMaterial | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState<string | null>(null);

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
      setUploadProgress(0);
      const cleanName = name.replace(/\s+/g, "_");
      const { caminho_storage, mime_type, tamanho_bytes, downloadURL } = await uploadSupportFile({
        tipo_referencia: MaterialReferenceType.AULA,
        referencia_id: lessonId,
        fileUri: uri,
        fileName: `${Date.now()}-${cleanName}`,
        mimeType,
        onProgress: (p) => setUploadProgress(Math.round(p * 100)),
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
      setUploadProgress(null);
    }
  }

  function getMaterialUrl(mat: SupportMaterial): string | undefined {
    const data: any = mat as any;
    if (typeof data.url_externa === "string") return data.url_externa;
    if (typeof data.caminho_storage === "string") return data.caminho_storage;
    return undefined;
  }

  function buildConvertedPath(storagePath: string): string {
    const lastSlash = storagePath.lastIndexOf("/");
    const lastDot = storagePath.lastIndexOf(".");
    const hasExtension = lastDot > lastSlash;
    if (hasExtension) {
      return `${storagePath.slice(0, lastDot)}_output.mp4`;
    }
    return `${storagePath}_output.mp4`;
  }

  async function resolvePlayableVideo(mat: SupportMaterial): Promise<{
    url: string | null;
    processing: boolean;
    convertedUrl?: string | null;
    originalUrl?: string | null;
  }> {
    const cached = playableCache[mat.id];
    if (cached) return cached;

    const data: any = mat as any;
    const storagePath = typeof data.caminho_storage === "string" ? data.caminho_storage : null;
    const externalUrl = typeof data.url_externa === "string" ? data.url_externa : null;

    if (!storagePath) {
      const result = { url: externalUrl ?? null, processing: !!externalUrl, convertedUrl: null, originalUrl: externalUrl ?? null };
      console.log("[Video][Resolve] Sem storagePath", { id: mat.id, externalUrl });
      setPlayableCache((prev) => ({ ...prev, [mat.id]: result }));
      return result;
    }

    const convertedPath = buildConvertedPath(storagePath);

    try {
      const convertedUrl = await getDownloadURL(ref(firebaseStorage, convertedPath));
      // busca original também para fallback se o convertido der 404 em runtime
      let originalUrl: string | null = null;
      try {
        originalUrl = await getDownloadURL(ref(firebaseStorage, storagePath));
      } catch (e) {
        originalUrl = null;
      }

      const result = { url: convertedUrl, processing: false, convertedUrl, originalUrl };
      console.log("[Video][Resolve] Convertido OK", { id: mat.id, convertedPath, url: convertedUrl });
      setPlayableCache((prev) => ({ ...prev, [mat.id]: result }));
      return result;
    } catch (err) {
      console.log("[Video][Resolve] Convertido não encontrado", { id: mat.id, convertedPath, err });
      // Converted não existe ou sem permissão; tenta original e marca como processando
      try {
        const originalUrl = await getDownloadURL(ref(firebaseStorage, storagePath));
        const result = { url: originalUrl, processing: true, convertedUrl: null, originalUrl };
        console.log("[Video][Resolve] Usando original fallback", { id: mat.id, storagePath, url: originalUrl });
        setPlayableCache((prev) => ({ ...prev, [mat.id]: result }));
        return result;
      } catch (err2) {
        const fallback = { url: externalUrl ?? null, processing: true, convertedUrl: null, originalUrl: externalUrl ?? null };
        console.log("[Video][Resolve] Nenhuma URL disponível", { id: mat.id, storagePath, externalUrl, err2 });
        setPlayableCache((prev) => ({ ...prev, [mat.id]: fallback }));
        return fallback;
      }
    }
  }

  async function openPreview(mat: SupportMaterial, url?: string) {
    const isImage = mat.tipo_material === MaterialType.IMAGEM;
    const isVideo = mat.tipo_material === MaterialType.VIDEO;

    if (isImage && url) {
      setPreview(mat);
      setPreviewUrl(url);
      setPreviewType(MaterialType.IMAGEM);
      setPreviewLoading(true);
      setPreviewBuffering(false);
      setPreviewProgress(0);
      setVideoError(false);
      return;
    }

    if (isVideo) {
      setPreview(mat);
      setPreviewType(MaterialType.VIDEO);
      setPreviewLoading(true);
      setPreviewBuffering(false);
      setPreviewProgress(0);
      setVideoError(false);

      const resolved = await resolvePlayableVideo(mat);
      if (resolved.url) {
        setPreviewUrl(resolved.url);
      } else {
        Alert.alert("Processando", "O vídeo ainda está sendo convertido. Tente novamente em instantes.");
        setPreview(null);
        setPreviewUrl(null);
        setPreviewType(null);
      }
      return;
    }

    openUrl(url);
  }

  function canManageMaterial(mat: SupportMaterial): boolean {
    if (currentUserRole === "administrador" || currentUserRole === "coordenador") return true;
    if (currentUserRole === "professor" && mat.enviado_por_id === currentUserId) return true;
    return false;
  }

  async function confirmDelete(mat: SupportMaterial) {
    if (Platform.OS === "web") {
      const ok = window.confirm("Deseja realmente excluir este material?");
      if (!ok) return;
      try {
        await deleteSupportMaterial(mat.id);
        await loadMaterials();
      } catch (err: any) {
        console.error("Erro ao excluir material", err);
        Alert.alert("Erro", err?.message || "Não foi possível excluir.");
      }
      return;
    }

    Alert.alert(
      "Excluir material",
      "Deseja realmente excluir este material?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSupportMaterial(mat.id);
              await loadMaterials();
            } catch (err: any) {
              console.error("Erro ao excluir material", err);
              Alert.alert("Erro", err?.message || "Não foi possível excluir.");
            }
          },
        },
      ]
    );
  }

  function startEdit(mat: SupportMaterial) {
    setEditing(mat);
    setEditName(mat.nome || "");
    const desc = typeof mat.descricao === "string" ? mat.descricao : null;
    setEditDescription(desc);
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await updateSupportMaterial({
        materialId: editing.id,
        nome: editName.trim() || editing.nome,
        descricao: editDescription ?? null,
      });
      setEditing(null);
      setEditName("");
      setEditDescription(null);
      await loadMaterials();
    } catch (err: any) {
      console.error("Erro ao editar material", err);
      Alert.alert("Erro", err?.message || "Não foi possível salvar a edição.");
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

            const url = getMaterialUrl(mat);

            const icon = iconByType[data.tipo_material as MaterialType] || "📁";
            const isImage = data.tipo_material === MaterialType.IMAGEM;
            const isVideo = data.tipo_material === MaterialType.VIDEO;
            const cachedPlayable = playableCache[mat.id];

            return (
              <Pressable
                key={mat.id}
                style={styles.materialItem}
                onPress={() => {
                  if ((isImage || isVideo) && url) {
                    openPreview(mat, url);
                  } else {
                    openUrl(url);
                  }
                }}
              >
                <Text style={styles.materialIcon}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.materialName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.helperSmall}>
                    Enviado por: {displaySender} • {displayMime}
                  </Text>
                  {isVideo && cachedPlayable?.processing ? (
                    <Text style={styles.helperSmall}>Processando conversão...</Text>
                  ) : null}
                  {typeof data.descricao === "string" && data.descricao.trim().length > 0 ? (
                    <Text style={styles.helperSmall}>Nota: {data.descricao}</Text>
                  ) : null}
                </View>
                {canManageMaterial(mat) ? (
                  <View style={styles.actionsInline}>
                    <AppButton
                      title="Editar"
                      variant="secondary"
                      onPress={() => startEdit(mat)}
                      style={styles.inlineButton}
                      fullWidth={false}
                      stopPropagation
                    />
                    <AppButton
                      title="Excluir"
                      variant="danger"
                      onPress={() => confirmDelete(mat)}
                      style={styles.inlineButton}
                      fullWidth={false}
                      stopPropagation
                    />
                  </View>
                ) : null}
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
          {uploading && (
            <View style={styles.uploadStatus}>
              <ActivityIndicator color={theme.colors.text} style={{ marginRight: 6 }} />
              <Text style={styles.uploadStatusText}>
                Carregando {uploadProgress !== null ? `${uploadProgress}%` : "..."}
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {/* --- MODAL DO PREVIEW --- */}
      <Modal
        visible={!!preview}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPreview(null);
          setPreviewUrl(null);
          setPreviewType(null);
          setVideoError(false);
        }}
        supportedOrientations={['portrait', 'landscape']} // Importante para vídeos
      >
        <View style={styles.previewContainer}>
          <Pressable 
            style={styles.previewBackdrop} 
            onPress={() => {
              setPreview(null);
              setVideoError(false);
            }} 
          />
          <View style={styles.previewCard}>
            
            {/* IMAGEM */}
            {previewType === MaterialType.IMAGEM && previewUrl ? (
              <View style={styles.previewMediaContainer}>
                {(previewLoading) && (
                   <View style={styles.previewStatus} pointerEvents="none">
                     <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                     <Text style={styles.previewStatusText}>Carregando...</Text>
                   </View>
                )}
                <Image
                  source={{ uri: previewUrl }}
                  style={styles.previewImage}
                  resizeMode="contain"
                  onLoadStart={() => setPreviewLoading(true)}
                  onLoad={() => setPreviewLoading(false)}
                  onError={() => {
                    setPreviewLoading(false);
                    Alert.alert("Erro", "Não foi possível carregar a imagem.");
                  }}
                />
              </View>
            ) : null}

            {/* VÍDEO */}
            {previewType === MaterialType.VIDEO && previewUrl ? (
              <View style={styles.previewMediaContainer}>
                
                {/* Loader (Aparece se estiver carregando ou em buffering, e SEM erro) */}
                {(previewLoading || previewBuffering) && !videoError && (
                  <View style={styles.previewStatus} pointerEvents="none">
                    <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                    <Text style={styles.previewStatusText}>
                      {previewProgress !== null && previewProgress > 0 ? `${previewProgress}%` : "Carregando..."}
                    </Text>
                  </View>
                )}
                
                 {/* O componente de Video é renderizado sempre, a menos que videoError seja true.
                   Deixamos shouldPlay desligado para evitar bloqueio de autoplay no Web/iOS. */}
                {!videoError && (
                  isWeb ? (
                    <video
                      src={previewUrl}
                      controls
                      playsInline
                      style={styles.previewVideo as any}
                      onLoadedData={() => {
                        setPreviewLoading(false);
                        setPreviewBuffering(false);
                        setVideoError(false);
                        setPreviewProgress(0);
                      }}
                      onTimeUpdate={(ev) => {
                        const el = ev.currentTarget;
                        const duration = el.duration || 0;
                        if (duration > 0) {
                          const percent = Math.min(100, Math.max(0, Math.round((el.currentTime / duration) * 100)));
                          setPreviewProgress(percent);
                        }
                      }}
                      onWaiting={() => setPreviewBuffering(true)}
                      onPlaying={() => setPreviewBuffering(false)}
                      onError={(error) => {
                        console.log("Erro Fatal Video Web:", error);
                        // Fallback para original se o convertido 404
                        const currentUrl = previewUrl || "";
                        const cache = playableCache[preview?.id || ""];
                        const isConvertedUrl = currentUrl.includes("_output.mp4");
                        if (isConvertedUrl && cache?.originalUrl && cache.originalUrl !== currentUrl) {
                          console.log("[Video][Web] Fallback para original após erro");
                          setPreviewUrl(cache.originalUrl);
                          setVideoError(false);
                          setPreviewLoading(false);
                          return;
                        }
                        setPreviewLoading(false);
                        setVideoError(true);
                      }}
                    />
                  ) : (
                    <Video
                      ref={videoRef}
                      source={{ uri: previewUrl }}
                      style={styles.previewVideo} // Estilo unificado
                      useNativeControls
                      resizeMode={ResizeMode.CONTAIN}
                     shouldPlay={false}
                      isMuted={false}
                      isLooping={false}
                      onLoadStart={() => {
                        setPreviewLoading(true);
                        setVideoError(false);
                      }}
                      onLoad={(status) => {
                        setPreviewLoading(false);
                        setPreviewBuffering(false);
                        if ((status as any)?.durationMillis) {
                          setPreviewProgress(0);
                        }
                      }}
                      onReadyForDisplay={() => {
                        setPreviewLoading(false);
                        setPreviewBuffering(false);
                        setVideoError(false);
                      }}
                      onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                        if (!status.isLoaded) {
                            if (status.error) {
                                console.log("Erro no Status Update:", status.error);
                                setVideoError(true);
                            }
                            return;
                        }
                        
                        setPreviewBuffering(status.isBuffering);
                        
                        if (status.durationMillis) {
                          const buffered = (status as any).playableDurationMillis || 0;
                          const percent = Math.min(100, Math.max(0, Math.round((buffered / status.durationMillis) * 100)));
                          setPreviewProgress(percent);
                        }
                      }}
                      onError={(error) => {
                        console.log("Erro Fatal Video:", error);
                        setPreviewLoading(false);
                        setVideoError(true);
                      }}
                    />
                  )
                )}

                {/* Fallback apenas se houver ERRO explícito */}
                {videoError && (
                  <View style={styles.previewFallback}>
                    <Text style={styles.previewFallbackText}>
                      Não foi possível reproduzir o vídeo.
                    </Text>
                    <AppButton
                      title="Abrir externamente"
                      variant="secondary"
                      onPress={() => openUrl(previewUrl)}
                      style={{ marginTop: 12 }}
                    />
                  </View>
                )}
              </View>
            ) : null}

            <AppButton
              title="Fechar"
              variant="secondary"
              onPress={() => {
                setPreview(null);
                setPreviewUrl(null);
                setPreviewType(null);
                setVideoError(false);
              }}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!editing}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.editContainer}>
          <View style={styles.editCard}>
            <Text style={styles.materialName}>Editar material</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Nome do material"
              style={styles.input}
              placeholderTextColor="#999"
            />
            <TextInput
              value={editDescription ?? ""}
              onChangeText={(text) => setEditDescription(text)}
              placeholder="Descrição (opcional)"
              style={[styles.input, styles.inputMultiline]}
              placeholderTextColor="#999"
              multiline
            />
            <View style={styles.editActions}>
              <AppButton
                title="Cancelar"
                variant="secondary"
                onPress={() => setEditing(null)}
                fullWidth={false}
                style={styles.editActionButton}
              />
              <AppButton
                title="Salvar"
                variant="primary"
                onPress={saveEdit}
                fullWidth={false}
                style={styles.editActionButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Card>
  );
}

function createStyles(theme: any, windowWidth: number, windowHeight: number) {
  // Ajustes de Tamanho Responsivo
  const cardWidth = Math.min(windowWidth - 32, 800);
  
  // Cálculo exato para manter 16:9 sem depender do Flex
  const videoWidth = cardWidth - 24; // descontando padding do card
  const videoHeight = videoWidth * (9 / 16); 
  const maxVideoHeight = windowHeight * 0.6; // Limite de altura da tela
  
  // Usamos o menor entre o cálculo 16:9 e o limite da tela
  const finalVideoHeight = Math.min(videoHeight, maxVideoHeight);

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
      flex: 1, // Garante que o texto ocupe o espaço mas quebre se precisar
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
    actionsInline: {
      flexDirection: "row",
      gap: 6,
      marginLeft: 8,
    },
    inlineButton: {
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    previewBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.85)", // Fundo mais escuro para foco
    },
    previewContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    previewCard: {
      width: cardWidth,
      maxWidth: 800,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border || "#333",
      alignItems: "center",
      // Removemos maxHeight fixo para deixar o conteudo ditar, respeitando limites de tela
    },
    previewMediaContainer: {
      width: "100%",
      height: finalVideoHeight, // ALTURA FIXA CALCULADA
      backgroundColor: "#000",
      borderRadius: 8,
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    previewImage: {
      width: "100%",
      height: "100%",
    },
    // Estilo ÚNICO para Web e Mobile
    previewVideo: {
      width: "100%",
      height: "100%",
      backgroundColor: "#000", // Fundo preto garante visibilidade
      // Na web, position absolute as vezes buga dentro de flex.
      // Com width/height 100% e pai com tamanho fixo, funciona melhor.
    },
    previewFallback: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#000",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
      zIndex: 20,
    },
    previewFallbackText: {
      color: "#fff",
      textAlign: "center",
      fontWeight: "700",
    },
    previewStatus: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 40,
      zIndex: 10, // Garante que fique acima
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    previewStatusText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 12,
    },
    editContainer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.65)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    editCard: {
      width: "100%",
      maxWidth: 480,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border || "#333",
      gap: 10,
    },
    input: {
      width: "100%",
      borderWidth: 1,
      borderColor: theme.colors.border || "#333",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.colors.text,
      backgroundColor: theme.colors.card,
    },
    inputMultiline: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    editActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
    },
    editActionButton: {
      flex: 1,
    },
    uploadStatus: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: "rgba(0,0,0,0.35)",
      alignSelf: "flex-start",
    },
    uploadStatusText: {
      color: theme.colors.text,
      fontWeight: "700",
    },
  });
}