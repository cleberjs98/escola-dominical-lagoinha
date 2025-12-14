import { Stack } from "expo-router";

import { useTheme } from "../../hooks/useTheme";
import { buildStackHeaderOptions } from "../utils/navigation";

export default function ProfileLayout() {
  const { theme } = useTheme();

  return (
    <Stack screenOptions={buildStackHeaderOptions(theme)}>
      <Stack.Screen name="index" options={{ title: "Meu perfil" }} />
    </Stack>
  );
}
