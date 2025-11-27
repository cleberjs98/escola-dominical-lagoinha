import { useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../hooks/useAuth";

function TabIcon({ label }: { label: string }) {
  return <Text style={{ color: "#e5e7eb", fontSize: 12 }}>{label}</Text>;
}

export default function TabsLayout() {
  const router = useRouter();
  const { user } = useAuth();
  const papel = user?.papel || "aluno";
  const [menuOpen, setMenuOpen] = useState(false);

  const canSeeNews = ["professor", "coordenador", "administrador"].includes(papel);
  const canSeeManage = ["coordenador", "administrador"].includes(papel);
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
              <Text style={styles.menuText}>☰</Text>
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
            tabBarIcon: () => <TabIcon label="📚" />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: () => <TabIcon label="🏠" />,
          }}
        />
        <Tabs.Screen
          name="devotionals"
          options={{
            title: "Devocionais",
            tabBarIcon: () => <TabIcon label="📖" />,
          }}
        />
      </Tabs>

      {menuOpen && (
        <View style={styles.menuOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
          <View style={styles.drawer}>
            <Text style={styles.drawerTitle}>Menu</Text>
            <MenuItem label="Perfil" onPress={() => handleNavigate("/(tabs)/profile")} />
            {canSeeNews && (
              <MenuItem label="Notícias" onPress={() => handleNavigate("/(tabs)/news")} />
            )}
            <MenuItem label="Notificações" onPress={() => handleNavigate("/notifications")} />
            {canSeeManage && (
              <MenuItem label="Gerenciar" onPress={() => handleNavigate("/(tabs)/manage")} />
            )}
            {isAdmin && (
              <MenuItem label="Dashboard Admin" onPress={() => handleNavigate("/admin/dashboard")} />
            )}
            {canSeeManage && (
              <>
                <MenuItem
                  label="Aprovar usuários"
                  onPress={() => handleNavigate("/manager/pending-users")}
                />
                <MenuItem
                  label="Aprovar reservas"
                  onPress={() => handleNavigate("/manager/pending-reservations")}
                />
              </>
            )}
            <MenuItem label="Minhas notícias" onPress={() => handleNavigate("/news/my-news")} />
            <MenuItem label="Criar notícia" onPress={() => handleNavigate("/news/new")} />
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
});
