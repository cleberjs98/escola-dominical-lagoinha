import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "../../hooks/useAuth";

function TabIcon({ label }: { label: string }) {
  return <Text style={{ color: "#e5e7eb", fontSize: 12 }}>{label}</Text>;
}

export default function TabsLayout() {
  const { user } = useAuth();
  const papel = user?.papel || "aluno";

  const canSeeNews = ["professor", "coordenador", "administrador"].includes(papel);
  const canSeeManage = ["coordenador", "administrador"].includes(papel);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0b1224", borderTopColor: "#1f2937" },
        tabBarActiveTintColor: "#22c55e",
        tabBarInactiveTintColor: "#9ca3af",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: () => <TabIcon label="🏠" />,
        }}
      />
      <Tabs.Screen
        name="lessons/index"
        options={{
          title: "Aulas",
          tabBarIcon: () => <TabIcon label="📚" />,
        }}
      />
      <Tabs.Screen
        name="devotionals/index"
        options={{
          title: "Devocionais",
          tabBarIcon: () => <TabIcon label="📖" />,
        }}
      />
      {canSeeNews && (
        <Tabs.Screen
          name="news/index"
          options={{
            title: "Notícias",
            tabBarIcon: () => <TabIcon label="📰" />,
          }}
        />
      )}
      {canSeeManage && (
        <Tabs.Screen
          name="manage/index"
          options={{
            title: "Gerenciar",
            tabBarIcon: () => <TabIcon label="⚙️" />,
          }}
        />
      )}
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Perfil",
          tabBarIcon: () => <TabIcon label="👤" />,
        }}
      />
    </Tabs>
  );
}
