import { useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

/* Ajustes fase de testes - Home, notificacoes, gestao de papeis e permissoes */

export default function TabsLayout() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: "#0f1521" },
          headerTintColor: "#e5e7eb",
          headerRight: () => (
            <Pressable style={styles.menuButton} onPress={() => setMenuOpen(true)}>
              <Ionicons name="menu" size={22} color="#e5e7eb" />
            </Pressable>
          ),
          tabBarActiveTintColor: "#00ff7f",
          tabBarInactiveTintColor: "#aaa",
          tabBarStyle: {
            backgroundColor: "#0f1521",
            borderTopColor: "#1d2738",
            height: 60,
            paddingBottom: 6,
          },
        }}
      >
        <Tabs.Screen
          name="lessons/index"
          options={{
            title: "Aulas",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="book-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="devotionals/index"
          options={{
            title: "Devocional",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="heart-outline" size={size} color={color} />
            ),
          }}
        />

        {/* Oculta rotas adicionais da tab bar (acesso via menu/desvios internos) */}
        <Tabs.Screen
          name="news/index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="manage/index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {menuOpen ? (
        <View style={styles.menuOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
          <View style={styles.drawer}>
            <Text style={styles.drawerTitle}>Menu</Text>
            <MenuItem label="Perfil" onPress={() => handleNavigate("/(tabs)/profile")} />
            <MenuItem label="Notificacoes" onPress={() => handleNavigate("/notifications")} />
            <MenuItem label="Noticias" onPress={() => handleNavigate("/(tabs)/news")} />
            <MenuItem label="Gerenciar" onPress={() => handleNavigate("/(tabs)/manage")} />
            <MenuItem label="Minhas noticias" onPress={() => handleNavigate("/news/my-news")} />
            <MenuItem label="Criar noticia" onPress={() => handleNavigate("/news/new")} />
            <MenuItem label="Aprovar usuarios" onPress={() => handleNavigate("/manager/pending-users")} />
            <MenuItem label="Aprovar reservas" onPress={() => handleNavigate("/manager/pending-reservations")} />
            <MenuItem label="Dashboard Admin" onPress={() => handleNavigate("/admin/dashboard")} />
          </View>
        </View>
      ) : null}
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
