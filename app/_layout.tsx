import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#020617" }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#020617" },
          headerTintColor: "#e5e7eb",
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: "#020617" },
        }}
      />
    </View>
  );
}
