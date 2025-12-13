import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { collection, FirestoreError, onSnapshot, orderBy, query, where } from "firebase/firestore";

import { useAuth } from "../../hooks/useAuth";
import { firebaseDb } from "../../lib/firebase";
import { approveUser, rejectUser, updateUserRole } from "../../lib/users";
import type { User, UserRole } from "../../types/user";
import { UserCard } from "../../components/cards/UserCard";
import { ApprovalModal } from "../../components/modals/ApprovalModal";
import { EditRoleModal } from "../../components/modals/EditRoleModal";
import { AppButton } from "../../components/ui/AppButton";
import { Header } from "../../components/ui/Header";
import { AppBackground } from "../../components/layout/AppBackground";
import { useTheme } from "../../hooks/useTheme";
import type { AppTheme } from "../../types/theme";

type PendingUser = User & { docId: string };

export default function AdminPendingUsersScreen() {
  const router = useRouter();
  const { user: currentUser, role, isInitializing, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [isLoading, setIsLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [editRoleUser, setEditRoleUser] = useState<PendingUser | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isInitializing) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, isInitializing, router]);

  useEffect(() => {
    if (!role || (role !== "administrador" && role !== "coordenador")) {
      setIsLoading(false);
      return;
    }
    const q = query(
      collection(firebaseDb, "users"),
      where("status", "==", "pendente"),
      orderBy("criado_em", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: PendingUser[] = snap.docs.map((docSnap) => ({
          docId: docSnap.id,
          ...(docSnap.data() as User),
        }));
        setPendingUsers(list);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        console.error("[Admin] Erro ao listar pendentes", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [role]);

  async function handleApprove(userId: string) {
    try {
      setActionLoadingId(userId);
      await approveUser(userId);
      Alert.alert("Sucesso", "Usuario aprovado.");
    } catch (error) {
      console.error("[Admin] Erro ao aprovar usuario", error);
      Alert.alert("Erro", "Nao foi possivel aprovar agora.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(userId: string) {
    try {
      setActionLoadingId(userId);
      await rejectUser(userId);
      Alert.alert("Sucesso", "Usuario rejeitado.");
    } catch (error) {
      console.error("[Admin] Erro ao rejeitar usuario", error);
      Alert.alert("Erro", "Nao foi possivel rejeitar agora.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleUpdateRole(userId: string, role: UserRole) {
    try {
      setUpdatingRole(true);
      await updateUserRole(userId, role);
    } catch (error) {
      console.error("[Admin] Erro ao atualizar papel", error);
      Alert.alert("Erro", "Nao foi possivel atualizar o papel.");
    } finally {
      setUpdatingRole(false);
      setEditRoleUser(null);
    }
  }

  if (isLoading) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando pendentes...</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <View style={styles.container}>
        <Header title="Usuarios pendentes" />

        {pendingUsers.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Nenhum usuario pendente no momento.</Text>
          </View>
        ) : (
          <FlatList
            data={pendingUsers}
            keyExtractor={(item) => item.docId}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.cardWrapper}>
                <UserCard
                  user={item}
                  onPress={() => setSelectedUser(item)}
                  onEditRole={() => setEditRoleUser(item)}
                  rightActions={
                    <View style={styles.inlineActions}>
                      <AppButton
                        title={actionLoadingId === item.docId ? "Aprovando..." : "Aprovar"}
                        onPress={() => handleApprove(item.docId)}
                        loading={actionLoadingId === item.docId}
                        fullWidth={false}
                      />
                      <AppButton
                        title={actionLoadingId === item.docId ? "Rejeitando..." : "Rejeitar"}
                        variant="outline"
                        onPress={() => handleReject(item.docId)}
                        loading={actionLoadingId === item.docId}
                        fullWidth={false}
                      />
                    </View>
                  }
                />
              </View>
            )}
          />
        )}

        <ApprovalModal
          visible={!!selectedUser}
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onApprove={() => {
            if (selectedUser) handleApprove(selectedUser.docId);
          }}
          onReject={() => {
            if (selectedUser) handleReject(selectedUser.docId);
          }}
        />

        <EditRoleModal
          visible={!!editRoleUser}
          user={editRoleUser}
          onClose={() => setEditRoleUser(null)}
          onSave={(role) => {
            if (editRoleUser) handleUpdateRole(editRoleUser.docId, role);
          }}
          loading={updatingRole}
        />
      </View>
    </AppBackground>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
    },
    listContent: {
      paddingVertical: 8,
      gap: 8,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      color: theme.colors.text,
    },
    emptyText: {
      color: theme.colors.muted || theme.colors.text,
      textAlign: "center",
      marginTop: 20,
    },
    cardWrapper: {
      marginBottom: 12,
      gap: 8,
    },
    inlineActions: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
    },
  });
}
