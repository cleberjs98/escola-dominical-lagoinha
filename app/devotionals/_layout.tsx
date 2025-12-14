import { Stack } from "expo-router";

import { useTheme } from "../../hooks/useTheme";
import { buildStackHeaderOptions } from "../utils/navigation";

export default function DevotionalsLayout() {
  const { theme } = useTheme();

  return (
    <Stack screenOptions={buildStackHeaderOptions(theme)}>
      <Stack.Screen name="index" options={{ title: "Devocionais" }} />
      <Stack.Screen name="[devotionalId]" options={{ title: "Devocional" }} />
    </Stack>
  );
}
