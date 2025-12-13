// app/manager/pending-users.tsx
/* Ajustes fase de testes – Home, notificações, gestão de papéis e permissões */
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  FlatList,
  Modal,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, FirestoreError, onSnapshot, query, where } from "firebase/firestore";

import { useAuth } from "../../hooks/useAuth";
import { firebaseDb } from "../../lib/firebase";
import { approveUser, rejectUser } from "../../lib/users";
import type { User } from "../../types/user";
import { AppButton } from "../../components/ui/AppButton";
import { AppBackground } from "../../components/layout/AppBackground";
import { useTheme } from "../../hooks/useTheme";
import type { AppTheme } from "../../theme/tokens";
import { withAlpha } from "../../theme/utils";

type PendingUser = User;

export default function PendingUsersScreen() {
  const router = useRouter();
  const { user: currentUser, role, isInitializing, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isLoading, setIsLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const isApprover = useMemo(
    () => role === "professor" || role === "coordenador" || role === "administrador",
    [role]
  );

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated || !isApprover) {
      router.replace("/");
    }
  }, [isAuthenticated, isApprover, isInitializing, router]);

  useEffect(() => {
    if (!isApprover) return;

    const usersRef = collection(firebaseDb, "users");
    const q = query(usersRef, where("status", "==", "pendente"));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: PendingUser[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as User;
          if (data.papel === "administrador") return;
          list.push(data);
        });
        setPendingUsers(list);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        console.error("Erro ao carregar pendentes:", error);
        Alert.alert("Erro", "Não foi possível carregar usuários pendentes.");
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [isApprover]);

  const handleApprove = async (targetUserId: string) => {
    if (!currentUser) return;
    try {
      setActionLoadingId(targetUserId);
      await approveUser({ targetUserId, approverId: currentUser.id });
      Alert.alert("Sucesso", "Usuário aprovado.");
    } catch (error: any) {
      console.error("Erro ao aprovar usuario:", error);
      Alert.alert("Erro", error?.message || "Falha ao aprovar usuário.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRejectModal = (targetUserId: string) => {
    setSelectedUserId(targetUserId);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!currentUser || !selectedUserId) return;
    if (!rejectReason.trim()) {
      Alert.alert("Atenção", "Informe o motivo da rejeição.");
      return;
    }

    try {
      setActionLoadingId(selectedUserId);
      await rejectUser({
        targetUserId: selectedUserId,
        approverId: currentUser.id,
        reason: rejectReason.trim(),
      });
      Alert.alert("Sucesso", "Usuário rejeitado.");
      setRejectModalVisible(false);
      setSelectedUserId(null);
      setRejectReason("");
    } catch (error: any) {
      console.error("Erro ao rejeitar usuario:", error);
      Alert.alert("Erro", error?.message || "Falha ao rejeitar usuário.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelReject = () => {
    setRejectModalVisible(false);
    setSelectedUserId(null);
    setRejectReason("");
  };

  const renderItem = ({ item }: { item: PendingUser }) => {
    const isActing = actionLoadingId === item.id;
    const createdAt = formatDate(item.created_at);

    return (
      <AppCard
        title={item.nome || "Sem nome"}
        subtitle={`${(item.papel || "").toUpperCase()} • Criado em ${createdAt}`}
        statusLabel={item.status}
        statusVariant={item.status === "pendente" ? "warning" : "muted"}
        style={styles.card}
      >
        <Text style={styles.email}>{item.email}</Text>
        <View style={styles.actions}>
          <AppButton
            title={isActing ? "Aguarde..." : "Aprovar"}
            variant="primary"
            fullWidth={false}
            onPress={() => handleApprove(item.id)}
            disabled={isActing}
          />
          <AppButton
            title="Rejeitar"
            variant="secondary"
            fullWidth={false}
            onPress={() => openRejectModal(item.id)}
            disabled={isActing}
          />
        </View>
      </AppCard>
    );
  };

  if (isInitializing || isLoading) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando usuários pendentes...</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <View style={styles.container}>
        <Text style={styles.title}>Aprovação de usuários</Text>
        <Text style={styles.subtitle}>
          Professores, coordenadores e administradores podem aprovar ou rejeitar cadastros.
        </Text>

        {pendingUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum usuário pendente.</Text>
          </View>
        ) : (
          <FlatList
            data={pendingUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}

        <Modal
          visible={rejectModalVisible}
          animationType="slide"
          transparent
          onRequestClose={handleCancelReject}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Motivo da rejeição</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Descreva o motivo"
                placeholderTextColor={theme.colors.textMuted}
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
              />
              <View style={styles.modalActions}>
                <Pressable style={[styles.button, styles.cancelButton]} onPress={handleCancelReject}>
                  <Text style={styles.buttonText}>Cancelar</Text>
                </Pressable>
                <Pressable style={[styles.button, styles.rejectButton]} onPress={handleConfirmReject}>
                  <Text style={styles.buttonText}>Confirmar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AppBackground>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 16,
      backgroundColor: "transparent",
    },
    title: {
      color: theme.colors.textPrimary ?? "#FFFFFF",
      fontSize: 22,
      fontWeight: "700",
      marginBottom: 4,
    },
    subtitle: {
      color: theme.colors.textPrimary ?? "#FFFFFF",
      fontSize: 14,
      marginBottom: 16,
    },
    listContent: {
      paddingBottom: 24,
      gap: 12,
    },
    card: {
      borderWidth: 1,
      borderColor: withAlpha(theme.colors.border, 0.35),
      borderRadius: 12,
      padding: 12,
      backgroundColor: withAlpha(theme.colors.card, 0.7),
    },
    email: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      marginBottom: 4,
    },
    actions: {
      flexDirection: "row",
      gap: 8,
    },
    button: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: withAlpha(theme.colors.card, 0.6),
      borderWidth: 1,
      borderColor: withAlpha(theme.colors.border, 0.35),
    },
    rejectButton: {
      backgroundColor: theme.colors.danger,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonText: {
      color: theme.colors.textPrimary,
      fontWeight: "700",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      color: theme.colors.textSecondary,
      marginTop: 12,
    },
    emptyContainer: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginTop: 12,
      backgroundColor: theme.colors.card,
    },
    emptyText: {
      color: theme.colors.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    modalCard: {
      width: "100%",
      borderRadius: 12,
      backgroundColor: theme.colors.card,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 10,
    },
    modalInput: {
      minHeight: 80,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      borderRadius: 8,
      padding: 10,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.inputBg,
      marginBottom: 12,
    },
    modalActions: {
      flexDirection: "row",
      gap: 8,
    },
  });
}

function formatDate(ts: any) {
  try {
    const date = ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : null;
    if (!date) return "--/--";
    return date.toLocaleDateString("pt-BR");
  } catch {
    return "--/--";
  }
}
