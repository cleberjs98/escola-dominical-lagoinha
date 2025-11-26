// app/manager/pending-reservations.tsx
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  FirestoreError,
  getDoc,
  doc,
} from "firebase/firestore";

import { useAuth } from "../../hooks/useAuth";
import { firebaseDb } from "../../lib/firebase";
import {
  approveReservationAndUpdateLesson,
  rejectReservationAndKeepLesson,
} from "../../lib/reservations";
import type { Reservation } from "../../types/reservation";
import type { Lesson } from "../../types/lesson";

type PendingReservation = Reservation & {
  docId: string;
  lesson?: Lesson | null;
};

export default function PendingReservationsScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();

  const [reservations, setReservations] = useState<PendingReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(
    null
  );

  const isCoordinatorOrAdmin = useMemo(
    () => user?.papel === "coordenador" || user?.papel === "administrador",
    [user?.papel]
  );

  // Guard
  useEffect(() => {
    if (isInitializing) return;
    if (!firebaseUser) {
      router.replace("/auth/login" as any);
      return;
    }
    if (!isCoordinatorOrAdmin) {
      Alert.alert("Sem permissão", "Apenas coordenador ou administrador podem acessar.");
      router.replace("/" as any);
    }
  }, [firebaseUser, isInitializing, isCoordinatorOrAdmin, router]);

  // Carregar reservas pendentes + dados básicos da aula
  useEffect(() => {
    if (!firebaseUser || !isCoordinatorOrAdmin) return;

    const colRef = collection(firebaseDb, "reservas_aula");
    const q = query(colRef, where("status", "==", "pendente"), orderBy("solicitado_em"));

    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        const list: PendingReservation[] = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as Omit<Reservation, "id">;
          const reservation: PendingReservation = {
            id: docSnap.id,
            docId: docSnap.id,
            ...data,
            lesson: null,
          };

          // Buscar aula associada (dados mínimos)
          try {
            const lessonRef = doc(firebaseDb, "aulas", data.aula_id);
            const lessonSnap = await getDoc(lessonRef);
            if (lessonSnap.exists()) {
              const lessonData = lessonSnap.data() as Omit<Lesson, "id">;
              reservation.lesson = { id: lessonSnap.id, ...lessonData };
            }
          } catch (err) {
            console.error("Erro ao carregar aula da reserva:", err);
          }

          list.push(reservation);
        }

        setReservations(list);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        console.error("Erro ao carregar reservas pendentes:", error);
        Alert.alert("Erro", "Não foi possível carregar reservas pendentes.");
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [firebaseUser, isCoordinatorOrAdmin]);

  const openRejectModal = (reservationId: string) => {
    setSelectedReservationId(reservationId);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const handleApprove = async (reservationId: string) => {
    if (!firebaseUser) return;
    try {
      setActionLoadingId(reservationId);
      await approveReservationAndUpdateLesson({
        reservationId,
        aprovadorId: firebaseUser.uid,
      });
      Alert.alert(
        "Sucesso",
        "Reserva aprovada e aula marcada como reservada para o professor."
      );
    } catch (error: any) {
      console.error("Erro ao aprovar reserva:", error);
      Alert.alert("Erro", error?.message || "Falha ao aprovar reserva.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!firebaseUser || !selectedReservationId) return;
    if (!rejectReason.trim()) {
      Alert.alert("Atenção", "Informe o motivo da rejeição.");
      return;
    }

    try {
      setActionLoadingId(selectedReservationId);
      await rejectReservationAndKeepLesson({
        reservationId: selectedReservationId,
        aprovadorId: firebaseUser.uid,
        motivo: rejectReason.trim(),
      });
      Alert.alert("Sucesso", "Reserva rejeitada.");
      setRejectModalVisible(false);
      setSelectedReservationId(null);
      setRejectReason("");
    } catch (error: any) {
      console.error("Erro ao rejeitar reserva:", error);
      Alert.alert("Erro", error?.message || "Falha ao rejeitar reserva.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelReject = () => {
    setRejectModalVisible(false);
    setSelectedReservationId(null);
    setRejectReason("");
  };

  if (isInitializing || !isCoordinatorOrAdmin) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reservas de aula pendentes</Text>
      <Text style={styles.subtitle}>
        Aprove ou rejeite as solicitações de reserva enviadas pelos professores.
      </Text>

      {isLoading ? (
        <View style={styles.centerInner}>
          <ActivityIndicator size="large" color="#facc15" />
          <Text style={styles.loadingText}>Buscando reservas...</Text>
        </View>
      ) : reservations.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Nenhuma reserva pendente.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {reservations.map((res) => {
            const isActing = actionLoadingId === res.docId;
            const lessonTitle = res.lesson?.titulo || "(Sem título)";
            const lessonDate = res.lesson?.data_aula
              ? String(res.lesson.data_aula)
              : "Sem data";

            return (
              <View key={res.docId} style={styles.card}>
                <Text style={styles.cardTitle}>{lessonTitle}</Text>
                <Text style={styles.cardLine}>Data da aula: {lessonDate}</Text>
                <Text style={styles.cardLine}>Professor: {res.professor_id}</Text>
                <Text style={styles.cardLine}>Status: {res.status}</Text>
                {res.solicitado_em && (
                  <Text style={styles.cardLine}>
                    Solicitado em: {String(res.solicitado_em)}
                  </Text>
                )}

                <View style={styles.actions}>
                  <Pressable
                    style={[styles.button, styles.approveButton, isActing && styles.disabled]}
                    onPress={() => handleApprove(res.docId)}
                    disabled={isActing}
                  >
                    <Text style={styles.buttonText}>Aprovar</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.button, styles.rejectButton, isActing && styles.disabled]}
                    onPress={() => openRejectModal(res.docId)}
                    disabled={isActing}
                  >
                    <Text style={styles.buttonText}>Rejeitar</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
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
              placeholderTextColor="#6b7280"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancelReject}
              >
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
    paddingTop: 56,
    paddingBottom: 16,
  },
  title: {
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 12,
  },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
  },
  centerInner: {
    alignItems: "center",
    marginTop: 12,
  },
  loadingText: {
    color: "#e5e7eb",
    marginTop: 12,
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
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#0b1224",
    gap: 6,
  },
  cardTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
  },
  cardLine: {
    color: "#cbd5e1",
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 12,
    backgroundColor: "#0b1224",
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    gap: 12,
  },
  modalTitle: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
  },
  modalInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    padding: 10,
    color: "#e5e7eb",
    backgroundColor: "#020617",
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
  },
});
