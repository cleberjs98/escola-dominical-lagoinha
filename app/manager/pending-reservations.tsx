export const options = {
  title: "Aprovação de reservas",
};import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { getPendingReservations, approveReservation, rejectReservation } from "../../lib/reservations";
import type { Reservation } from "../../types/reservation";
import { AppButton } from "../../components/ui/AppButton";
import { AppBackground } from "../../components/layout/AppBackground";
import type { AppTheme } from "../../types/theme";
import { withAlpha } from "../../theme/utils";

type PendingReservation = Reservation & { id: string };

export default function PendingReservationsScreen() {
  const router = useRouter();
  const { firebaseUser, isInitializing } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [list, setList] = useState<PendingReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      router.replace("/auth/login");
      return;
    }
    void load();
  }, [firebaseUser, isInitializing]);

  async function load() {
    try {
      setLoading(true);
      const data = await getPendingReservations();
      setList(data as PendingReservation[]);
    } catch (error) {
      console.error("[PendingReservations] Erro ao carregar", error);
      Alert.alert("Erro", "Nao foi possivel carregar as reservas pendentes.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      setActionId(id);
      await approveReservation(id);
      await load();
    } catch (error) {
      console.error("[PendingReservations] Erro ao aprovar", error);
      Alert.alert("Erro", "Nao foi possivel aprovar.");
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id: string) {
    try {
      setActionId(id);
      await rejectReservation(id);
      await load();
    } catch (error) {
      console.error("[PendingReservations] Erro ao rejeitar", error);
      Alert.alert("Erro", "Nao foi possivel rejeitar.");
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando reservas...</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <View style={styles.container}>
        <Text style={styles.title}>Reservas pendentes</Text>
        {list.length === 0 ? (
          <Text style={styles.empty}>Nenhuma reserva pendente.</Text>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
                <Text style={[styles.lessonTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.tema_aula || "Reserva"}
                </Text>
                <Text style={[styles.meta, { color: theme.colors.muted }]}>
                  Professor: {item.professor_nome || "-"} | Data: {item.data_aula || "-"}
                </Text>
                <View style={styles.actions}>
                  <AppButton
                    title={actionId === item.id ? "Aprovando..." : "Aprovar"}
                    onPress={() => handleApprove(item.id)}
                    loading={actionId === item.id}
                    fullWidth={false}
                  />
                  <AppButton
                    title={actionId === item.id ? "Rejeitando..." : "Rejeitar"}
                    variant="outline"
                    onPress={() => handleReject(item.id)}
                    loading={actionId === item.id}
                    fullWidth={false}
                  />
                </View>
              </View>
            )}
          />
        )}
      </View>
    </AppBackground>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: "transparent",
    },
    listContent: {
      paddingVertical: 8,
      gap: 10,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
      gap: 10,
    },
    loadingText: {
      color: theme.colors.text,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 8,
    },
    empty: {
      color: theme.colors.muted || theme.colors.text,
    },
    card: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 6,
      borderColor: withAlpha(theme.colors.border || theme.colors.card, 0.45),
      backgroundColor: withAlpha(theme.colors.card, 0.82),
    },
    lessonTitle: {
      fontSize: 16,
      fontWeight: "700",
    },
    meta: {
      fontSize: 13,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 6,
    },
  });
}
