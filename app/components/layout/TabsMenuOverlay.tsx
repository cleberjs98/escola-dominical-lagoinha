import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions, Platform } from "react-native";

import { useTheme } from "../../../hooks/useTheme";
import { useAuth } from "../../../hooks/useAuth";

export type TabsMenuOverlayProps = {
  onClose: () => void;
  navigate: (path: string) => void;
};

export function TabsMenuOverlay({ onClose, navigate }: TabsMenuOverlayProps) {
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const { width: screenWidth } = useWindowDimensions();

  const papel = user?.papel;
  const canCreateAviso = papel === "professor" || papel === "coordenador" || papel === "administrador";
  const isCoordinatorOrAdmin = papel === "coordenador" || papel === "administrador" || papel === "admin";
  const isStudent = papel === "aluno";
  const isProfessor = papel === "professor";
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

  const baseWidth = Platform.OS === "web" ? 360 : 420;
  const drawerWidth = Math.min(screenWidth * 0.5, baseWidth);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const logout = async () => {
    try {
      await signOut?.();
      onClose();
      navigate("/auth/login" as any);
    } catch (err) {
      console.error("Erro ao sair:", err);
    }
  };

  const menuItems: { label: string; path?: string; action?: () => void }[] = (() => {
    const logoutItem = { label: "Sair", action: logout };

    if (rolePriority === "admin") {
      return [
        { label: "Meu Perfil", path: "/(tabs)/profile" },
        { label: "Notificacoes", path: "/notifications" },
        { label: "Gestao de usuarios", path: "/manage/users" },
        logoutItem,
      ];
    }

    if (rolePriority === "coordinator") {
      return [
        { label: "Meu Perfil", path: "/(tabs)/profile" },
        { label: "Notificacoes", path: "/notifications" },
        { label: "Gestao de usuarios", path: "/manage/users" },
        logoutItem,
      ];
    }

    if (rolePriority === "professor") {
      return [
        { label: "Meu Perfil", path: "/(tabs)/profile" },
        { label: "Criar aviso", path: "/avisos/new" },
        { label: "Aprovar usuarios", path: "/manager/pending-users" },
        logoutItem,
      ];
    }

    if (rolePriority === "student") {
      return [
        { label: "Meu Perfil", path: "/(tabs)/profile" },
        { label: "Avisos", path: "/avisos" },
        logoutItem,
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
      logoutItem,
    ];
  })();

  const handleNavigate = (path?: string, action?: () => void) => {
    onClose();
    if (path) navigate(path);
    if (action) action();
  };

  return (
    <View style={styles.menuOverlay}>
      <View style={styles.bgFull}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.drawer,
            {
              backgroundColor: theme.colors.card,
              borderLeftColor: theme.colors.border || "#3B1C24",
              width: drawerWidth,
            },
          ]}
        >
          <Text style={[styles.drawerTitle, { color: theme.colors.text }]}>Menu</Text>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              style={[styles.menuItem, { borderBottomColor: theme.colors.border || theme.colors.tabBarBackground }]}
              onPress={() => handleNavigate(item.path, item.action)}
            >
              <Text style={[styles.menuItemText, { color: theme.colors.text }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    menuOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 999,
      backgroundColor: "transparent",
    },
    bgFull: {
      flex: 1,
      backgroundColor: "transparent",
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
    },
    menuItemText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
  });
}
