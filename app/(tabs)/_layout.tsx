import { useEffect, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { firebaseDb } from "../../lib/firebase";
import type { AppTheme } from "../../types/theme";

/* Ajustes fase de testes - Home, notificacoes, gestao de papeis e permissoes */

export default function TabsLayout() {
  const router = useRouter();
  const { theme: appTheme } = useTheme();
  const styles = createStyles(appTheme);
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

  const MenuItem = ({
    label,
    onPress,
    color,
    borderColor,
  }: {
    label: string;
    onPress: () => void;
    color?: string;
    borderColor?: string;
  }) => (
    <Pressable
      style={[styles.menuItem, borderColor ? { borderBottomColor: borderColor } : null]}
      onPress={onPress}
    >
      <Text style={[styles.menuItemText, color ? { color } : null]}>{label}</Text>
    </Pressable>
  );

  return (
    <>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: true,
          headerStyle: { backgroundColor: withAlpha(appTheme.colors.tabBarBackground, 0.78) },
          headerTintColor: appTheme.colors.text,
          headerTitleStyle: { color: appTheme.colors.text },
          headerRight: () => (
            <Pressable style={styles.menuButton} onPress={() => setMenuOpen(true)}>
              <Ionicons name="menu" size={22} color={appTheme.colors.text} />
            </Pressable>
          ),
          tabBarActiveTintColor: appTheme.colors.tabBarActive,
          tabBarInactiveTintColor: appTheme.colors.tabBarInactive,
          tabBarStyle: {
            backgroundColor: withAlpha(appTheme.colors.tabBarBackground, 0.78),
            borderTopColor: appTheme.colors.border || appTheme.colors.tabBarBackground,
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
                headerTitle: "Devocional",
                tabBarLabel: "Devocional",
              }}
            />
            <Tabs.Screen
              name="lessons/index"
              options={{
                title: "Aulas",
                headerTitle: "Aulas",
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
                backgroundColor: appTheme.colors.card,
                borderLeftColor: appTheme.colors.border || "#3B1C24",
              },
            ]}
          >
            <Text style={[styles.drawerTitle, { color: appTheme.colors.text }]}>Menu</Text>
            {buildMenuItems().map((item) => (
              <MenuItem
                key={item.label}
                label={item.label}
                color={appTheme.colors.text}
                borderColor={appTheme.colors.border}
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

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
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
      backgroundColor: theme.colors.card,
      padding: 16,
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.border || theme.colors.tabBarBackground,
      gap: 10,
    },
    drawerTitle: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 8,
    },
    menuItem: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border || theme.colors.tabBarBackground,
    },
    menuItemText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
  });
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#") && (color.length === 7 || color.length === 9)) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
