import { Stack } from "expo-router";

import { useTheme } from "../../hooks/useTheme";
import { buildStackHeaderOptions } from "../utils/navigation";

export default function ManagerLayout() {
  const { theme } = useTheme();

  return (
    <Stack screenOptions={buildStackHeaderOptions(theme)}>
      <Stack.Screen name="pending-users" options={{ title: "Aprovar usuários" }} />
      <Stack.Screen name="pending-reservations" options={{ title: "Aprovar reservas" }} />
      <Stack.Screen name="dashboard/index" options={{ title: "Dashboard gestor" }} />
    </Stack>
  );
}
