import { Stack } from "expo-router";

import { useTheme } from "../../hooks/useTheme";
import { buildStackHeaderOptions } from "../utils/navigation";

export default function LessonsLayout() {
  const { theme } = useTheme();

  return (
    <Stack screenOptions={buildStackHeaderOptions(theme)}>
      <Stack.Screen name="index" options={{ title: "Aulas" }} />
      <Stack.Screen name="[lessonId]" options={{ title: "Detalhes da aula" }} />
    </Stack>
  );
}
