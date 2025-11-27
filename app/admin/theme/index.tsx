// app/admin/theme/index.tsx
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import {
  createLayoutSettings,
  createThemeSettings,
  setLayoutSettingsActive,
  setThemeSettingsActive,
  updateLayoutSettings,
  updateThemeSettings,
} from "../../../lib/theme";
import type { LayoutSettings, ThemeSettings } from "../../../types/theme";

const defaultTheme: ThemeSettings = {
  id: "default",
  cor_primaria: "#22c55e",
  cor_secundaria: "#334155",
  cor_fundo: "#020617",
  cor_texto: "#e5e7eb",
  cor_texto_secundario: "#9ca3af",
  cor_sucesso: "#22c55e",
  cor_erro: "#ef4444",
  cor_aviso: "#f59e0b",
  cor_info: "#38bdf8",
  ativo: true,
  created_at: null as any,
  updated_at: null as any,
};

const defaultLayout: LayoutSettings = {
  id: "default",
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
  ativo: true,
  created_at: null as any,
  updated_at: null as any,
};

type ThemeFieldKey = keyof Pick<
  ThemeSettings,
  | "cor_primaria"
  | "cor_secundaria"
  | "cor_fundo"
  | "cor_texto"
  | "cor_texto_secundario"
  | "cor_sucesso"
  | "cor_erro"
  | "cor_aviso"
  | "cor_info"
>;

type LayoutFieldKey = keyof Pick<
  LayoutSettings,
  | "espacamento_xs"
  | "espacamento_sm"
  | "espacamento_md"
  | "espacamento_lg"
  | "espacamento_xl"
  | "espacamento_xxl"
  | "escala_fonte"
  | "raio_borda"
  | "intensidade_sombra"
  | "padding_componente"
  | "estilo_card"
>;

export default function AdminThemeScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings, layoutSettings, reloadTheme, isThemeLoading } = useTheme();

  const [localTheme, setLocalTheme] = useState<ThemeSettings | null>(themeSettings);
  const [localLayout, setLocalLayout] = useState<LayoutSettings | null>(layoutSettings);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = useMemo(() => user?.papel === "administrador", [user?.papel]);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (!isAdmin) {
      Alert.alert("Sem permissão", "Apenas administradores podem personalizar o tema.");
      router.replace("/" as any);
    }
  }, [firebaseUser, isInitializing, isAdmin, router]);

  useEffect(() => {
    if (themeSettings) setLocalTheme(themeSettings);
    if (layoutSettings) setLocalLayout(layoutSettings);
  }, [themeSettings, layoutSettings]);

  const themeFields: { key: ThemeFieldKey; label: string }[] = [
    { key: "cor_primaria", label: "Cor primária" },
    { key: "cor_secundaria", label: "Cor secundária" },
    { key: "cor_fundo", label: "Cor de fundo" },
    { key: "cor_texto", label: "Texto" },
    { key: "cor_texto_secundario", label: "Texto secundário" },
    { key: "cor_sucesso", label: "Sucesso" },
    { key: "cor_erro", label: "Erro" },
    { key: "cor_aviso", label: "Aviso" },
    { key: "cor_info", label: "Info" },
  ];

  const layoutFields: { key: LayoutFieldKey; label: string; numeric?: boolean }[] = [
    { key: "espacamento_xs", label: "Espaçamento XS", numeric: true },
    { key: "espacamento_sm", label: "Espaçamento SM", numeric: true },
    { key: "espacamento_md", label: "Espaçamento MD", numeric: true },
    { key: "espacamento_lg", label: "Espaçamento LG", numeric: true },
    { key: "espacamento_xl", label: "Espaçamento XL", numeric: true },
    { key: "espacamento_xxl", label: "Espaçamento XXL", numeric: true },
    { key: "padding_componente", label: "Padding componente", numeric: true },
    { key: "escala_fonte", label: "Escala de fonte", numeric: true },
    { key: "raio_borda", label: "Raio de borda", numeric: true },
    { key: "intensidade_sombra", label: "Intensidade de sombra", numeric: true },
    { key: "estilo_card", label: "Estilo de card", numeric: false },
  ];

  function handleThemeChange(key: ThemeFieldKey, value: string) {
    setLocalTheme((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function handleLayoutChange(key: LayoutFieldKey, value: string) {
    setLocalLayout((prev) => {
      if (!prev) return prev;
      const isNumber = layoutFields.find((f) => f.key === key)?.numeric;
      return {
        ...prev,
        [key]: isNumber ? Number(value) || 0 : value,
      } as LayoutSettings;
    });
  }

  function restoreDefaults() {
    setLocalTheme(defaultTheme);
    setLocalLayout(defaultLayout);
  }

  async function handleSave() {
    if (!firebaseUser || !isAdmin) return;
    try {
      setIsSaving(true);

      // Salva tema
      if (localTheme) {
        if (localTheme.id && localTheme.id !== "default") {
          await updateThemeSettings({ id: localTheme.id, ...localTheme, ativo: true });
          await setThemeSettingsActive(localTheme.id, true);
        } else {
          const newId = await createThemeSettings({ ...localTheme, ativo: true });
          await setThemeSettingsActive(newId, true);
        }
      }

      // Salva layout
      if (localLayout) {
        if (localLayout.id && localLayout.id !== "default") {
          await updateLayoutSettings({ id: localLayout.id, ...localLayout, ativo: true });
          await setLayoutSettingsActive(localLayout.id, true);
        } else {
          const newId = await createLayoutSettings({ ...localLayout, ativo: true });
          await setLayoutSettingsActive(newId, true);
        }
      }

      await reloadTheme();
      Alert.alert("Sucesso", "Tema aplicado para todos os usuários.");
    } catch (err) {
      console.error("Erro ao salvar tema:", err);
      Alert.alert("Erro", "Não foi possível salvar as configurações de tema.");
    } finally {
      setIsSaving(false);
    }
  }

  const previewBg = localTheme?.cor_fundo || "#020617";
  const previewText = localTheme?.cor_texto || "#e5e7eb";
  const previewPrimary = localTheme?.cor_primaria || "#22c55e";

  if (isInitializing || isThemeLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando tema...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Personalização de Tema (Admin)</Text>
      <Text style={styles.subtitle}>
        Ajuste cores e layout e aplique para todos os usuários. Somente administradores podem alterar.
      </Text>

      <View style={[styles.previewCard, { backgroundColor: previewBg }]}>
        <Text style={[styles.previewTitle, { color: previewText }]}>Pré-visualização</Text>
        <Text style={[styles.previewText, { color: previewText }]}>
          Texto principal com a cor configurada.
        </Text>
        <View style={[styles.previewButton, { backgroundColor: previewPrimary }]}>
          <Text style={[styles.previewButtonText, { color: "#022c22" }]}>
            Botão primário
          </Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Cores do tema</Text>
        {localTheme ? (
          themeFields.map((field) => (
            <View key={field.key} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput
                style={styles.input}
                value={localTheme[field.key]}
                onChangeText={(text) => handleThemeChange(field.key, text)}
                placeholder="#FFFFFF"
                placeholderTextColor="#6b7280"
              />
            </View>
          ))
        ) : (
          <Text style={styles.fieldValue}>Tema não carregado.</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Layout (espaçamentos e bordas)</Text>
        {localLayout ? (
          layoutFields.map((field) => (
            <View key={field.key} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput
                style={styles.input}
                value={String(localLayout[field.key] ?? "")}
                onChangeText={(text) => handleLayoutChange(field.key, text)}
                placeholder="0"
                placeholderTextColor="#6b7280"
                keyboardType={field.numeric ? "numeric" : "default"}
              />
            </View>
          ))
        ) : (
          <Text style={styles.fieldValue}>Layout não carregado.</Text>
        )}
      </View>

      <View style={styles.row}>
        <Pressable style={[styles.button, styles.buttonSecondary]} onPress={restoreDefaults}>
          <Text style={styles.buttonSecondaryText}>Restaurar padrão</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonPrimary]}
          onPress={() => void handleSave()}
          disabled={isSaving}
        >
          <Text style={styles.buttonText}>{isSaving ? "Salvando..." : "Salvar e aplicar"}</Text>
        </Pressable>
      </View>
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
  previewCard: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  previewText: {
    fontSize: 13,
  },
  previewButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  previewButtonText: {
    fontWeight: "700",
    fontSize: 13,
  },
  sectionCard: {
    backgroundColor: "#0b1224",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
  },
  fieldRow: {
    gap: 4,
  },
  fieldLabel: {
    color: "#9ca3af",
    fontSize: 12,
  },
  fieldValue: {
    color: "#e5e7eb",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 10,
    padding: 10,
    color: "#e5e7eb",
    backgroundColor: "#0f172a",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
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
