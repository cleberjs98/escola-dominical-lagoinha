import { Stack } from "expo-router";

import { useTheme } from "../../hooks/useTheme";
import { buildStackHeaderOptions } from "../utils/navigation";

export default function ManageLayout() {
  const { theme } = useTheme();

  return (
    <Stack screenOptions={buildStackHeaderOptions(theme)}>
      <Stack.Screen name="users" options={{ title: "Gestão de usuários" }} />
      <Stack.Screen name="user-roles" options={{ title: "Papéis e permissões" }} />
    </Stack>
  );
}
