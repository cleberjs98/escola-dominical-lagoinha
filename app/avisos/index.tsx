import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { deleteAviso, listAvisosForUser, updateAviso, type Aviso } from "../../lib/avisos";
import { AppButton } from "../../components/ui/AppButton";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { AppBackground } from "../../components/layout/AppBackground";
import type { AppTheme } from "../../types/theme";
import { withAlpha } from "../../theme/utils";

type Role = "aluno" | "professor" | "coordenador" | "administrador" | undefined;

export default function AvisosListScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const role: Role = user?.papel;
  const canCreate = role === "professor" || role === "coordenador" || role === "administrador";
  const isCoordinatorOrAdmin = role === "coordenador" || role === "administrador";
  const isApproved = user?.status === "aprovado";

  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      router.replace("/auth/login" as any);
    }
  }, [firebaseUser, isInitializing, router]);

  useEffect(() => {
    if (!firebaseUser || isInitializing) return;
    if (!isCoordinatorOrAdmin && !isApproved) {
      setIsLoading(false);
      return;
    }
    void loadAvisos();
  }, [firebaseUser, isInitializing, role, isCoordinatorOrAdmin, isApproved]);

  async function loadAvisos() {
    try {
      setIsLoading(true);
      const data = await listAvisosForUser(role);
      setAvisos(data);
    } catch (error) {
      console.error("[Avisos] Erro ao carregar:", error);
      Alert.alert("Erro", "Nao foi possivel carregar os avisos.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePublish(avisoId: string) {
    try {
      setActionId(avisoId);
      await updateAviso(avisoId, { status: "publicado" });
      await loadAvisos();
    } catch (error) {
      console.error("[Avisos] Erro ao publicar", error);
      Alert.alert("Erro", "Nao foi possivel publicar.");
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(avisoId: string) {
    try {
      setActionId(avisoId);
      await deleteAviso(avisoId);
      await loadAvisos();
    } catch (error) {
      console.error("[Avisos] Erro ao excluir", error);
      Alert.alert("Erro", "Nao foi possivel excluir.");
    } finally {
      setActionId(null);
    }
  }

  if (isLoading) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando avisos...</Text>
        </View>
      </AppBackground>
    );
  }

  const canEdit = isCoordinatorOrAdmin || role === "professor";

  return (
    <AppBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Avisos</Text>
            <Text style={styles.subtitle}>Comunicados para seu perfil.</Text>
          </View>
          {canCreate ? (
            <AppButton title="Criar aviso" fullWidth={false} onPress={() => router.push("/avisos/new" as any)} />
          ) : null}
        </View>

        {avisos.length === 0 ? (
          <EmptyState title="Nenhum aviso no momento." />
        ) : (
          avisos.map((aviso) => {
            const color = mapTipoToColor(aviso.tipo, theme);
            const summary = aviso.conteudo?.replace(/\s+/g, " ").trim();
            return (
              <View key={aviso.id} style={[styles.avisoCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
                <View style={[styles.bar, { backgroundColor: color }]} />
                <View style={styles.avisoContent}>
                  <View style={styles.avisoHeader}>
                    <View style={styles.titleRow}>
                      <Ionicons
                        name={aviso.tipo === "urgente" ? "alert-circle" : "megaphone-outline"}
                        size={16}
                        color={color}
                      />
                      <Text style={[styles.avisoTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {aviso.titulo}
                      </Text>
                    </View>
                    <View style={[styles.pill, { borderColor: color, backgroundColor: `${color}22` }]}>
                      <Text style={[styles.pillText, { color }]}>{destinoLabel(aviso.destino)}</Text>
                    </View>
                  </View>

                  {summary ? (
                    <Text style={[styles.summary, { color: theme.colors.muted }]} numberOfLines={3}>
                      {summary}
                    </Text>
                  ) : null}

                  <View style={styles.footerRow}>
                    <StatusBadge status={aviso.status === "rascunho" ? "pendente" : aviso.status} />
                    <Text style={[styles.meta, { color: theme.colors.muted }]}>
                      {aviso.criado_por_nome} {Platform.OS === "web" ? "-" : "•"} {formatRelative(aviso.criado_em)}
                    </Text>
                  </View>

                  {canEdit ? (
                    <View style={styles.actions}>
                      <AppButton
                        title="Editar"
                        variant="secondary"
                        fullWidth={false}
                        onPress={() => router.push(`/avisos/edit/${aviso.id}` as any)}
                      />
                      {aviso.status !== "publicado" ? (
                        <AppButton
                          title={actionId === aviso.id ? "Publicando..." : "Publicar"}
                          variant="primary"
                          fullWidth={false}
                          loading={actionId === aviso.id}
                          onPress={() => handlePublish(aviso.id)}
                        />
                      ) : null}
                      <AppButton
                        title={actionId === aviso.id ? "Excluindo..." : "Excluir"}
                        variant="danger"
                        fullWidth={false}
                        loading={actionId === aviso.id}
                        onPress={() => handleDelete(aviso.id)}
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </AppBackground>
  );
}

function mapTipoToColor(tipo: Aviso["tipo"], theme: AppTheme) {
  switch (tipo) {
    case "urgente":
      return theme.colors.status?.dangerBg || theme.colors.primary;
    case "interno":
      return theme.colors.primary;
    case "informativo":
    case "espiritual":
    default:
      return theme.colors.text;
  }
}

function destinoLabel(destino: Aviso["destino"]) {
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

function formatRelative(value: any) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null;
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `ha ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  return `ha ${days}d`;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "transparent",
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 32,
      gap: 12,
      backgroundColor: "transparent",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    loadingText: {
      color: theme.colors.text,
      marginTop: 12,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: "700",
    },
    subtitle: {
      color: theme.colors.muted || theme.colors.text,
      fontSize: 13,
      marginTop: 2,
    },
    avisoCard: {
      borderWidth: 1,
      borderRadius: 12,
      overflow: "hidden",
      borderColor: withAlpha(theme.colors.border || theme.colors.card, 0.45),
      backgroundColor: withAlpha(theme.colors.card, 0.82),
    },
    bar: {
      height: 4,
      width: "100%",
    },
    avisoContent: {
      padding: 12,
      gap: 6,
    },
    avisoHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    avisoTitle: {
      fontSize: 15,
      fontWeight: "700",
      flex: 1,
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    pillText: {
      fontSize: 12,
      fontWeight: "700",
    },
    summary: {
      fontSize: 13,
    },
    footerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    meta: {
      fontSize: 12,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 6,
    },
  });
}
