import { Stack } from "expo-router";

import { useTheme } from "../../hooks/useTheme";
import { buildStackHeaderOptions } from "../utils/navigation";

export default function AdminLayout() {
  const { theme } = useTheme();

  return (
    <Stack screenOptions={buildStackHeaderOptions(theme)}>
      <Stack.Screen name="users" options={{ title: "Usuários" }} />
      <Stack.Screen name="pending-users" options={{ title: "Aprovar usuários" }} />
      <Stack.Screen name="dashboard/index" options={{ title: "Dashboard Admin" }} />
      <Stack.Screen name="devotionals/index" options={{ title: "Devocionais (Admin)" }} />
      <Stack.Screen name="devotionals/new" options={{ title: "Criar devocional" }} />
      <Stack.Screen name="devotionals/[devotionalId]" options={{ title: "Detalhes do devocional" }} />
      <Stack.Screen name="lessons/new" options={{ title: "Criar aula" }} />
      <Stack.Screen name="lessons/[lessonId]" options={{ title: "Detalhes da aula" }} />
      <Stack.Screen name="layout/index" options={{ title: "Layout atual" }} />
      <Stack.Screen name="layouts/index" options={{ title: "Layouts salvos" }} />
      <Stack.Screen name="navigation/index" options={{ title: "Navegação" }} />
      <Stack.Screen name="backgrounds/index" options={{ title: "Planos de fundo" }} />
      <Stack.Screen name="theme/index" options={{ title: "Tema" }} />
    </Stack>
  );
}
