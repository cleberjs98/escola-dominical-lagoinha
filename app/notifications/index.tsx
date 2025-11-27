// app/notifications/index.tsx - centro de notificações com UI compartilhada
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
import { Card } from "../../components/ui/Card";
import { AppButton } from "../../components/ui/AppButton";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useTheme } from "../../hooks/useTheme";

type FilterKey = "todas" | NotificationReferenceType;

export default function NotificationsScreen() {
  const router = useRouter();
  const { firebaseUser, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

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
    if (!value) return "";
    try {
      const d = value.toDate ? value.toDate() : new Date(value);
      return d.toLocaleString();
    } catch {
      return String(value);
    }
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: themeSettings?.cor_fundo || "#020617" },
      ]}
      contentContainerStyle={styles.content}
    >
      <Card
        title="Notificações"
        subtitle="Revise suas notificações e abra os detalhes."
        footer={
          <AppButton
            title={isMarkingAll ? "Marcando..." : "Marcar todas como lidas"}
            variant="outline"
            fullWidth={false}
            onPress={handleMarkAll}
            disabled={isMarkingAll}
          />
        }
      />

      <View style={styles.filters}>
        {(["todas", "aula", "devocional", "noticia", "reserva"] as FilterKey[]).map(
          (f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[styles.filterChipText, active && styles.filterChipTextActive]}
                >
                  {f === "todas" ? "Todas" : f}
                </Text>
              </Pressable>
            );
          }
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#facc15" />
          <Text style={styles.loadingText}>Carregando notificações...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState title="Você ainda não tem notificações." />
      ) : (
        filteredNotifications.map((item) => {
          const isUnread = !item.lida;
          return (
            <Pressable
              key={item.id}
              style={[styles.card, isUnread && styles.cardUnread]}
              onPress={() => handlePressNotification(item)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.titulo}</Text>
                {isUnread && <Text style={styles.unreadDot}>•</Text>}
              </View>
              <Text style={styles.cardMessage}>{item.mensagem}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
                <StatusBadge
                  status={item.tipo_referencia || "notificação"}
                  variant="news"
                />
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
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
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  filterChipActive: {
    borderColor: "#22c55e",
    backgroundColor: "#22c55e22",
  },
  filterChipText: {
    color: "#cbd5e1",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#e5e7eb",
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
  card: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#0b1224",
    gap: 6,
  },
  cardUnread: {
    borderColor: "#22c55e",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    color: "#e5e7eb",
    fontSize: 15,
    fontWeight: "700",
  },
  unreadDot: {
    color: "#22c55e",
    fontSize: 18,
    fontWeight: "900",
  },
  cardMessage: {
    color: "#cbd5e1",
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardDate: {
    color: "#94a3b8",
    fontSize: 12,
  },
});
