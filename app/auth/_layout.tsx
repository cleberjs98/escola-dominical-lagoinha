import { Stack } from "expo-router";

import { useTheme } from "../../hooks/useTheme";
import { buildStackHeaderOptions } from "../utils/navigation";

export default function AuthLayout() {
  const { theme } = useTheme();

  return (
    <Stack screenOptions={buildStackHeaderOptions(theme)}>
      <Stack.Screen name="login" options={{ title: "Entrar" }} />
      <Stack.Screen name="register" options={{ title: "Criar conta" }} />
      <Stack.Screen name="forgot-password" options={{ title: "Recuperar senha" }} />
      <Stack.Screen name="change-password" options={{ title: "Alterar senha" }} />
      <Stack.Screen name="pending" options={{ title: "Perfil pendente" }} />
      <Stack.Screen name="complete-profile" options={{ title: "Completar perfil" }} />
    </Stack>
  );
}
