import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import {
  deleteAviso,
  listAvisosForUser,
  updateAviso,
  type Aviso,
} from "../../lib/avisos";
import { AppButton } from "../../components/ui/AppButton";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/StatusBadge";

type Role = "aluno" | "professor" | "coordenador" | "administrador" | undefined;

export default function AvisosListScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

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
      const targetUser = user
        ? ({ ...user, id: user.id || firebaseUser?.uid || "" } as any)
        : null;
      const list = await listAvisosForUser(targetUser);
      setAvisos(list);
    } catch (err) {
      console.error("[Avisos] erro ao carregar avisos:", err);
      Alert.alert("Erro", "Nao foi possivel carregar os avisos.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const doDelete = async () => {
      try {
        console.log("[Avisos] deleting", id);
        setActionId(id);
        await deleteAviso(id);
        await loadAvisos();
      } catch (err) {
        console.error("[Avisos] erro ao excluir aviso:", err);
        Alert.alert("Erro", "Nao foi possivel excluir o aviso.");
      } finally {
        setActionId(null);
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const ok = window.confirm("Deseja excluir este aviso?");
      if (ok) void doDelete();
      return;
    }

    Alert.alert("Excluir aviso", "Deseja excluir este aviso?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => void doDelete() },
    ]);
  }

  async function handleToggleFix(id: string, fixado: boolean) {
    try {
      setActionId(id);
      await updateAviso(id, { fixado: !fixado });
      await loadAvisos();
    } catch (err) {
      console.error("[Avisos] erro ao atualizar fixacao:", err);
      Alert.alert("Erro", "Nao foi possivel atualizar a fixacao do aviso.");
    } finally {
      setActionId(null);
    }
  }

  function canEdit(aviso: Aviso) {
    if (!firebaseUser) return false;
    if (isCoordinatorOrAdmin) return true;
    return role === "professor" && aviso.criado_por_id === firebaseUser.uid;
  }

  if (isInitializing || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando avisos...</Text>
      </View>
    );
  }

  if (!firebaseUser) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Redirecionando para login...</Text>
      </View>
    );
  }

  const bg = themeSettings?.cor_fundo || "#020617";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Avisos</Text>
          <Text style={styles.subtitle}>
            Quadros de avisos filtrados pelo seu papel.
          </Text>
        </View>
        {canCreate ? (
          <AppButton
            title="Criar aviso"
            variant="primary"
            fullWidth={false}
            onPress={() => router.push("/avisos/new" as any)}
          />
        ) : null}
      </View>

      {role === "aluno" || !role ? (
        <Section title="Avisos para voce">
          {avisos.length === 0 ? (
            <EmptyState title="Nenhum aviso para voce agora." />
          ) : (
            avisos.map((aviso) => (
              <AvisoCard
                key={aviso.id}
                aviso={aviso}
                canEdit={canEdit(aviso)}
                canFix={false}
                isActing={actionId === aviso.id}
                onEdit={() => router.push(`/avisos/edit/${aviso.id}` as any)}
                onDelete={() => handleDelete(aviso.id)}
              />
            ))
          )}
        </Section>
      ) : role === "professor" ? (
        <>
          <Section title="Avisos gerais">
            {filteredByDestino(avisos, "todos", "publicado").map((aviso) => (
              <AvisoCard
                key={aviso.id}
                aviso={aviso}
                canEdit={canEdit(aviso)}
                canFix={false}
                isActing={actionId === aviso.id}
                onEdit={() => router.push(`/avisos/edit/${aviso.id}` as any)}
                onDelete={() => handleDelete(aviso.id)}
              />
            ))}
            {filteredByDestino(avisos, "todos", "publicado").length === 0 ? (
              <EmptyState title="Nenhum aviso geral." />
            ) : null}
          </Section>

          <Section title="Avisos para professores">
            {filteredByDestino(avisos, "professores", "publicado").map((aviso) => (
              <AvisoCard
                key={aviso.id}
                aviso={aviso}
                canEdit={canEdit(aviso)}
                canFix={false}
                isActing={actionId === aviso.id}
                onEdit={() => router.push(`/avisos/edit/${aviso.id}` as any)}
                onDelete={() => handleDelete(aviso.id)}
              />
            ))}
            {filteredByDestino(avisos, "professores", "publicado").length === 0 ? (
              <EmptyState title="Nenhum aviso direcionado aos professores." />
            ) : null}
          </Section>

          <Section title="Meus avisos">
            {avisos.filter((a) => a.criado_por_id === firebaseUser.uid).map((aviso) => (
              <AvisoCard
                key={aviso.id}
                aviso={aviso}
                canEdit
                canFix={false}
                isActing={actionId === aviso.id}
                onEdit={() => router.push(`/avisos/edit/${aviso.id}` as any)}
                onDelete={() => handleDelete(aviso.id)}
              />
            ))}
            {avisos.filter((a) => a.criado_por_id === firebaseUser.uid).length === 0 ? (
              <EmptyState title="Voce ainda nao criou avisos." />
            ) : null}
          </Section>
        </>
      ) : (
        <>
          <Section title="Avisos fixados">
            {avisos.filter((a) => a.fixado).map((aviso) => (
              <AvisoCard
                key={aviso.id}
                aviso={aviso}
                canEdit
                canFix
                isActing={actionId === aviso.id}
                onEdit={() => router.push(`/avisos/edit/${aviso.id}` as any)}
                onDelete={() => handleDelete(aviso.id)}
                onToggleFix={() => handleToggleFix(aviso.id, aviso.fixado)}
              />
            ))}
            {avisos.filter((a) => a.fixado).length === 0 ? (
              <EmptyState title="Nenhum aviso fixado." />
            ) : null}
          </Section>

          <Section title="Avisos recentes">
            {avisos.filter((a) => !a.fixado).map((aviso) => (
              <AvisoCard
                key={aviso.id}
                aviso={aviso}
                canEdit
                canFix
                isActing={actionId === aviso.id}
                onEdit={() => router.push(`/avisos/edit/${aviso.id}` as any)}
                onDelete={() => handleDelete(aviso.id)}
                onToggleFix={() => handleToggleFix(aviso.id, aviso.fixado)}
              />
            ))}
            {avisos.filter((a) => !a.fixado).length === 0 ? (
              <EmptyState title="Nenhum aviso recente." />
            ) : null}
          </Section>

          <Section title="Meus avisos">
            {avisos.filter((a) => a.criado_por_id === firebaseUser.uid).map((aviso) => (
              <AvisoCard
                key={aviso.id}
                aviso={aviso}
                canEdit
                canFix
                isActing={actionId === aviso.id}
                onEdit={() => router.push(`/avisos/edit/${aviso.id}` as any)}
                onDelete={() => handleDelete(aviso.id)}
                onToggleFix={() => handleToggleFix(aviso.id, aviso.fixado)}
              />
            ))}
            {avisos.filter((a) => a.criado_por_id === firebaseUser.uid).length === 0 ? (
              <EmptyState title="Voce ainda nao criou avisos." />
            ) : null}
          </Section>
        </>
      )}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card title={title}>
      <View style={{ gap: 8 }}>{children}</View>
    </Card>
  );
}

function AvisoCard({
  aviso,
  canEdit,
  canFix,
  isActing,
  onEdit,
  onDelete,
  onToggleFix,
}: {
  aviso: Aviso;
  canEdit: boolean;
  canFix: boolean;
  isActing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFix?: () => void;
}) {
  const { themeSettings } = useTheme();
  const colors = useMemo(
    () => ({
      informativo: "#38bdf8",
      urgente: "#ef4444",
      interno: "#f59e0b",
      espiritual: "#a855f7",
    }),
    []
  );
  const color = colors[aviso.tipo] || "#38bdf8";
  const text = themeSettings?.cor_texto || "#e5e7eb";
  const muted = themeSettings?.cor_texto_secundario || "#94a3b8";
  const barColor = color;
  const iconName = aviso.tipo === "urgente" ? "alert-circle" : "megaphone-outline";
  const destinoLabel = destinoToLabel(aviso.destino);
  const summary = aviso.conteudo?.replace(/\s+/g, " ").trim();

  return (
    <View style={styles.avisoCard}>
      <View style={[styles.bar, { backgroundColor: barColor }]} />
      <View style={styles.avisoContent}>
        <View style={styles.avisoHeader}>
          <View style={styles.titleRow}>
            <Ionicons name={iconName as any} size={18} color={color} />
            <Text style={[styles.avisoTitle, { color: text }]} numberOfLines={1}>
              {aviso.titulo}
            </Text>
          </View>
          <View style={[styles.pill, { borderColor: color, backgroundColor: `${color}22` }]}>
            <Text style={[styles.pillText, { color }]}>{destinoLabel}</Text>
          </View>
        </View>

        {summary ? (
          <Text style={[styles.summary, { color: muted }]} numberOfLines={2}>
            {summary}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <Text style={[styles.meta, { color: muted }]}>
            {aviso.criado_por_nome} · {formatRelative(aviso.criado_em)}
          </Text>
          <StatusBadge status={aviso.status} />
        </View>

        {(canEdit || canFix) && (
          <View style={styles.actions}>
            {canEdit ? (
              <>
                <AppButton
                  title={isActing ? "Aguarde..." : "Editar"}
                  variant="outline"
                  fullWidth={false}
                  onPress={onEdit}
                  disabled={isActing}
                />
                <AppButton
                  title={isActing ? "Aguarde..." : "Excluir"}
                  variant="danger"
                  fullWidth={false}
                  onPress={onDelete}
                  disabled={isActing}
                />
              </>
            ) : null}
            {canFix && onToggleFix ? (
              <AppButton
                title={aviso.fixado ? "Desafixar" : "Fixar"}
                variant="secondary"
                fullWidth={false}
                onPress={onToggleFix}
                disabled={isActing}
              />
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

function destinoToLabel(destino: Aviso["destino"]) {
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

function filteredByDestino(
  avisos: Aviso[],
  destino: Aviso["destino"],
  status: Aviso["status"]
) {
  return avisos.filter((a) => a.destino === destino && a.status === status);
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 24,
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#e5e7eb",
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 2,
  },
  avisoCard: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#0b1224",
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
