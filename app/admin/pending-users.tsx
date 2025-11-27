// app/admin/pending-users.tsx - pendentes (admin) usando componentes reutilizáveis
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  FirestoreError,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { useAuth } from "../../hooks/useAuth";
import { firebaseDb } from "../../lib/firebase";
import { approveUser, rejectUser, updateUserRole } from "../../lib/users";
import type { User, UserRole } from "../../types/user";
import { UserCard } from "../../components/cards/UserCard";
import { ApprovalModal } from "../../components/modals/ApprovalModal";
import { EditRoleModal } from "../../components/modals/EditRoleModal";
import { AppButton } from "../../components/ui/AppButton";
import { Header } from "../../components/ui/Header";

type PendingUser = User & { docId: string };

export default function AdminPendingUsersScreen() {
  const router = useRouter();
  const { user: currentUser, role, isInitializing, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [roleModalVisible, setRoleModalVisible] = useState(false);

  const isAdmin = useMemo(() => role === "administrador", [role]);

  // Guard de acesso
  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated || !isAdmin) {
      router.replace("/");
    }
  }, [isAuthenticated, isAdmin, isInitializing, router]);

  // Snapshot em tempo real de todos os pendentes (inclui coordenadores/admins)
  useEffect(() => {
    if (!isAdmin) return;

    const usersRef = collection(firebaseDb, "users");
    const q = query(usersRef, where("status", "==", "pendente"), orderBy("nome"));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: PendingUser[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as User;
          list.push({ ...(data as User), docId: docSnap.id });
        });
        setPendingUsers(list);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        console.error("Erro ao carregar pendentes (admin):", error);
        Alert.alert("Erro", "Nao foi possivel carregar usuarios pendentes.");
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [isAdmin]);

  const handleApprove = async (user: PendingUser) => {
    if (!currentUser) return;
    try {
      setActionLoadingId(user.docId);
      await approveUser({
        targetUserId: user.docId,
        approverId: currentUser.id,
        newRole: user.papel,
      });
      Alert.alert("Sucesso", "Usuario aprovado.");
    } catch (error: any) {
      console.error("Erro ao aprovar usuario (admin):", error);
      Alert.alert("Erro", error?.message || "Falha ao aprovar usuario.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmRoleChange = async (newRole: UserRole) => {
    if (!currentUser || !selectedUser) return;
    try {
      setActionLoadingId(selectedUser.docId);
      await updateUserRole({
        targetUserId: selectedUser.docId,
        approverId: currentUser.id,
        newRole,
      });
      Alert.alert("Sucesso", "Papel atualizado.");
    } catch (error: any) {
      console.error("Erro ao alterar papel (admin):", error);
      Alert.alert("Erro", error?.message || "Falha ao alterar papel.");
    } finally {
      setRoleModalVisible(false);
      setActionLoadingId(null);
      setSelectedUser(null);
    }
  };

  const handleReject = (user: PendingUser) => {
    setSelectedUser(user);
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async (reason?: string) => {
    if (!currentUser || !selectedUser) return;
    try {
      setActionLoadingId(selectedUser.docId);
      await rejectUser({
        targetUserId: selectedUser.docId,
        approverId: currentUser.id,
        reason: reason || "",
      });
      Alert.alert("Sucesso", "Usuario rejeitado.");
    } catch (error: any) {
      console.error("Erro ao rejeitar usuario (admin):", error);
      Alert.alert("Erro", error?.message || "Falha ao rejeitar usuario.");
    } finally {
      setRejectModalVisible(false);
      setActionLoadingId(null);
      setSelectedUser(null);
    }
  };

  const renderItem = ({ item }: { item: PendingUser }) => {
    const isActing = actionLoadingId === item.docId;
    return (
      <View style={styles.cardWrapper}>
        <UserCard
          user={item}
          showActions
          onApprove={() => handleApprove(item)}
          onReject={() => handleReject(item)}
        />
        <View style={styles.inlineActions}>
          <AppButton
            title="Alterar papel"
            variant="outline"
            fullWidth={false}
            onPress={() => {
              setSelectedUser(item);
              setRoleModalVisible(true);
            }}
          />
          {isActing ? (
            <ActivityIndicator color="#fbbf24" />
          ) : null}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fbbf24" />
        <Text style={styles.loadingText}>Carregando pendentes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Aprovação de usuários (Admin)" subtitle="Revise e aprove/rejeite cadastros." />
      <FlatList
        data={pendingUsers}
        renderItem={renderItem}
        keyExtractor={(item) => item.docId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum usuário pendente no momento.</Text>
        }
      />

      <ApprovalModal
        visible={rejectModalVisible}
        onClose={() => {
          setRejectModalVisible(false);
          setSelectedUser(null);
        }}
        onApprove={() => handleApprove(selectedUser as PendingUser)}
        onReject={(motivo) => handleConfirmReject(motivo)}
        title="Rejeitar usuário"
        description={`Informe o motivo para ${selectedUser?.nome || "o usuário"}.`}
      />

      {selectedUser ? (
        <EditRoleModal
          visible={roleModalVisible}
          user={selectedUser}
          onClose={() => {
            setRoleModalVisible(false);
            setSelectedUser(null);
          }}
          onSave={handleConfirmRoleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    padding: 16,
  },
  listContent: {
    paddingVertical: 8,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#020617",
  },
  loadingText: {
    color: "#e5e7eb",
  },
  emptyText: {
    color: "#94a3b8",
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
