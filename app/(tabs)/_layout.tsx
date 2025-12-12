import { useEffect, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { firebaseDb } from "../../lib/firebase";

/* Ajustes fase de testes - Home, notificacoes, gestao de papeis e permissoes */

export default function TabsLayout() {
  const router = useRouter();
  const { theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lessonsTabFirst, setLessonsTabFirst] = useState(true);
  const { user, signOut } = useAuth();
  const papel = user?.papel;
  const canCreateAviso =
    papel === "professor" || papel === "coordenador" || papel === "administrador";
  const isCoordinatorOrAdmin =
    papel === "coordenador" || papel === "administrador" || papel === "admin";
  const isStudent = papel === "aluno";
  const isProfessor = papel === "professor";
  useEffect(() => {
    void loadNavSettings();
  }, []);

  async function loadNavSettings() {
    try {
      const snap = await getDoc(doc(firebaseDb, "navigation_settings", "global"));
      if (snap.exists()) {
        setLessonsTabFirst(!!snap.data().lessonsTabFirst);
      }
    } catch (error) {
      console.warn("Navegacao padrao mantida (sem permissao ou sem config).", error);
    }
  }
  const isCoordinator = papel === "coordenador";
  const isAdmin = papel === "administrador" || papel === "admin";

  return (
    <>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.card },
          headerTintColor: theme.colors.text,
          headerRight: () => (
            <Pressable style={styles.menuButton} onPress={() => setMenuOpen(true)}>
              <Ionicons name="menu" size={22} color={theme.colors.text} />
            </Pressable>
          ),
          tabBarActiveTintColor: theme.colors.tabBarActive,
          tabBarInactiveTintColor: theme.colors.tabBarInactive,
          tabBarStyle: {
            backgroundColor: theme.colors.tabBarBackground,
            borderTopColor: theme.colors.tabBarBackground,
            height: 60,
            paddingBottom: 6,
          },
          tabBarLabel:
            route.name === "index"
              ? "Home"
              : route.name === "lessons/index"
                ? "Aulas"
                : route.name === "devotionals/index"
                  ? "Devocional"
                  : undefined,
          tabBarIcon: ({ focused, color, size }) => {
            const iconSize = size ?? 22;
            if (route.name === "index") {
              return (
                <MaterialCommunityIcons
                  name={focused ? "home" : "home-outline"}
                  size={iconSize}
                  color={color}
                />
              );
            }
            if (route.name === "lessons/index") {
              return (
                <MaterialCommunityIcons
                  name={focused ? "book-open-page-variant" : "book-outline"}
                  size={iconSize}
                  color={color}
                />
              );
            }
            if (route.name === "devotionals/index") {
              return (
                <MaterialCommunityIcons
                  name={focused ? "heart" : "heart-outline"}
                  size={iconSize}
                  color={color}
                />
              );
            }
            return <MaterialCommunityIcons name="dots-horizontal" size={iconSize} color={color} />;
          },
        })}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarLabel: "Home",
          }}
        />

        {lessonsTabFirst ? (
          <>
            <Tabs.Screen
              name="lessons/index"
              options={{
                title: "Aulas",
                headerTitle: "Aulas",
                tabBarLabel: "Aulas",
              }}
            />
            <Tabs.Screen
              name="devotionals/index"
              options={{
                title: "Devocionais",
                headerTitle: "Devocionais",
                tabBarLabel: "Devocional",
              }}
            />
          </>
        ) : (
          <>
            <Tabs.Screen
              name="devotionals/index"
              options={{
                title: "Devocional",
                tabBarLabel: "Devocional",
              }}
            />
            <Tabs.Screen
              name="lessons/index"
              options={{
                title: "Aulas",
                tabBarLabel: "Aulas",
              }}
            />
          </>
        )}

        {/* Oculta rotas adicionais da tab bar (acesso via menu/desvios internos) */}
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
          <View
            style={[
              styles.drawer,
              {
                backgroundColor: theme.colors.primaryDark,
                borderLeftColor: theme.colors.border || "#3B1C24",
              },
            ]}
          >
            <Text style={[styles.drawerTitle, { color: theme.colors.text }]}>Menu</Text>
            {buildMenuItems().map((item) => (
              <MenuItem
                key={item.label}
                label={item.label}
                onPress={() => {
                  setMenuOpen(false);
                  if (item.path) handleNavigate(item.path);
                  if (item.action) item.action();
                }}
              />
            ))}
          </View>
        </View>
      ) : null}
    </>
  );

  function handleNavigate(path: string) {
    setMenuOpen(false);
    router.push(path as any);
  }

  async function handleLogout() {
    try {
      setMenuOpen(false);
      await signOut?.();
      router.replace("/auth/login" as any);
    } catch (err) {
      console.error("Erro ao sair:", err);
    }
  }

  function buildMenuItems(): { label: string; path?: string; action?: () => void }[] {
    if (isCoordinator || isAdmin) {
      return [
        { label: "Meu Perfil", path: "/(tabs)/profile" },
        { label: "Aulas", path: "/(tabs)/lessons" },
        { label: "Devocionais", path: "/(tabs)/devotionals" },
        { label: "Avisos", path: "/avisos" },
        { label: "Aprovar usuarios", path: "/manager/pending-users" },
        { label: "Aprovar reservas", path: "/manager/pending-reservations" },
        { label: "Sair", action: handleLogout },
      ];
    }

    if (isProfessor) {
      return [
        { label: "Meu perfil", path: "/(tabs)/profile" },
        { label: "Criar aviso", path: "/avisos/new" },
        { label: "Aprovar usuarios", path: "/manager/pending-users" },
        { label: "Sair", action: handleLogout },
      ];
    }

    if (isStudent) {
      return [
        { label: "Perfil", path: "/(tabs)/profile" },
        { label: "Avisos", path: "/avisos" },
        { label: "Sair", action: handleLogout },
      ];
    }

    return [
      { label: "Perfil", path: "/(tabs)/profile" },
      { label: "Avisos", path: "/avisos" },
      { label: "Notificacoes", path: "/notifications" },
      ...(canCreateAviso ? [{ label: "Criar aviso", path: "/avisos/new" }] : []),
      { label: "Gerenciar", path: "/(tabs)/manage" },
      ...(isCoordinatorOrAdmin ? [{ label: "Gestao de usuarios", path: "/manage/users" }] : []),
      { label: "Aprovar usuarios", path: "/manager/pending-users" },
      { label: "Aprovar reservas", path: "/manager/pending-reservations" },
      { label: "Dashboard Admin", path: "/admin/dashboard" },
      { label: "Sair", action: handleLogout },
    ];
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
