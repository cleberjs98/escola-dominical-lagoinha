import { useEffect } from "react";
import { Redirect, useRouter } from "expo-router";
import { Alert } from "react-native";
import { useAuth } from "../../../hooks/useAuth";

export default function NewsTabEntry() {
  const { firebaseUser, user, isInitializing } = useAuth();
  const router = useRouter();
  const papel = user?.papel || "aluno";
  const allowed = ["professor", "coordenador", "administrador"].includes(papel);

  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      router.replace("/auth/login" as any);
    }
  }, [firebaseUser, isInitializing, router]);

  if (isInitializing) return null;
  if (!firebaseUser) return <Redirect href="/auth/login" />;
  if (!allowed) {
    Alert.alert("Sem permissão", "Você não tem acesso à área de notícias.");
    return <Redirect href="/(tabs)" />;
  }

  // Redireciona para "Minhas notícias" por enquanto
  return <Redirect href="/news/my-news" />;
}
