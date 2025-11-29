import { useMemo, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../hooks/useAuth";

/* Ajustes fase de testes - Home, notificacoes, gestao de papeis e permissoes */

export default function TabsLayout() {
  const router = useRouter();
  const { user } = useAuth();
  const papel = user?.papel || "aluno";
  const [menuOpen, setMenuOpen] = useState(false);

  const canApproveUsers = useMemo(
    () => ["professor", "coordenador", "administrador"].includes(papel),
    [papel]
  );
  const isAdmin = papel === "administrador";

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: "#0b1224" },
          headerTintColor: "#e5e7eb",
          headerRight: () => (
            <Pressable style={styles.menuButton} onPress={() => setMenuOpen(true)}>
              <Text style={styles.menuText}>≡</Text>
            </Pressable>
          ),
          tabBarStyle: { backgroundColor: "#0b1224", borderTopColor: "#1f2937" },
          tabBarActiveTintColor: "#22c55e",
          tabBarInactiveTintColor: "#9ca3af",
        }}
      >
        <Tabs.Screen
          name="lessons"
          options={{
            title: "Aulas",
            tabBarLabel: "Aulas",
            tabBarIcon: () => <Text style={styles.emoji}>📖</Text>,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarLabel: "Home",
            tabBarIcon: () => <Text style={styles.emoji}>🏠</Text>,
          }}
        />
        <Tabs.Screen
          name="devotionals"
          options={{
            title: "Devocional",
            tabBarLabel: "Devocional",
            tabBarIcon: () => <Text style={styles.emoji}>🙏🏼</Text>,
          }}
        />
      </Tabs>

      {menuOpen && (
        <View style={styles.menuOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
          <View style={styles.drawer}>
            <Text style={styles.drawerTitle}>Menu</Text>
            <MenuItem label="Perfil" onPress={() => handleNavigate("/(tabs)/profile")} />
            <MenuItem label="Notificacoes" onPress={() => handleNavigate("/notifications")} />
            <MenuItem label="Noticias" onPress={() => handleNavigate("/(tabs)/news")} />
            <MenuItem label="Gerenciar" onPress={() => handleNavigate("/(tabs)/manage")} />
            {/* Opcao de aprovacao de usuarios para professor, coordenador e administrador */}
            {canApproveUsers && (
              <MenuItem
                label="Aprovar usuarios"
                onPress={() => handleNavigate("/manager/pending-users")}
              />
            )}
            {isAdmin && (
              <MenuItem label="Dashboard Admin" onPress={() => handleNavigate("/admin/dashboard")} />
            )}
            <MenuItem label="Minhas noticias" onPress={() => handleNavigate("/news/my-news")} />
            <MenuItem label="Criar noticia" onPress={() => handleNavigate("/news/new")} />
          </View>
        </View>
      )}
    </>
  );

  function handleNavigate(path: string) {
    setMenuOpen(false);
    router.push(path as any);
  }
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuItemText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuText: {
    color: "#e5e7eb",
    fontSize: 18,
    fontWeight: "700",
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "72%",
    backgroundColor: "#0b1224",
    padding: 16,
    borderLeftWidth: 1,
    borderLeftColor: "#1f2937",
    gap: 10,
  },
  drawerTitle: {
    color: "#e5e7eb",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  menuItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  menuItemText: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "600",
  },
  emoji: {
    fontSize: 16,
  },
});
