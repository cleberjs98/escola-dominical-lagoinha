import { useCallback, useEffect, useMemo, useState, useLayoutEffect } from "react";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
	BackHandler,
} from "react-native";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@react-navigation/elements";
import { collection, FirestoreError, onSnapshot, getDocs } from "firebase/firestore";

import { AppBackground } from "../../components/layout/AppBackground";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { firebaseDb } from "../../lib/firebase";
import { approveUser, deleteUserEverywhere, updateUserRole } from "../../lib/users";
import type { AppTheme } from "../../types/theme";
import type { User, UserRole, UserStatus } from "../../types/user";
import { withAlpha } from "../../theme/utils";
import { useScreenRefresh } from "../../hooks/useScreenRefresh";

type ManagedUser = Pick<User, "id" | "nome" | "email" | "telefone" | "papel" | "status">;

const ROLE_OPTIONS: UserRole[] = ["aluno", "professor", "coordenador", "administrador"];
const STATUS_OPTIONS: UserStatus[] = ["vazio", "pendente", "aprovado", "rejeitado"];

export default function ManageUsersScreen() {
	const router = useRouter();
	const { user: currentUser, firebaseUser, role, isAuthenticated, isInitializing } = useAuth();
	const { theme } = useTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const navigation = useNavigation();

	const [isLoading, setIsLoading] = useState(true);
	const [users, setUsers] = useState<ManagedUser[]>([]);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<UserStatus | "todos">("todos");
	const [roleFilter, setRoleFilter] = useState<UserRole | "todos">("todos");
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const [selectedRole, setSelectedRole] = useState<UserRole>("aluno");
	const [roleModalVisible, setRoleModalVisible] = useState(false);
	const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
	const [hasLoaded, setHasLoaded] = useState(false);

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

	useLayoutEffect(() => {
		navigation.setOptions({
			headerBackVisible: false,
			headerLeft: () => (
				<HeaderBackButton onPress={() => router.replace("/(tabs)" as any)} tintColor={theme.colors.text} />
			),
		});
	}, [navigation, router, theme.colors.text]);

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
				setUsers(list);
				setIsLoading(false);
				setHasLoaded(true);
			},
			(error: FirestoreError) => {
				console.error("[AdminUsers] Erro ao carregar usuarios:", error);
				Alert.alert("Erro", "Nao foi possivel carregar usuarios.");
				setIsLoading(false);
			}
		);

		return () => unsub();
	}, [isCoordinatorOrAdmin]);

	const loadUsersOnce = useCallback(async () => {
		if (!isCoordinatorOrAdmin) {
			setUsers([]);
			setIsLoading(false);
			setHasLoaded(true);
			return;
		}
		try {
			setIsLoading((prev) => prev || !hasLoaded);
			const usersRef = collection(firebaseDb, "users");
			const snap = await getDocs(usersRef);
			const list: ManagedUser[] = [];
			snap.forEach((docSnap) => {
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
			setUsers(list);
			setHasLoaded(true);
		} catch (error) {
			console.error("[AdminUsers] Erro ao recarregar usuarios:", error);
			Alert.alert("Erro", "Nao foi possivel recarregar usuarios.");
		} finally {
			setIsLoading(false);
		}
	}, [hasLoaded, isCoordinatorOrAdmin]);

	const { refreshing, refresh } = useScreenRefresh(loadUsersOnce, {
		enabled: isCoordinatorOrAdmin,
	});

	useEffect(() => {
		if (!isCoordinatorOrAdmin) return;
		void refresh();
	}, [isCoordinatorOrAdmin, refresh]);

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

	const handleDeleteUser = useCallback(async (userId: string) => {
		try {
			await deleteUserEverywhere(userId);
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
	}, []);

	const handleDeleteUserConfirm = (target: ManagedUser) => {
		if (!currentUser) return;
		if (!canDeleteUser(target)) {
			Alert.alert("Operacao nao permitida", "Voce nao pode remover este usuario.");
			return;
		}

		const proceed =
			Platform.OS === "web"
				? typeof window !== "undefined"
					? window.confirm(`Deseja realmente excluir ${target.nome || "o usuario"}?`)
					: false
				: true;

		if (Platform.OS !== "web") {
			Alert.alert(
				"Confirmar exclusao",
				`Deseja realmente excluir ${target.nome || "o usuario"}?`,
				[
					{ text: "Cancelar", style: "cancel" },
					{
						text: "Excluir",
						style: "destructive",
						onPress: () => {
							setActionLoadingId(target.id);
							void handleDeleteUser(target.id);
						},
					},
				]
			);
		} else if (proceed) {
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
				{STATUS_OPTIONS.map((status) => (
					<Pressable
						key={status}
						style={[styles.chip, statusFilter === status && styles.chipSelected]}
						onPress={() => setStatusFilter(status)}
					>
						<Text style={[styles.chipText, statusFilter === status && styles.chipTextSelected]}>
							{status}
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
				{ROLE_OPTIONS.map((option) => (
					<Pressable
						key={option}
						style={[styles.chip, roleFilter === option && styles.chipSelected]}
						onPress={() => setRoleFilter(option)}
					>
						<Text style={[styles.chipText, roleFilter === option && styles.chipTextSelected]}>
							{option}
						</Text>
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
						style={[styles.button, styles.actionButton, styles.roleButton, isActing && styles.disabled]}
						onPress={() => openRoleModal(item)}
						disabled={isActing}
					>
						<Text style={styles.buttonText}>Alterar papel</Text>
					</Pressable>
					{showApprove ? (
						<Pressable
							style={[
								styles.button,
								styles.actionButton,
								styles.approveButton,
								isActing && styles.disabled,
							]}
							onPress={() => handleApproveUser(item.id)}
							disabled={isActing}
						>
							<Text style={styles.buttonText}>Aprovar</Text>
						</Pressable>
					) : null}
					<Pressable
						style={[
							styles.button,
							styles.actionButton,
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
			<AppBackground>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={theme.colors.accent} />
					<Text style={styles.loadingText}>Carregando usuarios...</Text>
				</View>
			</AppBackground>
		);
	}

	return (
		<AppBackground>
			<View style={styles.container}>
				<Text style={styles.title}>Gestao de usuarios</Text>
				<Text style={styles.subtitle}>
					Coordenadores e administradores podem alterar papel e excluir usuarios (quando permitido).
				</Text>

				<TextInput
					style={styles.searchInput}
					placeholder="Buscar por nome, email ou telefone"
					placeholderTextColor={theme.colors.inputPlaceholder}
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
						refreshing={refreshing}
						onRefresh={refresh}
					/>
				)}
			</View>

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
		</AppBackground>
	);
}

function createStyles(theme: AppTheme) {
	return StyleSheet.create({
		container: {
			flex: 1,
			paddingHorizontal: 16,
			paddingTop: 32,
			paddingBottom: 24,
			backgroundColor: withAlpha(theme.colors.background, 0.35),
		},
		title: {
			color: theme.colors.text,
			fontSize: 22,
			fontWeight: "700",
			marginBottom: 4,
		},
		subtitle: {
			color: theme.colors.textSecondary,
			fontSize: 14,
			marginBottom: 12,
		},
		searchInput: {
			backgroundColor: withAlpha(theme.colors.inputBg, 0.9),
			borderWidth: 1,
			borderColor: theme.colors.inputBorder,
			borderRadius: 12,
			paddingHorizontal: 14,
			paddingVertical: 12,
			color: theme.colors.inputText,
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
			borderColor: theme.colors.border,
			borderRadius: 999,
			paddingHorizontal: 12,
			paddingVertical: 8,
			backgroundColor: withAlpha(theme.colors.card, 0.4),
		},
		chipSelected: {
			backgroundColor: theme.colors.buttons.primaryBg,
			borderColor: theme.colors.primary,
		},
		chipText: {
			color: theme.colors.text,
			fontWeight: "600",
		},
		chipTextSelected: {
			color: theme.colors.buttons.primaryText,
		},
		listContent: {
			paddingBottom: 32,
			gap: 12,
		},
		card: {
			borderWidth: 1,
			borderColor: theme.colors.border || theme.colors.divider,
			borderRadius: 16,
			padding: 14,
			backgroundColor: withAlpha(theme.colors.card, 0.95),
			gap: 6,
		},
		cardHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			gap: 12,
		},
		name: {
			color: theme.colors.text,
			fontSize: 16,
			fontWeight: "600",
			flexShrink: 1,
		},
		badge: {
			borderRadius: 999,
			paddingHorizontal: 10,
			paddingVertical: 4,
			backgroundColor: withAlpha(theme.colors.secondary ?? theme.colors.card, 0.85),
		},
		badgeText: {
			color: theme.colors.text,
			fontSize: 12,
			fontWeight: "600",
			textTransform: "capitalize",
		},
		email: {
			color: theme.colors.textSecondary,
			fontSize: 13,
		},
		phone: {
			color: theme.colors.textSecondary,
			fontSize: 13,
		},
		status: {
			color: theme.colors.textSecondary,
			fontSize: 13,
		},
		actions: {
			flexDirection: "row",
			justifyContent: "space-between",
			marginTop: 12,
			gap: 8,
		},
		button: {
			borderRadius: 12,
			paddingHorizontal: 14,
			paddingVertical: 10,
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: withAlpha(theme.colors.buttons.secondaryBg, 0.8),
		},
		actionButton: {
			flex: 1,
		},
		roleButton: {
			backgroundColor: theme.colors.buttons.primaryBg,
		},
		approveButton: {
			backgroundColor: theme.colors.status?.successBg || theme.colors.buttons.primaryBg,
		},
		deleteButton: {
			backgroundColor: theme.colors.status?.dangerBg || "#ef4444",
		},
		disabledButton: {
			backgroundColor: withAlpha(theme.colors.border || "#4b5563", 0.5),
		},
		disabled: {
			opacity: 0.5,
		},
		buttonText: {
			color: theme.colors.buttons.primaryText,
			fontWeight: "700",
		},
		loadingContainer: {
			flex: 1,
			alignItems: "center",
			justifyContent: "center",
			padding: 24,
		},
		loadingText: {
			color: theme.colors.text,
			marginTop: 12,
		},
		emptyContainer: {
			padding: 24,
			alignItems: "center",
			borderWidth: 1,
			borderColor: withAlpha(theme.colors.border, 0.6),
			borderRadius: 16,
			marginTop: 12,
		},
		emptyText: {
			color: theme.colors.textSecondary,
		},
		modalOverlay: {
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: "rgba(0,0,0,0.65)",
			alignItems: "center",
			justifyContent: "center",
			padding: 16,
		},
		modalCard: {
			backgroundColor: withAlpha(theme.colors.card, 0.98),
			borderRadius: 16,
			padding: 20,
			width: "92%",
			borderWidth: 1,
			borderColor: withAlpha(theme.colors.border, 0.7),
			gap: 12,
		},
		modalTitle: {
			color: theme.colors.text,
			fontSize: 16,
			fontWeight: "700",
		},
		rolesRow: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		roleChip: {
			borderWidth: 1,
			borderColor: theme.colors.border,
			borderRadius: 10,
			paddingHorizontal: 12,
			paddingVertical: 8,
			backgroundColor: withAlpha(theme.colors.card, 0.5),
		},
		roleChipSelected: {
			backgroundColor: theme.colors.buttons.primaryBg,
			borderColor: theme.colors.primary,
		},
		roleChipText: {
			color: theme.colors.text,
			fontWeight: "600",
			textTransform: "capitalize",
		},
		roleChipTextSelected: {
			color: theme.colors.buttons.primaryText,
			fontWeight: "700",
		},
		modalActions: {
			flexDirection: "row",
			justifyContent: "flex-end",
			gap: 10,
			marginTop: 8,
		},
		cancelButton: {
			backgroundColor: withAlpha(theme.colors.border, 0.4),
			flex: undefined,
			paddingHorizontal: 18,
		},
		confirmButton: {
			backgroundColor: theme.colors.status?.successBg || theme.colors.buttons.primaryBg,
			flex: undefined,
			paddingHorizontal: 18,
		},
	});
}

