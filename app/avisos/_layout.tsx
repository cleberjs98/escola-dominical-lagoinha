import { Stack } from "expo-router";

import { useTheme } from "../../hooks/useTheme";
import { buildStackHeaderOptions } from "../utils/navigation";

export default function AvisosLayout() {
  const { theme } = useTheme();

  return (
    <Stack screenOptions={buildStackHeaderOptions(theme)}>
      <Stack.Screen name="index" options={{ title: "Avisos" }} />
      <Stack.Screen name="new" options={{ title: "Criar aviso" }} />
      <Stack.Screen name="edit/[avisoId]" options={{ title: "Detalhes do aviso" }} />
    </Stack>
  );
}
