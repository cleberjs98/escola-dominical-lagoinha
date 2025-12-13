// app/auth/pending.tsx - tela de cadastro pendente
import { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { AppBackground } from "../../components/layout/AppBackground";
import type { AppTheme } from "../../types/theme";

export default function PendingScreen() {
  const router = useRouter();
  const { firebaseUser, isInitializing, isPending, signOut } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      router.replace("/auth/login");
    }
  }, [firebaseUser, isInitializing, router]);

  if (isInitializing) {
    return (
      <AppBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <View style={styles.container}>
        <Text style={styles.title}>Cadastro em analise</Text>
        <Text style={styles.subtitle}>
          Seu perfil esta com status "pendente". Nossa equipe vai revisar seus dados e liberar o acesso em breve.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>O que voce pode fazer agora?</Text>
          <Text style={styles.cardText}>
            - Aguarde a aprovacao do seu cadastro.{"\n"}- Verifique seu email para eventuais atualizacoes.{"\n"}- Caso
            precise corrigir algo, entre em contato com a coordenacao.
          </Text>

          <Pressable style={styles.button} onPress={signOut}>
            <Text style={styles.buttonText}>Sair da conta</Text>
          </Pressable>
        </View>

        {!isPending && (
          <Pressable style={styles.secondaryButton} onPress={() => router.replace("/")}>
            <Text style={styles.secondaryButtonText}>Voltar para o inicio</Text>
          </Pressable>
        )}
      </View>
    </AppBackground>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 96,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      color: theme.colors.text,
      marginTop: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.muted || theme.colors.text,
      lineHeight: 20,
      marginBottom: 24,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 16,
      padding: 16,
      backgroundColor: theme.colors.card,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
    },
    cardText: {
      color: theme.colors.muted || theme.colors.text,
      lineHeight: 20,
      marginBottom: 16,
    },
    button: {
      backgroundColor: theme.colors.status?.dangerBg || theme.colors.primary,
      paddingVertical: 12,
      borderRadius: 999,
      alignItems: "center",
    },
    buttonText: {
      color: theme.colors.status?.dangerText || theme.colors.text,
      fontWeight: "700",
    },
    secondaryButton: {
      marginTop: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 12,
      borderRadius: 999,
      alignItems: "center",
      backgroundColor: theme.colors.card,
    },
    secondaryButtonText: {
      color: theme.colors.text,
      fontWeight: "700",
    },
  });
}
