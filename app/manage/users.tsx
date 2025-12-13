import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  FlatList,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  FirestoreError,
  onSnapshot,
} from "firebase/firestore";

import { useAuth } from "../../hooks/useAuth";
import { firebaseDb } from "../../lib/firebase";
import { updateUserRole, approveUser } from "../../lib/users";
import type { User, UserRole, UserStatus } from "../../types/user";

type ManagedUser = Pick<User, "id" | "nome" | "email" | "telefone" | "papel" | "status">;

const ROLE_OPTIONS: UserRole[] = ["aluno", "professor", "coordenador", "administrador"];
const STATUS_OPTIONS: UserStatus[] = ["vazio", "pendente", "aprovado", "rejeitado"];

export default function ManageUsersScreen() {
  const router = useRouter();
  const { user: currentUser, firebaseUser, role, isAuthenticated, isInitializing } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "todos">("todos");
  const [roleFilter, setRoleFilter] = useState<UserRole | "todos">("todos");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("aluno");
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const currentUid = useMemo(
    () => currentUser?.id || firebaseUser?.uid || "",
    [currentUser?.id, firebaseUser?.uid]
  );

  const isAdmin = role === "administrador" || role === "admin";
  const isCoordinatorOrAdmin = useMemo(
    () => role === "coordenador" || isAdmin,
    [role, isAdmin]
  );

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated || !isCoordinatorOrAdmin) {
      router.replace("/");
    }
  }, [isAuthenticated, isCoordinatorOrAdmin, isInitializing, router]);

  useEffect(() => {
    if (!isCoordinatorOrAdmin) return;

    const usersRef = collection(firebaseDb, "users");
    const unsub = onSnapshot(
      usersRef,
      (snapshot) => {
        const list: ManagedUser[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as User;
          list.push({
            id: docSnap.id,
            nome: data.nome,
            email: (data as any).email,
            telefone: data.telefone,
            papel: data.papel,
            status: data.status,
          });
        });
        console.log("[AdminUsers] Usuarios carregados", list.length);
        setUsers(list);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        console.error("[AdminUsers] Erro ao carregar usuarios:", error);
        Alert.alert("Erro", "Nao foi possivel carregar usuarios.");
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [isCoordinatorOrAdmin]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchStatus = statusFilter === "todos" || user.status === statusFilter;
      const matchRole = roleFilter === "todos" || user.papel === roleFilter;
      const matchSearch =
        term.length === 0 ||
        (user.nome || "").toLowerCase().includes(term) ||
        (user.email || "").toLowerCase().includes(term) ||
        (user.telefone ?? "").toLowerCase().includes(term);
      return matchStatus && matchRole && matchSearch;
    });
  }, [users, search, statusFilter, roleFilter]);

  const openRoleModal = (target: ManagedUser) => {
    setSelectedUserId(target.id);
    setSelectedRole(target.papel);
    setRoleModalVisible(true);
  };

  const handleUpdateRole = async () => {
    if (!currentUser || !selectedUserId) return;
    try {
      setActionLoadingId(selectedUserId);
      await updateUserRole({
        targetUserId: selectedUserId,
        approverId: currentUid,
        newRole: selectedRole,
      });
      Alert.alert("Sucesso", "Papel atualizado.");
      setRoleModalVisible(false);
      setSelectedUserId(null);
    } catch (error: any) {
      console.error("[AdminUsers] Erro ao atualizar papel:", error);
      Alert.alert("Erro", error?.message || "Falha ao atualizar papel.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApproveUser = async (targetUserId: string) => {
    if (!currentUser) return;
    try {
      setActionLoadingId(targetUserId);
      await approveUser({ targetUserId, approverId: currentUid });
      Alert.alert("Sucesso", "Usuario aprovado.");
    } catch (error: any) {
      console.error("[AdminUsers] Erro ao aprovar usuario:", error);
      Alert.alert("Erro", error?.message || "Falha ao aprovar usuario.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const canDeleteUser = (target: ManagedUser) => {
    if (!currentUser || !isCoordinatorOrAdmin) return false;
    if (currentUid && target.id === currentUid) return false;
    if (target.papel === "administrador" || target.papel === "admin") return false;
    if (!isAdmin && target.papel === "coordenador") return false;
    return true;
  };

  const handleDeleteUser = useCallback(
    async (userId: string) => {
      console.log("[AdminUsers] handleDeleteUser chamado", userId);
      try {
        await deleteDoc(doc(firebaseDb, "users", userId));
        console.log("[AdminUsers] Usuario deletado com sucesso", userId);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } catch (error: any) {
        console.error("[AdminUsers] Erro ao remover usuario:", error);
        const message =
          error?.code === "permission-denied"
            ? "Voce nao tem permissao para excluir este usuario."
            : error?.message || "Falha ao remover usuario.";
        Alert.alert("Erro", message);
      } finally {
        setActionLoadingId(null);
      }
    },
    []
  );

  const handleDeleteUserConfirm = (target: ManagedUser) => {
    if (!currentUser) return;
    console.log("[AdminUsers] Clique excluir", target.id);
    if (!canDeleteUser(target)) {
      Alert.alert("Operacao nao permitida", "Voce nao pode remover este usuario.");
      return;
    }

    const proceed = Platform.OS === "web"
      ? window.confirm(`Deseja realmente excluir ${target.nome || "o usuario"}?`)
      : true;

    if (Platform.OS !== "web") {
      Alert.alert("Confirmar exclusao", `Deseja realmente excluir ${target.nome || "o usuario"}?`, [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            console.log("[AdminUsers] Confirm delete pressed", target.id);
            setActionLoadingId(target.id);
            void handleDeleteUser(target.id);
          },
        },
      ]);
    } else if (proceed) {
      console.log("[AdminUsers] Confirm delete pressed", target.id);
      setActionLoadingId(target.id);
      void handleDeleteUser(target.id);
    }
  };

  const renderFilters = () => (
    <>
      <View style={styles.chipsRow}>
        <Pressable
          style={[styles.chip, statusFilter === "todos" && styles.chipSelected]}
          onPress={() => setStatusFilter("todos")}
        >
          <Text style={[styles.chipText, statusFilter === "todos" && styles.chipTextSelected]}>
            Status: todos
          </Text>
        </Pressable>
        {STATUS_OPTIONS.map((s) => (
          <Pressable
            key={s}
            style={[styles.chip, statusFilter === s && styles.chipSelected]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.chipText, statusFilter === s && styles.chipTextSelected]}>
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.chipsRow}>
        <Pressable
          style={[styles.chip, roleFilter === "todos" && styles.chipSelected]}
          onPress={() => setRoleFilter("todos")}
        >
          <Text style={[styles.chipText, roleFilter === "todos" && styles.chipTextSelected]}>
            Papel: todos
          </Text>
        </Pressable>
        {ROLE_OPTIONS.map((r) => (
          <Pressable
            key={r}
            style={[styles.chip, roleFilter === r && styles.chipSelected]}
            onPress={() => setRoleFilter(r)}
          >
            <Text style={[styles.chipText, roleFilter === r && styles.chipTextSelected]}>{r}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );

  const renderItem = ({ item }: { item: ManagedUser }) => {
    const isActing = actionLoadingId === item.id;
    const deletable = canDeleteUser(item);
    const showApprove = item.status === "pendente";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{item.nome || "Sem nome"}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.papel}</Text>
          </View>
        </View>

        <Text style={styles.email}>{item.email || "Email nao informado"}</Text>
        {item.telefone ? (
          <Text style={styles.phone}>Tel: {item.telefone}</Text>
        ) : (
          <Text style={styles.phone}>Tel: nao informado</Text>
        )}
        <Text style={styles.status}>Status: {item.status}</Text>

        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.roleButton, isActing && styles.disabled]}
            onPress={() => openRoleModal(item)}
            disabled={isActing}
          >
            <Text style={styles.buttonText}>Alterar papel</Text>
          </Pressable>
          {showApprove ? (
            <Pressable
              style={[styles.button, styles.approveButton, isActing && styles.disabled]}
              onPress={() => handleApproveUser(item.id)}
              disabled={isActing}
            >
              <Text style={styles.buttonText}>Aprovar</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[
              styles.button,
              deletable ? styles.deleteButton : styles.disabledButton,
              (!deletable || isActing) && styles.disabled,
            ]}
            onPress={() => handleDeleteUserConfirm(item)}
            disabled={!deletable || isActing}
          >
            <Text style={styles.buttonText}>Excluir</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (isInitializing || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando usuarios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestao de usuarios</Text>
      <Text style={styles.subtitle}>
        Coordenadores e administradores podem alterar papel e excluir usuarios (quando permitido).
      </Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar por nome, email ou telefone"
        placeholderTextColor="#6b7280"
        value={search}
        onChangeText={setSearch}
      />

      {renderFilters()}

      {filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhum usuario encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {roleModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selecione o novo papel</Text>
            <View style={styles.rolesRow}>
              {ROLE_OPTIONS.map((option) => {
                const selected = option === selectedRole;
                return (
                  <Pressable
                    key={option}
                    style={[styles.roleChip, selected && styles.roleChipSelected]}
                    onPress={() => setSelectedRole(option)}
                  >
                    <Text style={[styles.roleChipText, selected && styles.roleChipTextSelected]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={() => setRoleModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.confirmButton]} onPress={handleUpdateRole}>
                <Text style={styles.buttonText}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
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
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#e5e7eb",
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: "#facc15",
    borderColor: "#eab308",
  },
  chipText: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#0f172a",
  },
  listContent: {
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "transparent",
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    fontSize: 13,
  },
  phone: {
    color: "#94a3b8",
    fontSize: 13,
  },
  status: {
    color: "#94a3b8",
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 6,
  },
  button: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  roleButton: {
    backgroundColor: "#38bdf8",
  },
  approveButton: {
    backgroundColor: "#22c55e",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
  },
  disabledButton: {
    backgroundColor: "#4b5563",
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#f8fafc",
    fontWeight: "700",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 8,
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "#94a3b8",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#00000088",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  modalTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  rolesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roleChip: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  roleChipSelected: {
    backgroundColor: "#facc15",
    borderColor: "#eab308",
  },
  roleChipText: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  roleChipTextSelected: {
    color: "#0f172a",
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: "#4b5563",
  },
  confirmButton: {
    backgroundColor: "#22c55e",
  },
});
import { Platform } from "react-native";

