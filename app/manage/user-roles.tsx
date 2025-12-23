import { useCallback, useEffect, useMemo, useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Alert,
  BackHandler,
} from "react-native";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@react-navigation/elements";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firebaseDb } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import type { User, UserRole } from "../../types/user";
import { useScreenRefresh } from "../../hooks/useScreenRefresh";

/* Ajustes fase de testes — Home, notificações, gestão de papéis e permissões */

type RoleFilter = UserRole | "todos";

const ROLE_OPTIONS: UserRole[] = ["aluno", "professor", "coordenador", "administrador"];

export default function ManageUserRolesScreen() {
  const router = useRouter();
  const { user: currentUser, role, isInitializing, isAuthenticated } = useAuth();
  const navigation = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("todos");
  const [modalVisible, setModalVisible] = useState(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("aluno");
  const [saving, setSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const isCoordinator = role === "coordenador";
  const isAdmin = role === "administrador";

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated || (!isCoordinator && !isAdmin)) {
      router.replace("/");
    }
  }, [isAuthenticated, isCoordinator, isAdmin, isInitializing, router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => (
        <HeaderBackButton onPress={() => router.replace("/(tabs)" as any)} tintColor="#e5e7eb" />
      ),
    });
  }, [navigation, router]);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        router.replace("/(tabs)" as any);
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [router])
  );

  const loadUsers = useCallback(async () => {
    if (!isCoordinator && !isAdmin) {
      setUsers([]);
      setIsLoading(false);
      setHasLoaded(true);
      return;
    }
    try {
      setIsLoading((prev) => prev || !hasLoaded);
      const usersRef = collection(firebaseDb, "users");
      const q = query(usersRef, orderBy("nome"));
      const snap = await getDocs(q);
      const list: User[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as User;
        list.push({ ...data, id: docSnap.id });
      });
      setUsers(list);
      setHasLoaded(true);
    } catch (error) {
      console.error("Erro ao carregar usuarios:", error);
      Alert.alert("Erro", "Nao foi possivel carregar usuarios.");
    } finally {
      setIsLoading(false);
    }
  }, [hasLoaded, isAdmin, isCoordinator]);

  const { refreshing, refresh } = useScreenRefresh(loadUsers, {
    enabled: isCoordinator || isAdmin,
  });

  useEffect(() => {
    if (!isCoordinator && !isAdmin) return;
    void refresh();
  }, [isCoordinator, isAdmin, refresh]);

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase();
    return users.filter((u) => {
      const roleOk = roleFilter === "todos" ? true : u.papel === roleFilter;
      const textOk =
        !term ||
        (u.nome || "").toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term);
      return roleOk && textOk;
    });
  }, [users, roleFilter, search]);

  function openModal(user: User) {
    setTargetUser(user);
    setSelectedRole(user.papel);
    setModalVisible(true);
  }

  function canChangeTo(target: User, nextRole: UserRole) {
    if (target.id === currentUser?.id && isAdmin && nextRole !== "administrador") {
      return false;
    }
    if (isCoordinator) {
      if (nextRole === "administrador") return false;
      if (target.papel === "administrador") return false;
    }
    return true;
  }

  async function handleSaveRole() {
    if (!currentUser || !targetUser) return;
    if (selectedRole === targetUser.papel) {
      setModalVisible(false);
      return;
    }
    if (!canChangeTo(targetUser, selectedRole)) {
      Alert.alert("Permissao", "Nao e possivel alterar para esse papel.");
      return;
    }

    try {
      setSaving(true);
      const ref = doc(firebaseDb, "users", targetUser.id);
      await updateDoc(ref, {
        papel_anterior: targetUser.papel,
        papel: selectedRole,
        alterado_por_id: currentUser.id,
        alterado_em: serverTimestamp() as any,
        updated_at: serverTimestamp() as any,
      } as any);
      await loadUsers();
      setModalVisible(false);
      setTargetUser(null);
    } catch (error) {
      console.error("Erro ao alterar papel:", error);
      Alert.alert("Erro", "Nao foi possivel alterar o papel.");
    } finally {
      setSaving(false);
    }
  }

  const roleOptionsForCurrent = useMemo(() => {
    if (isAdmin) return ROLE_OPTIONS;
    return ROLE_OPTIONS.filter((r) => r !== "administrador");
  }, [isAdmin]);

  const renderUser = ({ item }: { item: User }) => {
    const disabled =
      (isAdmin && item.id === currentUser?.id) || (isCoordinator && item.papel === "administrador");

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.nome || "Sem nome"}</Text>
            <Text style={styles.email}>{item.email}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.papel}</Text>
          </View>
        </View>
        <Pressable
          style={[styles.button, disabled && styles.disabled]}
          onPress={() => openModal(item)}
          disabled={disabled}
        >
          <Text style={styles.buttonText}>Alterar papel</Text>
        </Pressable>
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
      <Text style={styles.title}>Gestao de papeis</Text>
      <Text style={styles.subtitle}>Apenas coordenadores e administradores podem acessar.</Text>

      <View style={styles.filters}>
        <TextInput
          style={styles.input}
          placeholder="Buscar por nome ou email"
          placeholderTextColor="#6b7280"
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.roleFilterRow}>
          {(["todos", ...ROLE_OPTIONS] as RoleFilter[]).map((opt) => (
            <Pressable
              key={opt}
              style={[
                styles.chip,
                roleFilter === opt && styles.chipActive,
              ]}
              onPress={() => setRoleFilter(opt)}
            >
              <Text style={roleFilter === opt ? styles.chipTextActive : styles.chipText}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={refresh}
      />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Alterar papel</Text>
            <Text style={styles.modalSubtitle}>{targetUser?.nome}</Text>
            <View style={styles.roleList}>
              {roleOptionsForCurrent.map((opt) => {
                const disabledOption = targetUser
                  ? !canChangeTo(targetUser, opt)
                  : false;
                return (
                  <Pressable
                    key={opt}
                    style={[
                      styles.roleOption,
                      selectedRole === opt && styles.roleOptionActive,
                      disabledOption && styles.disabled,
                    ]}
                    disabled={disabledOption}
                    onPress={() => setSelectedRole(opt)}
                  >
                    <Text style={selectedRole === opt ? styles.roleOptionTextActive : styles.roleOptionText}>
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton, saving && styles.disabled]}
                onPress={handleSaveRole}
                disabled={saving}
              >
                <Text style={styles.modalButtonText}>{saving ? "Salvando..." : "Salvar"}</Text>
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
    marginBottom: 12,
  },
  filters: {
    gap: 8,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    padding: 10,
    color: "#e5e7eb",
    backgroundColor: "transparent",
  },
  roleFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  chipText: {
    color: "#e5e7eb",
    fontSize: 12,
  },
  chipTextActive: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 32,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "transparent",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  name: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "600",
  },
  email: {
    color: "#cbd5e1",
    fontSize: 13,
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
  button: {
    backgroundColor: "#22c55e",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#022c22",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  modalTitle: {
    color: "#e5e7eb",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalSubtitle: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 12,
  },
  roleList: {
    gap: 8,
    marginBottom: 16,
  },
  roleOption: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  roleOptionActive: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  roleOptionText: {
    color: "#e5e7eb",
    fontSize: 14,
  },
  roleOptionTextActive: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#475569",
  },
  saveButton: {
    backgroundColor: "#22c55e",
  },
  modalButtonText: {
    color: "#0f172a",
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
});

