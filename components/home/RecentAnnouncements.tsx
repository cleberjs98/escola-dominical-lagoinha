import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { Aviso } from "../../types/aviso";
import { AppButton } from "../ui/AppButton";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  avisos: Aviso[];
  onPressAll: () => void;
};

export function RecentAnnouncements({ avisos, onPressAll }: Props) {
  const { theme } = useTheme();
  const bg = theme.colors.card;
  const border = theme.colors.border || theme.colors.card;

  const data = avisos.slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Avisos recentes</Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]} numberOfLines={1}>
            Comunicados para seu perfil.
          </Text>
        </View>
        <AppButton title="Ver todos" variant="outline" fullWidth={false} onPress={onPressAll} />
      </View>

      {data.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.muted }]}>Nenhum aviso no momento.</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => <AnnouncementCard aviso={item} />}
        />
      )}
    </View>
  );
}

function AnnouncementCard({ aviso }: { aviso: Aviso }) {
  const { theme } = useTheme();
  const colors: Record<Aviso["tipo"], string> = {
    informativo: theme.colors.text,
    urgente: theme.colors.status?.dangerBg || theme.colors.primary,
    interno: theme.colors.primary,
    espiritual: theme.colors.text,
  };
  const color = colors[aviso.tipo] || theme.colors.text;
  const text = theme.colors.text;
  const muted = theme.colors.muted || theme.colors.textSecondary || theme.colors.text;
  const summary = aviso.conteudo?.replace(/\s+/g, " ").trim();

  return (
    <View style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={styles.row}>
            <Ionicons
              name={aviso.tipo === "urgente" ? "alert-circle" : "megaphone-outline"}
              size={16}
              color={color}
            />
            <Text style={[styles.cardTitle, { color: text }]} numberOfLines={1}>
              {aviso.titulo}
            </Text>
          </View>
          <View style={[styles.pill, { borderColor: color, backgroundColor: `${color}22` }]}>
            <Text style={[styles.pillText, { color }]}>{destinoLabel(aviso.destino)}</Text>
          </View>
        </View>
        {summary ? (
          <Text style={[styles.cardSummary, { color: muted }]} numberOfLines={2}>
            {summary}
          </Text>
        ) : null}
        <Text style={[styles.cardMeta, { color: muted }]}>
          {aviso.criado_por_nome} - {formatRelative(aviso.criado_em)}
        </Text>
      </View>
    </View>
  );
}

function destinoLabel(destino: Aviso["destino"]) {
  switch (destino) {
    case "todos":
      return "Todos";
    case "alunos":
      return "Alunos";
    case "professores":
      return "Professores";
    case "coordenadores":
      return "Coordenadores";
    case "admin":
      return "Administradores";
    default:
      return destino;
  }
}

function formatRelative(value: any) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null;
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `ha ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  return `ha ${days}d`;
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
  },
  empty: {
    fontSize: 13,
  },
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  bar: {
    width: 6,
  },
  cardBody: {
    flex: 1,
    padding: 10,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardSummary: {
    fontSize: 13,
  },
  cardMeta: {
    fontSize: 12,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
