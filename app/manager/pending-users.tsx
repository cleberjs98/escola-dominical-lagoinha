// app/manager/pending-users.tsx
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
import {
  collection,
  FirestoreError,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { useAuth } from "../../hooks/useAuth";
import { firebaseDb } from "../../lib/firebase";
import { approveUser, rejectUser } from "../../lib/users";
import type { User } from "../../types/user";

type PendingUser = User;

export default function PendingUsersScreen() {
  const router = useRouter();
  const { user: currentUser, role, isInitializing, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const isCoordinatorOrAdmin = useMemo(
    () => role === "coordenador" || role === "administrador",
    [role]
  );

  // Guard de acesso
  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated || !isCoordinatorOrAdmin) {
      router.replace("/");
    }
  }, [isAuthenticated, isCoordinatorOrAdmin, isInitializing, router]);

  // Snapshot em tempo real de usuarios pendentes
  useEffect(() => {
    if (!isCoordinatorOrAdmin) return;

    const usersRef = collection(firebaseDb, "users");
    const q = query(usersRef, where("status", "==", "pendente"));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: PendingUser[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as User;
          if (data.papel === "administrador") return; // exclui admins
          list.push(data);
        });
        setPendingUsers(list);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        console.error("Erro ao carregar pendentes:", error);
        Alert.alert("Erro", "Nao foi possivel carregar usuarios pendentes.");
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [isCoordinatorOrAdmin]);

  const handleApprove = async (targetUserId: string) => {
    if (!currentUser) return;
    try {
      setActionLoadingId(targetUserId);
      await approveUser({ targetUserId, approverId: currentUser.id });
      Alert.alert("Sucesso", "Usuario aprovado.");
    } catch (error: any) {
      console.error("Erro ao aprovar usuario:", error);
      Alert.alert("Erro", error?.message || "Falha ao aprovar usuario.");
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
      Alert.alert("Atencao", "Informe o motivo da rejeicao.");
      return;
    }

    try {
      setActionLoadingId(selectedUserId);
      await rejectUser({
        targetUserId: selectedUserId,
        approverId: currentUser.id,
        reason: rejectReason.trim(),
      });
      Alert.alert("Sucesso", "Usuario rejeitado.");
      setRejectModalVisible(false);
      setSelectedUserId(null);
      setRejectReason("");
    } catch (error: any) {
      console.error("Erro ao rejeitar usuario:", error);
      Alert.alert("Erro", error?.message || "Falha ao rejeitar usuario.");
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

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{item.nome || "Sem nome"}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.papel}</Text>
          </View>
        </View>

        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.status}>Status: {item.status}</Text>

        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.approveButton, isActing && styles.disabled]}
            onPress={() => handleApprove(item.id)}
            disabled={isActing}
          >
            <Text style={styles.buttonText}>Aprovar</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.rejectButton, isActing && styles.disabled]}
            onPress={() => openRejectModal(item.id)}
            disabled={isActing}
          >
            <Text style={styles.buttonText}>Rejeitar</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (isInitializing || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando usuarios pendentes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aprovacao de usuarios</Text>
      <Text style={styles.subtitle}>
        Apenas coordenadores e administradores podem aprovar ou rejeitar cadastros.
      </Text>

      {pendingUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhum usuario pendente.</Text>
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
            <Text style={styles.modalTitle}>Motivo da rejeicao</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Descreva o motivo"
              placeholderTextColor="#6b7280"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.button, styles.cancelButton]} onPress={handleCancelReject}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.rejectButton]}
                onPress={handleConfirmReject}
              >
                <Text style={styles.buttonText}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  title: {
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 14,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#0b1224",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  name: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#334155",
  },
  badgeText: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "600",
  },
  email: {
    color: "#cbd5e1",
    fontSize: 14,
    marginBottom: 4,
  },
  status: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 8,
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
  approveButton: {
    backgroundColor: "#22c55e",
  },
  rejectButton: {
    backgroundColor: "#ef4444",
  },
  cancelButton: {
    backgroundColor: "#475569",
  },
  disabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#0f172a",
    fontWeight: "700",
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
  emptyContainer: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
  },
  emptyText: {
    color: "#9ca3af",
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
    backgroundColor: "#0b1224",
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  modalTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  modalInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    padding: 10,
    color: "#e5e7eb",
    backgroundColor: "#020617",
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
  },
});
