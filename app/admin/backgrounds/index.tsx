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
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import {
  createBackground,
  getActiveBackgroundForSection,
  listBackgroundsForSection,
  setActiveBackgroundForSection,
  updateBackground,
} from "../../../lib/navigationSettings";
import type { BackgroundSettings, BackgroundSettingsInput } from "../../../types/theme";

const SECTIONS = [
  { key: "home", label: "Home" },
  { key: "lessons", label: "Aulas" },
  { key: "devotionals", label: "Devocionais" },
  { key: "avisos", label: "Avisos" },
  { key: "profile", label: "Perfil" },
];

type SectionState = {
  items: BackgroundSettings[];
  isLoading: boolean;
  form: {
    url_imagem: string;
    opacidade: string;
    posicao: string;
  };
};

export default function BackgroundsAdminScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const [sectionsState, setSectionsState] = useState<Record<string, SectionState>>({});

  const isAdmin = useMemo(() => user?.papel === "administrador", [user?.papel]);

  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (!isAdmin) {
      Alert.alert("Sem permissão", "Apenas administradores podem gerenciar backgrounds.");
      router.replace("/" as any);
      return;
    }

    const init: Record<string, SectionState> = {};
    SECTIONS.forEach((s) => {
      init[s.key] = {
        items: [],
        isLoading: false,
        form: { url_imagem: "", opacidade: "0.8", posicao: "cover" },
      };
    });
    setSectionsState(init);
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, isInitializing, isAdmin]);

  async function loadAll() {
    await Promise.all(SECTIONS.map((s) => loadSection(s.key)));
  }

  async function loadSection(secao: string) {
    try {
      setSectionsState((prev) => ({
        ...prev,
        [secao]: { ...(prev[secao] ?? defaultSectionState()), isLoading: true },
      }));
      const [list, active] = await Promise.all([
        listBackgroundsForSection(secao),
        getActiveBackgroundForSection(secao),
      ]);
      const normalized = list.map((bg) => ({
        ...bg,
        ativo: active ? bg.id === active.id : bg.ativo,
      }));
      setSectionsState((prev) => ({
        ...prev,
        [secao]: {
          ...(prev[secao] ?? defaultSectionState()),
          items: normalized,
          isLoading: false,
        },
      }));
    } catch (err) {
      console.error("Erro ao carregar backgrounds de secao:", secao, err);
      Alert.alert("Erro", "Não foi possível carregar os backgrounds.");
      setSectionsState((prev) => ({
        ...prev,
        [secao]: { ...(prev[secao] ?? defaultSectionState()), isLoading: false },
      }));
    }
  }

  function defaultSectionState(): SectionState {
    return {
      items: [],
      isLoading: false,
      form: { url_imagem: "", opacidade: "0.8", posicao: "cover" },
    };
  }

  function handleFormChange(
    secao: string,
    field: "url_imagem" | "opacidade" | "posicao",
    value: string
  ) {
    setSectionsState((prev) => ({
      ...prev,
      [secao]: {
        ...(prev[secao] ?? defaultSectionState()),
        form: { ...(prev[secao]?.form ?? defaultSectionState().form), [field]: value },
      },
    }));
  }

  async function handleCreate(secao: string) {
    const state = sectionsState[secao];
    if (!state) return;
    const { url_imagem, opacidade, posicao } = state.form;
    if (!url_imagem.trim()) {
      Alert.alert("Atenção", "Informe a URL da imagem.");
      return;
    }
    const opacityNum = Number(opacidade);
    if (Number.isNaN(opacityNum) || opacityNum < 0 || opacityNum > 1) {
      Alert.alert("Atenção", "Opacidade deve ser um número entre 0 e 1.");
      return;
    }
    const payload: BackgroundSettingsInput = {
      secao,
      url_imagem: url_imagem.trim(),
      opacidade: opacityNum,
      posicao: posicao.trim() || "cover",
      ativo: false,
    };
    try {
      await createBackground(payload);
      Alert.alert("Sucesso", "Background cadastrado.");
      setSectionsState((prev) => ({
        ...prev,
        [secao]: {
          ...(prev[secao] ?? defaultSectionState()),
          form: { url_imagem: "", opacidade: "0.8", posicao: "cover" },
        },
      }));
      await loadSection(secao);
    } catch (err) {
      console.error("Erro ao criar background:", err);
      Alert.alert("Erro", "Não foi possível salvar o background.");
    }
  }

  async function handleActivate(secao: string, id: string) {
    try {
      await setActiveBackgroundForSection(secao, id);
      await loadSection(secao);
    } catch (err) {
      console.error("Erro ao ativar background:", err);
      Alert.alert("Erro", "Não foi possível ativar o background.");
    }
  }

  async function handleDisable(id: string, secao: string) {
    try {
      await updateBackground(id, { ativo: false });
      await loadSection(secao);
    } catch (err) {
      console.error("Erro ao desativar background:", err);
      Alert.alert("Erro", "Não foi possível desativar o background.");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Personalização de Backgrounds (Admin)</Text>
      <Text style={styles.subtitle}>
        Defina imagens de fundo por seção. Ajuste opacidade e posição. Apenas administradores podem editar.
      </Text>

      {SECTIONS.map((section) => {
        const state = sectionsState[section.key] ?? defaultSectionState();
        const activeBg = state.items.find((bg) => bg.ativo);
        return (
          <View key={section.key} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.label}</Text>

            {state.isLoading ? (
              <View style={styles.inlineCenter}>
                <ActivityIndicator size="small" color="#facc15" />
                <Text style={styles.loadingText}>Carregando backgrounds...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Background ativo:</Text>
                {activeBg ? (
                  <View style={styles.activeBox}>
                    <Text style={styles.fieldValue}>{activeBg.url_imagem}</Text>
                    <Text style={styles.fieldMeta}>Opacidade: {activeBg.opacidade}</Text>
                    <Text style={styles.fieldMeta}>Posição: {activeBg.posicao}</Text>
                    <Image
                      source={{ uri: activeBg.url_imagem }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                    <Pressable
                      style={[styles.button, styles.buttonSecondary]}
                      onPress={() => void handleDisable(activeBg.id, section.key)}
                    >
                      <Text style={styles.buttonSecondaryText}>Desativar</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.fieldValue}>Nenhum ativo.</Text>
                )}

                <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Cadastrar novo</Text>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>URL da imagem</Text>
                  <TextInput
                    style={styles.input}
                    value={state.form.url_imagem}
                    onChangeText={(text) => handleFormChange(section.key, "url_imagem", text)}
                    placeholder="https://..."
                    placeholderTextColor="#6b7280"
                  />
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Opacidade (0 a 1)</Text>
                  <TextInput
                    style={styles.input}
                    value={state.form.opacidade}
                    onChangeText={(text) => handleFormChange(section.key, "opacidade", text)}
                    placeholder="0.8"
                    placeholderTextColor="#6b7280"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Posição</Text>
                  <TextInput
                    style={styles.input}
                    value={state.form.posicao}
                    onChangeText={(text) => handleFormChange(section.key, "posicao", text)}
                    placeholder="cover / center / top"
                    placeholderTextColor="#6b7280"
                  />
                </View>
                <Pressable
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={() => void handleCreate(section.key)}
                >
                  <Text style={styles.buttonText}>Salvar background</Text>
                </Pressable>

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Todos os backgrounds</Text>
                {state.items.length === 0 ? (
                  <Text style={styles.fieldValue}>Nenhum cadastrado.</Text>
                ) : (
                  state.items.map((bg) => (
                    <View key={bg.id} style={styles.itemBox}>
                      <Text style={styles.fieldValue}>{bg.url_imagem}</Text>
                      <Text style={styles.fieldMeta}>Opacidade: {bg.opacidade}</Text>
                      <Text style={styles.fieldMeta}>Posição: {bg.posicao}</Text>
                      <View style={styles.row}>
                        <Pressable
                          style={[
                            styles.button,
                            bg.ativo ? styles.buttonSecondary : styles.buttonPrimary,
                          ]}
                          onPress={() =>
                            bg.ativo
                              ? void handleDisable(bg.id, section.key)
                              : void handleActivate(section.key, bg.id)
                          }
                        >
                          <Text
                            style={bg.ativo ? styles.buttonSecondaryText : styles.buttonText}
                          >
                            {bg.ativo ? "Desativar" : "Ativar"}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A0509",
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
    backgroundColor: "#2A0E12",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 14,
    gap: 8,
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
    fontSize: 13,
  },
  fieldMeta: {
    color: "#94a3b8",
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
  inlineCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#e5e7eb",
  },
  activeBox: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  itemBox: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  previewImage: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    backgroundColor: "#0f172a",
  },
});

