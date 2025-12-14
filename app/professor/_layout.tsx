import { Stack } from "expo-router";

import { useTheme } from "../../hooks/useTheme";
import { buildStackHeaderOptions } from "../utils/navigation";

export default function ProfessorLayout() {
  const { theme } = useTheme();

  return (
    <Stack screenOptions={buildStackHeaderOptions(theme)}>
      <Stack.Screen name="available-lessons" options={{ title: "Aulas disponíveis" }} />
      <Stack.Screen name="lesson-complement/[lessonId]" options={{ title: "Complementar aula" }} />
    </Stack>
  );
}
