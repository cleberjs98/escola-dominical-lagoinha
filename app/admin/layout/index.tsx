import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import { firebaseDb } from "../../../lib/firebase";

type LayoutSettings = {
  showDevotional: boolean;
  showAvisosRecentes: boolean;
  homeOrder: string[];
};

type NavigationSettings = {
  lessonsTabFirst: boolean;
};

type BackgroundSettings = {
  enabled: boolean;
  backgroundType: "none" | "default" | "image";
  imageUrl?: string;
};

type ThemeOption = {
  key: string;
  label: string;
  colors: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
};

const themeOptions: ThemeOption[] = [
  {
    key: "dark",
    label: "Tema Escuro",
    colors: {
      primaryColor: "#22c55e",
      secondaryColor: "#1f2937",
      backgroundColor: "#020617",
      textColor: "#e5e7eb",
    },
  },
  {
    key: "light",
    label: "Tema Claro",
    colors: {
      primaryColor: "#2563eb",
      secondaryColor: "#e5e7eb",
      backgroundColor: "#f8fafc",
      textColor: "#0f172a",
    },
  },
  {
    key: "blue",
    label: "Tema Azul Suave",
    colors: {
      primaryColor: "#38bdf8",
      secondaryColor: "#0f172a",
      backgroundColor: "#0b1224",
      textColor: "#e0f2fe",
    },
  },
  {
    key: "green",
    label: "Tema Verde Esperança",
    colors: {
      primaryColor: "#10b981",
      secondaryColor: "#064e3b",
      backgroundColor: "#022c22",
      textColor: "#ecfdf3",
    },
  },
];

const orderPresets: LayoutSettings["homeOrder"][] = [
  ["pendencias", "conteudos", "devocional", "avisos", "analytics"],
  ["pendencias", "analytics", "conteudos", "devocional", "avisos"],
  ["conteudos", "pendencias", "devocional", "avisos", "analytics"],
];

export default function AdminLayoutScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { reloadTheme, isThemeLoading } = useTheme();

  const [themeKey, setThemeKey] = useState<string>("dark");
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>({
    showDevotional: true,
    showAvisosRecentes: true,
    homeOrder: orderPresets[0],
  });
  const [navSettings, setNavSettings] = useState<NavigationSettings>({ lessonsTabFirst: false });
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>({
    enabled: false,
    backgroundType: "none",
    imageUrl: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = useMemo(() => user?.papel === "administrador", [user?.papel]);

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
    void loadExisting();
  }, [firebaseUser, isInitializing, isAdmin, router]);

  async function loadExisting() {
    try {
      const [themeSnap, layoutSnap, navSnap, bgSnap] = await Promise.all([
        getDoc(doc(firebaseDb, "theme_settings", "global")),
        getDoc(doc(firebaseDb, "layout_settings", "global")),
        getDoc(doc(firebaseDb, "navigation_settings", "global")),
        getDoc(doc(firebaseDb, "backgrounds", "home_background")),
      ]);

      if (themeSnap.exists()) {
        const data = themeSnap.data() as any;
        const matched = themeOptions.find((opt) => opt.colors.primaryColor === data.primaryColor);
        setThemeKey(matched?.key || themeOptions[0].key);
      }

      if (layoutSnap.exists()) {
        const data = layoutSnap.data() as Partial<LayoutSettings>;
        setLayoutSettings((prev) => ({
          ...prev,
          ...data,
          homeOrder:
            Array.isArray(data.homeOrder) && data.homeOrder.length
              ? data.homeOrder
              : prev.homeOrder,
        }));
      }

      if (navSnap.exists()) {
        const data = navSnap.data() as Partial<NavigationSettings>;
        setNavSettings((prev) => ({ ...prev, ...data }));
      }

      if (bgSnap.exists()) {
        const data = bgSnap.data() as any;
        setBackgroundSettings({
          enabled: data.enabled ?? false,
          backgroundType: data.backgroundType ?? "none",
          imageUrl: data.imageUrl ?? "",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      Alert.alert("Erro", "Não foi possível carregar as configurações atuais.");
    }
  }

  async function handleSave() {
    if (!firebaseUser || !isAdmin) return;
    try {
      setIsSaving(true);
      const selectedTheme = themeOptions.find((opt) => opt.key === themeKey) || themeOptions[0];

      await Promise.all([
        setDoc(
          doc(firebaseDb, "theme_settings", "global"),
          {
            ...selectedTheme.colors,
            cor_primaria: selectedTheme.colors.primaryColor,
            cor_secundaria: selectedTheme.colors.secondaryColor,
            cor_fundo: selectedTheme.colors.backgroundColor,
            cor_texto: selectedTheme.colors.textColor,
            cor_texto_secundario: selectedTheme.colors.textColor,
            cor_sucesso: "#22c55e",
            cor_erro: "#ef4444",
            cor_aviso: "#f59e0b",
            cor_info: "#38bdf8",
            ativo: true,
            updated_at: serverTimestamp() as any,
          },
          { merge: true }
        ),
        setDoc(
          doc(firebaseDb, "layout_settings", "global"),
          {
            ...layoutSettings,
            updated_at: serverTimestamp() as any,
            ativo: true,
            // Campos legados de layout para manter compatibilidade
            espacamento_xs: 4,
            espacamento_sm: 8,
            espacamento_md: 12,
            espacamento_lg: 16,
            espacamento_xl: 20,
            espacamento_xxl: 24,
            escala_fonte: 1,
            raio_borda: 12,
            intensidade_sombra: 1,
            estilo_card: "padrao",
            padding_componente: 12,
          },
          { merge: true }
        ),
        setDoc(
          doc(firebaseDb, "navigation_settings", "global"),
          {
            ...navSettings,
            updated_at: serverTimestamp() as any,
          },
          { merge: true }
        ),
        setDoc(
          doc(firebaseDb, "backgrounds", "home_background"),
          {
            ...backgroundSettings,
            updated_at: serverTimestamp() as any,
            secao: "home",
            ativo: backgroundSettings.enabled,
            url_imagem: backgroundSettings.backgroundType === "image" ? backgroundSettings.imageUrl : "",
            opacidade: 1,
            posicao: "cover",
          },
          { merge: true }
        ),
      ]);

      await reloadTheme();
      Alert.alert("Sucesso", "Configurações salvas.");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      Alert.alert("Erro", "Não foi possível salvar as configurações.");
    } finally {
      setIsSaving(false);
    }
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
        Escolha tema base, ordem da home, navegação e fundo. Apenas administradores podem alterar.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tema de cores</Text>
        <View style={styles.row}>
          {themeOptions.map((opt) => {
            const active = themeKey === opt.key;
            return (
              <Text
                key={opt.key}
                onPress={() => setThemeKey(opt.key)}
                style={[
                  styles.chip,
                  active && styles.chipActive,
                ]}
              >
                {opt.label}
              </Text>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Visibilidade de seções</Text>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Mostrar Devocional</Text>
          </View>
          <Switch
            value={layoutSettings.showDevotional}
            onValueChange={(val) => setLayoutSettings((prev) => ({ ...prev, showDevotional: val }))}
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Mostrar Avisos Recentes</Text>
          </View>
          <Switch
            value={layoutSettings.showAvisosRecentes}
            onValueChange={(val) =>
              setLayoutSettings((prev) => ({ ...prev, showAvisosRecentes: val }))
            }
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ordem da Home</Text>
        <Text style={styles.helper}>Selecione um preset simples.</Text>
        <View style={styles.row}>
          {orderPresets.map((preset, idx) => {
            const active = preset.join(",") === layoutSettings.homeOrder.join(",");
            return (
              <Text
                key={idx}
                onPress={() => setLayoutSettings((prev) => ({ ...prev, homeOrder: preset }))}
                style={[styles.chip, active && styles.chipActive]}
              >
                {preset.join(" • ")}
              </Text>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Barra de navegação</Text>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Aulas primeiro no Tab</Text>
            <Text style={styles.helper}>Define se a aba de Aulas deve vir antes de Devocionais.</Text>
          </View>
          <Switch
            value={navSettings.lessonsTabFirst}
            onValueChange={(val) => setNavSettings((prev) => ({ ...prev, lessonsTabFirst: val }))}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Fundo visual</Text>
        <View style={styles.row}>
          {(["none", "default", "image"] as BackgroundSettings["backgroundType"][]).map((option) => {
            const active = backgroundSettings.backgroundType === option;
            return (
              <Text
                key={option}
                onPress={() =>
                  setBackgroundSettings((prev) => ({ ...prev, backgroundType: option }))
                }
                style={[styles.chip, active && styles.chipActive]}
              >
                {option === "none" ? "Nenhum" : option === "default" ? "Padrão" : "Imagem"}
              </Text>
            );
          })}
        </View>

        {backgroundSettings.backgroundType === "image" ? (
          <TextInput
            style={styles.input}
            placeholder="URL da imagem"
            placeholderTextColor="#6b7280"
            value={backgroundSettings.imageUrl}
            onChangeText={(text) =>
              setBackgroundSettings((prev) => ({ ...prev, imageUrl: text }))
            }
          />
        ) : null}

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Ativar fundo</Text>
          </View>
          <Switch
            value={backgroundSettings.enabled}
            onValueChange={(val) =>
              setBackgroundSettings((prev) => ({ ...prev, enabled: val }))
            }
          />
        </View>
      </View>

      <View style={styles.actions}>
        <Text style={styles.saveButton} onPress={() => void handleSave()}>
          {isSaving ? "Salvando..." : "Salvar configurações"}
        </Text>
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
    color: "#e5e7eb",
  },
  chipActive: {
    backgroundColor: "#22c55e22",
    borderColor: "#22c55e",
    color: "#bbf7d0",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    color: "#e5e7eb",
    fontSize: 14,
  },
  helper: {
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
  actions: {
    alignItems: "flex-start",
  },
  saveButton: {
    backgroundColor: "#22c55e",
    color: "#022c22",
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
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
});
