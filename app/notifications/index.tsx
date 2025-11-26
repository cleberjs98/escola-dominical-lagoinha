// app/notifications/index.tsx
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import {
  listUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../lib/notifications";
import type {
  Notification,
  NotificationReferenceType,
} from "../../types/notification";

type FilterKey = "todas" | NotificationReferenceType;

export default function NotificationsScreen() {
  const router = useRouter();
  const { firebaseUser, isInitializing } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("todas");

  const userId = firebaseUser?.uid ?? null;

  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      router.replace("/auth/login" as any);
    }
  }, [firebaseUser, isInitializing, router]);

  useEffect(() => {
    if (!userId) return;
    void loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const filteredNotifications = useMemo(() => {
    if (filter === "todas") return notifications;
    return notifications.filter((n) => n.tipo_referencia === filter);
  }, [filter, notifications]);

  async function loadNotifications() {
    if (!userId) return;
    try {
      setIsLoading(true);
      const list = await listUserNotifications(userId, 50);
      setNotifications(list);
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
      Alert.alert("Erro", "Não foi possível carregar as notificações.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePressNotification(item: Notification) {
    if (!userId) return;
    try {
      if (!item.lida) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === item.id ? { ...n, lida: true, lida_em: null } : n
          )
        );
        await markNotificationAsRead(item.id);
      }
      if (item.tipo_referencia && item.referencia_id) {
        navigateToReference(item.tipo_referencia, item.referencia_id);
      }
    } catch (err) {
      console.error("Erro ao abrir notificação:", err);
    }
  }

  async function handleMarkAll() {
    if (!userId) return;
    try {
      setIsMarkingAll(true);
      await markAllNotificationsAsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch (err) {
      console.error("Erro ao marcar todas como lidas:", err);
      Alert.alert("Erro", "Não foi possível marcar todas como lidas.");
    } finally {
      setIsMarkingAll(false);
    }
  }

  function navigateToReference(tipo: NotificationReferenceType, id: string) {
    switch (tipo) {
      case "aula":
        router.push(`/lessons/${id}` as any);
        break;
      case "devocional":
        router.push(`/devotionals/${id}` as any);
        break;
      case "noticia":
        router.push(`/news/${id}` as any);
        break;
      case "reserva":
        // TODO: rota de detalhes de reserva quando existir
        break;
      default:
        break;
    }
  }

  function formatDate(value: any) {
    // value pode ser Timestamp ou string
    try {
      if (value?.toDate) {
        return new Date(value.toDate()).toLocaleString();
      }
      if (typeof value === "string") {
        return new Date(value).toLocaleString();
      }
      return "";
    } catch {
      return "";
    }
  }

  if (isInitializing || !firebaseUser) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Notificações</Text>
        <Pressable
          style={[
            styles.buttonSmall,
            isMarkingAll && styles.buttonSmallDisabled,
          ]}
          onPress={handleMarkAll}
          disabled={isMarkingAll}
        >
          <Text style={styles.buttonSmallText}>
            {isMarkingAll ? "Marcando..." : "Marcar todas"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {(["todas", "aula", "reserva", "devocional", "noticia"] as FilterKey[]).map(
          (key) => (
            <Pressable
              key={key}
              style={[
                styles.filterChip,
                filter === key && styles.filterChipActive,
              ]}
              onPress={() => setFilter(key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === key && styles.filterChipTextActive,
                ]}
              >
                {mapFilterLabel(key)}
              </Text>
            </Pressable>
          )
        )}
      </View>

      {isLoading ? (
        <View style={styles.centerInner}>
          <ActivityIndicator size="large" color="#facc15" />
          <Text style={styles.loadingText}>Buscando notificações...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Você ainda não tem notificações.</Text>
        </View>
      ) : (
        filteredNotifications.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.card, !item.lida && styles.cardUnread]}
            onPress={() => void handlePressNotification(item)}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, !item.lida && styles.cardTitleUnread]}>
                {item.titulo}
              </Text>
              {!item.lida && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.cardMessage}>{item.mensagem}</Text>
            <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
            {item.tipo_referencia && item.referencia_id && (
              <Pressable
                style={styles.buttonGhost}
                onPress={() =>
                  navigateToReference(item.tipo_referencia!, item.referencia_id!)
                }
              >
                <Text style={styles.buttonGhostText}>Ver detalhes</Text>
              </Pressable>
            )}
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function mapFilterLabel(key: FilterKey) {
  switch (key) {
    case "todas":
      return "Todas";
    case "aula":
      return "Aulas";
    case "reserva":
      return "Reservas";
    case "devocional":
      return "Devocionais";
    case "noticia":
      return "Notícias";
    case "outro":
      return "Outros";
    default:
      return "Todas";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 32,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: "#e5e7eb",
    fontSize: 20,
    fontWeight: "700",
  },
  buttonSmall: {
    borderWidth: 1,
    borderColor: "#22c55e",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  buttonSmallDisabled: {
    opacity: 0.6,
  },
  buttonSmallText: {
    color: "#bbf7d0",
    fontWeight: "700",
    fontSize: 12,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#0b1224",
  },
  filterChipActive: {
    borderColor: "#22c55e",
    backgroundColor: "#022c22",
  },
  filterChipText: {
    color: "#cbd5e1",
    fontSize: 12,
  },
  filterChipTextActive: {
    color: "#bbf7d0",
    fontWeight: "700",
  },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
  },
  centerInner: {
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 8,
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 16,
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 13,
  },
  card: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#0b1224",
    gap: 6,
  },
  cardUnread: {
    borderColor: "#22c55e",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    color: "#e5e7eb",
    fontSize: 15,
    fontWeight: "700",
  },
  cardTitleUnread: {
    color: "#bbf7d0",
  },
  cardMessage: {
    color: "#cbd5e1",
    fontSize: 13,
  },
  cardDate: {
    color: "#94a3b8",
    fontSize: 12,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
  },
  buttonGhost: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  buttonGhostText: {
    color: "#bbf7d0",
    fontWeight: "600",
    fontSize: 12,
  },
});
