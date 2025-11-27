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
import {
  createScreenLayout,
  listScreenLayouts,
  updateScreenLayout,
} from "../../../lib/navigationSettings";
import type { ScreenLayoutConfig, ScreenLayoutConfigInput } from "../../../types/theme";

const SCREENS = [
  { key: "home", label: "Home" },
  { key: "lessons_list", label: "Lista de Aulas" },
  { key: "devotionals_list", label: "Lista de Devocionais" },
];

type EditableLayout = ScreenLayoutConfig & {
  secoes_editaveis?: string[];
  layout_tipo_editavel?: string;
  itens_por_linha?: number;
};

export default function LayoutsAdminScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();

  const [selectedScreen, setSelectedScreen] = useState<string>("home");
  const [layouts, setLayouts] = useState<EditableLayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = useMemo(() => user?.papel === "administrador", [user?.papel]);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (!isAdmin) {
      Alert.alert("Sem permissão", "Apenas administradores podem configurar layouts.");
      router.replace("/" as any);
      return;
    }
    void loadLayouts();
  }, [firebaseUser, isInitializing, isAdmin, selectedScreen, router]);

  async function loadLayouts() {
    try {
      setIsLoading(true);
      const list = await listScreenLayouts();
      const filtered = list
        .filter((l) => l.tela === selectedScreen)
        .map((l) => ({
          ...l,
          secoes_editaveis: l.secoes ?? [],
          layout_tipo_editavel: l.layout_tipo ?? "padrao",
          itens_por_linha: l.secoes?.length ? l.secoes.length : 1,
        }));
      setLayouts(filtered);
    } catch (err) {
      console.error("Erro ao carregar layouts:", err);
      Alert.alert("Erro", "Não foi possível carregar layouts.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateLocalLayout(id: string, changes: Partial<EditableLayout>) {
    setLayouts((prev) => prev.map((l) => (l.id === id ? { ...l, ...changes } : l)));
  }

  async function handleSaveLayout(layout: EditableLayout) {
    const secoesValidas = (layout.secoes_editaveis || [])
      .map((s) => s.trim())
      .filter((s) => s);
    const payload: Partial<ScreenLayoutConfigInput> = {
      tela: layout.tela,
      secoes: secoesValidas,
      layout_tipo: layout.layout_tipo_editavel || "padrao",
      ativo: true,
    };
    try {
      setIsSaving(true);
      if (layout.id) {
        await updateScreenLayout(layout.id, payload);
      } else {
        const base: ScreenLayoutConfigInput = {
          tela: layout.tela,
          secoes: secoesValidas,
          layout_tipo: payload.layout_tipo || "padrao",
          ativo: true,
        };
        await createScreenLayout(base);
      }
      Alert.alert("Sucesso", "Layout salvo.");
      await loadLayouts();
    } catch (err) {
      console.error("Erro ao salvar layout:", err);
      Alert.alert("Erro", "Não foi possível salvar.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateNew() {
    const base: ScreenLayoutConfigInput = {
      tela: selectedScreen,
      secoes: [],
      layout_tipo: "padrao",
      ativo: true,
    };
    try {
      setIsSaving(true);
      await createScreenLayout(base);
      await loadLayouts();
    } catch (err) {
      console.error("Erro ao criar layout:", err);
      Alert.alert("Erro", "Não foi possível criar novo layout.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Personalizar layout de telas</Text>
      <Text style={styles.subtitle}>
        Selecione a tela, defina seções, ordem e tipo de layout. Apenas administradores podem editar.
      </Text>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Tela alvo</Text>
        <View style={styles.row}>
          {SCREENS.map((s) => (
            <Pressable
              key={s.key}
              style={[
                styles.chip,
                selectedScreen === s.key && styles.chipActive,
              ]}
              onPress={() => setSelectedScreen(s.key)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedScreen === s.key && styles.chipTextActive,
                ]}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        style={[styles.button, styles.buttonPrimary]}
        onPress={() => void handleCreateNew()}
        disabled={isSaving}
      >
        <Text style={styles.buttonText}>Adicionar configuração</Text>
      </Pressable>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#facc15" />
          <Text style={styles.loadingText}>Carregando layouts...</Text>
        </View>
      ) : layouts.length === 0 ? (
        <Text style={styles.fieldValue}>Nenhuma configuração para esta tela.</Text>
      ) : (
        layouts.map((layout) => (
          <View key={layout.id} style={styles.card}>
            <Text style={styles.cardTitle}>Config {layout.id}</Text>

            <Text style={styles.fieldLabel}>Seções (separadas por vírgula)</Text>
            <TextInput
              style={styles.input}
              value={(layout.secoes_editaveis || []).join(", ")}
              onChangeText={(text) =>
                updateLocalLayout(layout.id, {
                  secoes_editaveis: text
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s),
                })
              }
              placeholder="ex: hero, cards, lista"
              placeholderTextColor="#6b7280"
            />

            <Text style={styles.fieldLabel}>Tipo de layout (grid/lista/cards)</Text>
            <TextInput
              style={styles.input}
              value={layout.layout_tipo_editavel || "padrao"}
              onChangeText={(text) => updateLocalLayout(layout.id, { layout_tipo_editavel: text })}
              placeholder="padrao"
              placeholderTextColor="#6b7280"
            />

            <Text style={styles.fieldLabel}>Itens por linha (para grid)</Text>
            <TextInput
              style={styles.input}
              value={String(layout.itens_por_linha ?? 1)}
              onChangeText={(text) =>
                updateLocalLayout(layout.id, { itens_por_linha: Number(text) || 1 })
              }
              placeholder="1"
              placeholderTextColor="#6b7280"
              keyboardType="numeric"
            />

            <View style={styles.row}>
              <Pressable
                style={[
                  styles.button,
                  layout.ativo ? styles.buttonSecondary : styles.buttonPrimary,
                ]}
                onPress={() => updateLocalLayout(layout.id, { ativo: !layout.ativo })}
              >
                <Text style={layout.ativo ? styles.buttonSecondaryText : styles.buttonText}>
                  {layout.ativo ? "Desativar" : "Ativar"}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.button, styles.buttonPrimary]}
                onPress={() => void handleSaveLayout(layout)}
                disabled={isSaving}
              >
                <Text style={styles.buttonText}>
                  {isSaving ? "Salvando..." : "Salvar"}
                </Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
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
  sectionCard: {
    backgroundColor: "#0b1224",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
  },
  chip: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: "#022c22",
    borderColor: "#22c55e",
  },
  chipText: {
    color: "#cbd5e1",
    fontSize: 12,
  },
  chipTextActive: {
    color: "#bbf7d0",
    fontWeight: "700",
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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
  card: {
    backgroundColor: "#0b1224",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
  },
  fieldLabel: {
    color: "#9ca3af",
    fontSize: 12,
  },
  fieldValue: {
    color: "#e5e7eb",
    fontSize: 13,
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
    gap: 8,
    justifyContent: "flex-start",
    flexWrap: "wrap",
  },
});
