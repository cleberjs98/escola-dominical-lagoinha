import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { Pressable } from "react-native";

import { useTabsMenu } from "../_layout";
import { useTheme } from "../../../hooks/useTheme";
import { buildStackHeaderOptions } from "../../utils/navigation";

export default function ProfileTabsLayout() {
  const { theme } = useTheme();
  const { openMenu } = useTabsMenu();

  return (
    <Stack
      screenOptions={{
        ...buildStackHeaderOptions(theme),
        headerRight: () => (
          <Pressable style={{ paddingHorizontal: 12, paddingVertical: 8 }} onPress={openMenu}>
            <Ionicons name="menu" size={22} color={theme.colors.text} />
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: "Meu perfil" }} />
    </Stack>
  );
}
