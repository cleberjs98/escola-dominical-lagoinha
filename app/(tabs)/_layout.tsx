import { createContext, useEffect, useMemo, useState, useContext } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { firebaseDb } from "../../lib/firebase";
import type { AppTheme } from "../../types/theme";

/* Ajustes fase de testes - Home, notificacoes, gestao de papeis e permissoes */

type TabsMenuContextValue = {
  openMenu: () => void;
};

const TabsMenuContext = createContext<TabsMenuContextValue | undefined>(undefined);
const BASE_TAB_HEIGHT = 58;

export function useTabsMenu(): TabsMenuContextValue {
  const ctx = useContext(TabsMenuContext);
  if (!ctx) {
    throw new Error("useTabsMenu must be used within TabsLayout");
  }
  return ctx;
}

export default function TabsLayout() {
  const router = useRouter();
  const { theme: appTheme } = useTheme();
  const insets = useSafeAreaInsets();
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

  const openMenu = useMemo(() => ({ openMenu: () => setMenuOpen(true) }), []);

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
  const rolePriority = isAdmin
    ? "admin"
    : isCoordinator
      ? "coordinator"
      : isProfessor
        ? "professor"
        : isStudent
          ? "student"
          : "member";

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
    <TabsMenuContext.Provider value={openMenu}>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: appTheme.colors.tabBarActive,
          tabBarInactiveTintColor: appTheme.colors.tabBarInactive,
          tabBarStyle: {
            backgroundColor: withAlpha(appTheme.colors.tabBarBackground, 0.78),
            borderTopColor: appTheme.colors.border || appTheme.colors.tabBarBackground,
            height: BASE_TAB_HEIGHT + (insets.bottom || 0),
            paddingBottom: Math.max(insets.bottom || 0, 8),
            paddingTop: 6,
          },
          tabBarLabel:
            route.name === "(home)"
              ? "Home"
              : route.name === "lessons"
                ? "Aulas"
                : route.name === "devotionals"
                  ? "Devocional"
                  : undefined,
          tabBarIcon: ({ focused, color, size }) => {
            const iconSize = size ?? 22;
            if (route.name === "(home)") {
              return (
                <MaterialCommunityIcons
                  name={focused ? "home" : "home-outline"}
                  size={iconSize}
                  color={color}
                />
              );
            }
            if (route.name === "lessons") {
              return (
                <MaterialCommunityIcons
                  name={focused ? "book-open-page-variant" : "book-outline"}
                  size={iconSize}
                  color={color}
                />
              );
            }
            if (route.name === "devotionals") {
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
          name="(home)"
          options={{
            tabBarLabel: "Home",
          }}
        />

        {lessonsTabFirst ? (
          <>
            <Tabs.Screen
              name="lessons"
              options={{
                href: "lessons/index",
                tabBarLabel: "Aulas",
              }}
            />
            <Tabs.Screen
              name="devotionals"
              options={{
                href: "devotionals/index",
                tabBarLabel: "Devocional",
              }}
            />
          </>
        ) : (
          <>
            <Tabs.Screen
              name="devotionals"
              options={{
                href: "devotionals/index",
                tabBarLabel: "Devocional",
              }}
            />
            <Tabs.Screen
              name="lessons"
              options={{
                href: "lessons/index",
                tabBarLabel: "Aulas",
              }}
            />
          </>
        )}

        {/* Oculta rotas adicionais da tab bar (acesso via menu/desvios internos) */}
        <Tabs.Screen
          name="manage"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile"
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
    </TabsMenuContext.Provider>
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
    const logout = { label: "Sair", action: handleLogout };
    const baseAcademic = [
      { label: "Meu Perfil", path: "/(tabs)/profile" },
      { label: "Aulas", path: "/(tabs)/lessons" },
      { label: "Devocionais", path: "/(tabs)/devotionals" },
      { label: "Avisos", path: "/avisos" },
    ];

    if (rolePriority === "admin") {
      return [
        { label: "Meu Perfil", path: "/(tabs)/profile" },
        { label: "Notificacoes", path: "/notifications" },
        { label: "Gestao de usuarios", path: "/manage/users" },
        logout,
      ];
    }

    if (rolePriority === "coordinator") {
      return [
        { label: "Meu Perfil", path: "/(tabs)/profile" },
        { label: "Notificacoes", path: "/notifications" },
        { label: "Gestao de usuarios", path: "/manage/users" },
        logout,
      ];
    }

    if (rolePriority === "professor") {
      return [
        { label: "Meu Perfil", path: "/(tabs)/profile" },
        { label: "Criar aviso", path: "/avisos/new" },
        { label: "Aprovar usuarios", path: "/manager/pending-users" },
        logout,
      ];
    }

    if (rolePriority === "student") {
      return [
        { label: "Meu Perfil", path: "/(tabs)/profile" },
        { label: "Avisos", path: "/avisos" },
        logout,
      ];
    }

    return [
      { label: "Meu Perfil", path: "/(tabs)/profile" },
      { label: "Avisos", path: "/avisos" },
      ...(canCreateAviso ? [{ label: "Criar aviso", path: "/avisos/new" }] : []),
      { label: "Notificacoes", path: "/notifications" },
      ...(isCoordinatorOrAdmin
        ? [
            { label: "Gerenciar", path: "/(tabs)/manage" },
            { label: "Gestao de usuarios", path: "/manage/users" },
          ]
        : []),
      logout,
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
