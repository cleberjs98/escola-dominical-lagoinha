import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import { firebaseStorage } from "../../../lib/firebase";
import {
  buildThemeFromPalette,
  defaultThemeSettings,
  getThemeSettings,
  normalizeThemeSettings,
  saveThemeSettings,
} from "../../../lib/themeSettings";
import { extractPaletteFromImage } from "../../../lib/imagePalette";
import type { ThemeMode, ThemeSettings } from "../../../types/theme";

type BackgroundChoice = "none" | "color" | "image";

const themePresets: { key: ThemeMode; label: string; colors: Partial<ThemeSettings> }[] = [
  {
    key: "dark",
    label: "Tema Escuro",
    colors: {
      primaryColor: "#22c55e",
      secondaryColor: "#1f2937",
      backgroundColor: "#020617",
      cardBackgroundColor: "#0b1224",
      textColor: "#e5e7eb",
      accentColor: "#22c55e",
    },
  },
  {
    key: "light",
    label: "Tema Claro",
    colors: {
      primaryColor: "#2563eb",
      secondaryColor: "#e5e7eb",
      backgroundColor: "#f8fafc",
      cardBackgroundColor: "#e5e7eb",
      textColor: "#0f172a",
      accentColor: "#2563eb",
    },
  },
  {
    key: "blue",
    label: "Tema Azul Suave",
    colors: {
      primaryColor: "#38bdf8",
      secondaryColor: "#0f172a",
      backgroundColor: "#0b1224",
      cardBackgroundColor: "#0f172a",
      textColor: "#e0f2fe",
      accentColor: "#38bdf8",
    },
  },
  {
    key: "green",
    label: "Tema Verde Esperança",
    colors: {
      primaryColor: "#10b981",
      secondaryColor: "#064e3b",
      backgroundColor: "#022c22",
      cardBackgroundColor: "#064e3b",
      textColor: "#ecfdf3",
      accentColor: "#10b981",
    },
  },
];

export default function AdminLayoutScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { reloadTheme, isThemeLoading } = useTheme();
  const [localSettings, setLocalSettings] = useState<ThemeSettings>(defaultThemeSettings);
  const [backgroundChoice, setBackgroundChoice] = useState<BackgroundChoice>("none");
  const [bgColor, setBgColor] = useState(defaultThemeSettings.backgroundSolidColor || "#020617");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isAdmin = useMemo(
    () => user?.papel === "administrador" || user?.papel === "admin",
    [user?.papel]
  );

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (!isAdmin) {
      Alert.alert("Sem permissão", "Apenas administradores podem acessar esta tela.");
      router.replace("/" as any);
      return;
    }
  }, [firebaseUser, isInitializing, isAdmin, router]);

  useEffect(() => {
    // carrega tema atual do contexto quando disponível
    // reloadTheme já roda ao montar a aplicação, então esperamos o isThemeLoading finalizar
    if (!isThemeLoading && user) {
      void loadExistingTheme();
    }
  }, [isThemeLoading, user]);

  async function loadExistingTheme() {
    try {
      const settings = await getThemeSettings();
      if (settings) {
        const normalized = normalizeThemeSettings(settings);
        setLocalSettings(normalized);
        setBackgroundChoice(
          normalized.backgroundType === "image"
            ? "image"
            : normalized.backgroundType === "color"
              ? "color"
              : "none"
        );
        setBgColor(normalized.backgroundSolidColor || "#020617");
      }
    } catch (err) {
      console.warn("[AdminLayout] Não foi possível carregar tema atual", err);
    }
  }

  const selectedPresetKey = useMemo(() => {
    const preset = themePresets.find((p) =>
      p.colors.primaryColor === localSettings.primaryColor &&
      p.colors.backgroundColor === localSettings.backgroundColor
    );
    return preset?.key || localSettings.mode || "custom";
  }, [localSettings]);

  function applyPreset(key: ThemeMode) {
    const preset = themePresets.find((p) => p.key === key);
    if (!preset) return;
    setLocalSettings((prev) => ({
      ...prev,
      ...preset.colors,
      mode: key,
    }));
  }

  function updateColor(field: keyof Pick<ThemeSettings, "primaryColor" | "secondaryColor" | "backgroundColor" | "cardBackgroundColor" | "textColor" | "accentColor">, value: string) {
    setLocalSettings((prev) => ({
      ...prev,
      [field]: value,
      mode: prev.mode === "auto-image" ? "custom" : prev.mode,
    }));
  }

  function updateBackgroundType(choice: BackgroundChoice) {
    setBackgroundChoice(choice);
    setLocalSettings((prev) => ({
      ...prev,
      backgroundType: choice === "none" ? "none" : choice,
      backgroundEnabled: choice !== "none",
      backgroundSolidColor: choice === "color" ? bgColor : prev.backgroundSolidColor,
    }));
  }

  async function handleUploadBackground() {
    try {
      setIsUploading(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permissão negada", "Precisamos de acesso à galeria para enviar a imagem.");
        setIsUploading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled) {
        setIsUploading(false);
        return;
      }

      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const ext = (asset.fileName?.split(".").pop() || asset.uri.split(".").pop() || "jpg").toLowerCase();
      const storageRef = ref(firebaseStorage, `backgrounds/global/${Date.now()}.${ext}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      // tenta gerar tema automático
      const palette = await extractPaletteFromImage(url);
      setLocalSettings((prev) => {
        const next = palette ? buildThemeFromPalette(palette, prev) : prev;
        return {
          ...next,
          backgroundType: "image",
          backgroundEnabled: true,
          backgroundImageUrl: url,
          mode: palette ? "auto-image" : (next.mode || "custom"),
        };
      });
      setBackgroundChoice("image");
      Alert.alert("Imagem carregada", "Fundo definido. Salve para aplicar para todos.");
    } catch (err) {
      console.error("[AdminLayout] Erro ao fazer upload do fundo", err);
      Alert.alert("Erro", "Não foi possível enviar a imagem. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSave() {
    if (!firebaseUser || !isAdmin) return;
    try {
      setIsSaving(true);
      const payload: ThemeSettings = {
        ...localSettings,
        mode: localSettings.mode || selectedPresetKey || "custom",
        backgroundType: backgroundChoice === "none" ? "none" : localSettings.backgroundType,
        backgroundEnabled: backgroundChoice !== "none",
        backgroundSolidColor: backgroundChoice === "color" ? bgColor : localSettings.backgroundSolidColor,
      };

      await saveThemeSettings(payload, firebaseUser.uid);
      await reloadTheme();
      Alert.alert("Sucesso", "Configurações salvas e aplicadas.");
    } catch (err) {
      console.error("[AdminLayout] Erro ao salvar tema", err);
      Alert.alert("Erro", "Não foi possível salvar as configurações.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setLocalSettings(defaultThemeSettings);
    setBackgroundChoice("none");
    setBgColor(defaultThemeSettings.backgroundSolidColor || "#020617");
  }

  const bg = "#020617";

  if (isInitializing || isThemeLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando configurações...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Configurações de Layout / Tema</Text>
      <Text style={styles.subtitle}>
        Ajuste cores globais e o fundo do app. Apenas administradores podem alterar.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tema de cores</Text>
        <View style={styles.row}>
          {themePresets.map((preset) => {
            const active = selectedPresetKey === preset.key;
            return (
              <Pressable key={preset.key} onPress={() => applyPreset(preset.key)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{preset.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.colorsGrid}>
          {(
            [
              { key: "primaryColor", label: "Primária" },
              { key: "secondaryColor", label: "Secundária" },
              { key: "backgroundColor", label: "Fundo" },
              { key: "cardBackgroundColor", label: "Card" },
              { key: "textColor", label: "Texto" },
              { key: "accentColor", label: "Destaque" },
            ] as const
          ).map((field) => (
            <View key={field.key} style={styles.inputGroup}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                value={(localSettings as any)[field.key] || ""}
                onChangeText={(text) => updateColor(field.key, text)}
                placeholder="#000000"
                placeholderTextColor="#6b7280"
                style={styles.input}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Fundo visual</Text>
        <View style={styles.row}>
          {(["none", "color", "image"] as BackgroundChoice[]).map((option) => {
            const active = backgroundChoice === option;
            return (
              <Pressable key={option} onPress={() => updateBackgroundType(option)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {option === "none" ? "Nenhum" : option === "color" ? "Cor sólida" : "Imagem"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {backgroundChoice === "color" ? (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cor do fundo</Text>
            <TextInput
              value={bgColor}
              onChangeText={(text) => {
                setBgColor(text);
                setLocalSettings((prev) => ({ ...prev, backgroundSolidColor: text }));
              }}
              placeholder="#020617"
              placeholderTextColor="#6b7280"
              style={styles.input}
            />
          </View>
        ) : null}

        {backgroundChoice === "image" ? (
          <View style={{ gap: 8 }}>
            <Pressable style={[styles.button, styles.buttonSecondary]} onPress={() => void handleUploadBackground()} disabled={isUploading}>
              <Text style={styles.buttonSecondaryText}>{isUploading ? "Enviando..." : "Enviar imagem de fundo"}</Text>
            </Pressable>
            {localSettings.backgroundImageUrl ? (
              <Text style={styles.helper}>Imagem atual: {localSettings.backgroundImageUrl}</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.buttonSecondary]} onPress={handleReset}>
          <Text style={styles.buttonSecondaryText}>Reverter para padrão</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.buttonPrimary]} onPress={() => void handleSave()} disabled={isSaving}>
          <Text style={styles.buttonText}>{isSaving ? "Salvando..." : "Salvar configurações"}</Text>
        </Pressable>
      </View>
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
    paddingBottom: 32,
    gap: 12,
  },
  title: {
    color: "#e5e7eb",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 8,
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
  card: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#0b1224",
    gap: 10,
  },
  sectionTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "transparent",
  },
  chipActive: {
    backgroundColor: "#22c55e22",
    borderColor: "#22c55e",
  },
  chipText: {
    color: "#e5e7eb",
  },
  chipTextActive: {
    color: "#bbf7d0",
  },
  colorsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  inputGroup: {
    width: "48%",
    gap: 4,
  },
  label: {
    color: "#9ca3af",
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 10,
    padding: 10,
    color: "#e5e7eb",
    backgroundColor: "#0f172a",
  },
  helper: {
    color: "#94a3b8",
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: "#22c55e",
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#334155",
  },
  buttonText: {
    color: "#022c22",
    fontWeight: "700",
    fontSize: 14,
  },
  buttonSecondaryText: {
    color: "#e5e7eb",
    fontWeight: "600",
    fontSize: 14,
  },
});
