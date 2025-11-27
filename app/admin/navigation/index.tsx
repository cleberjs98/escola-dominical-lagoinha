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
  createNavigationTab,
  listNavigationTabs,
  reorderNavigationTabs,
  updateNavigationTab,
} from "../../../lib/navigationSettings";
import type { NavigationTabConfig, NavigationTabConfigInput } from "../../../types/theme";

export default function NavigationAdminScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();

  const [tabs, setTabs] = useState<NavigationTabConfig[]>([]);
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
      Alert.alert("Sem permissão", "Apenas administradores podem personalizar a navegação.");
      router.replace("/" as any);
      return;
    }
    void loadTabs();
  }, [firebaseUser, isInitializing, isAdmin, router]);

  async function loadTabs() {
    try {
      setIsLoading(true);
      const list = await listNavigationTabs();
      setTabs(list);
    } catch (err) {
      console.error("Erro ao carregar tabs:", err);
      Alert.alert("Erro", "Não foi possível carregar as tabs.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateLocalTab(id: string, changes: Partial<NavigationTabConfig>) {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  }

  async function handleSaveTab(tab: NavigationTabConfig) {
    try {
      setIsSaving(true);
      await updateNavigationTab(tab.id, {
        chave: tab.chave,
        label: tab.label,
        icone: tab.icone,
        ordem: tab.ordem,
        visivel_para: tab.visivel_para,
        ativo: tab.ativo,
      });
      Alert.alert("Sucesso", "Tab atualizada.");
    } catch (err) {
      console.error("Erro ao salvar tab:", err);
      Alert.alert("Erro", "Não foi possível salvar a tab.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateTab() {
    const newTab: NavigationTabConfigInput = {
      chave: "custom",
      label: "Nova Tab",
      icone: "⭐",
      ordem: tabs.length + 1,
      visivel_para: ["aluno", "professor", "coordenador", "administrador"],
      ativo: true,
    };
    try {
      setIsSaving(true);
      await createNavigationTab(newTab);
      await loadTabs();
    } catch (err) {
      console.error("Erro ao criar tab:", err);
      Alert.alert("Erro", "Não foi possível criar a tab.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const currentIndex = tabs.findIndex((t) => t.id === id);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= tabs.length) return;

    const reordered = [...tabs];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const payload = reordered.map((t, idx) => ({ id: t.id, ordem: idx + 1 }));
    try {
      setIsSaving(true);
      await reorderNavigationTabs(payload);
      await loadTabs();
    } catch (err) {
      console.error("Erro ao reordenar tabs:", err);
      Alert.alert("Erro", "Não foi possível reordenar.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isInitializing || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Personalizar navegação</Text>
      <Text style={styles.subtitle}>
        Altere tabs, ordem, ícones, labels e visibilidade. Apenas administradores podem editar.
      </Text>

      <Pressable
        style={[styles.button, styles.buttonPrimary]}
        onPress={() => void handleCreateTab()}
        disabled={isSaving}
      >
        <Text style={styles.buttonText}>Adicionar nova tab</Text>
      </Pressable>

      {tabs.length === 0 ? (
        <Text style={styles.fieldValue}>Nenhuma tab configurada.</Text>
      ) : (
        tabs.map((tab) => (
          <View key={tab.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{tab.label || tab.chave}</Text>
              <View style={styles.row}>
                <Pressable
                  style={[styles.iconButton, styles.iconButtonOutline]}
                  onPress={() => handleReorder(tab.id, "up")}
                >
                  <Text style={styles.iconButtonText}>↑</Text>
                </Pressable>
                <Pressable
                  style={[styles.iconButton, styles.iconButtonOutline]}
                  onPress={() => handleReorder(tab.id, "down")}
                >
                  <Text style={styles.iconButtonText}>↓</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Chave</Text>
            <TextInput
              style={styles.input}
              value={tab.chave}
              onChangeText={(text) => updateLocalTab(tab.id, { chave: text })}
            />

            <Text style={styles.fieldLabel}>Label</Text>
            <TextInput
              style={styles.input}
              value={tab.label}
              onChangeText={(text) => updateLocalTab(tab.id, { label: text })}
            />

            <Text style={styles.fieldLabel}>Ícone (emoji ou nome)</Text>
            <TextInput
              style={styles.input}
              value={tab.icone}
              onChangeText={(text) => updateLocalTab(tab.id, { icone: text })}
            />

            <Text style={styles.fieldLabel}>Visível para (papeis separados por vírgula)</Text>
            <TextInput
              style={styles.input}
              value={tab.visivel_para.join(", ")}
              onChangeText={(text) =>
                updateLocalTab(tab.id, {
                  visivel_para: text
                    .split(",")
                    .map((t) => t.trim())
                    .filter((t) => t),
                })
              }
            />

            <View style={styles.row}>
              <Pressable
                style={[
                  styles.button,
                  tab.ativo ? styles.buttonSecondary : styles.buttonPrimary,
                ]}
                onPress={() => updateLocalTab(tab.id, { ativo: !tab.ativo })}
              >
                <Text style={tab.ativo ? styles.buttonSecondaryText : styles.buttonText}>
                  {tab.ativo ? "Desativar" : "Ativar"}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.button, styles.buttonPrimary]}
                onPress={() => void handleSaveTab(tab)}
                disabled={isSaving}
              >
                <Text style={styles.buttonText}>
                  {isSaving ? "Salvando..." : "Salvar tab"}
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
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 6,
  },
  iconButtonOutline: {
    borderWidth: 1,
    borderColor: "#334155",
  },
  iconButtonText: {
    color: "#e5e7eb",
    fontWeight: "700",
  },
});
