import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const STORAGE_KEY = "pwa-install-banner-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as any;
  return Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches || nav?.standalone);
}

function isIosBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod");
}

export function PWAInstallBanner() {
  const { theme } = useTheme();
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const dismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
    const ios = isIosBrowser();
    const installed = isStandalone();

    setIsIos(ios);
    if (installed) return;
    if (ios && !dismissed) {
      setVisible(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      promptEventRef.current = event as BeforeInstallPromptEvent;
      setHasPrompt(true);
      if (!dismissed) {
        setVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setVisible(false);
      setHasPrompt(false);
      promptEventRef.current = null;
      window.localStorage.setItem(STORAGE_KEY, "1");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const dismiss = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
    setVisible(false);
  };

  const handleInstall = async () => {
    const promptEvent = promptEventRef.current;
    if (promptEvent) {
      await promptEvent.prompt();
      const result = await promptEvent.userChoice.catch(() => null);
      if (result?.outcome === "accepted") {
        setVisible(false);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, "1");
        }
      }
      promptEventRef.current = null;
      setHasPrompt(false);
      return;
    }

    // iOS fallback: show hint and allow dismiss
    dismiss();
  };

  if (!visible || Platform.OS !== "web") {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border || theme.colors.tabBarBackground,
        },
      ]}
    >
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Instale o app</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Adicione o atalho à tela inicial para abrir mais rápido.
        </Text>
        {isIos ? (
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>No iOS, toque em Compartilhar e escolha "Adicionar à Tela de Início".</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleInstall}
        >
          <Text style={[styles.primaryText, { color: theme.colors.buttons?.primaryText || theme.colors.accent }]}>
            {hasPrompt ? "Instalar" : isIos ? "Ok, entendi" : "Instalar"}
          </Text>
        </Pressable>
        <Pressable style={styles.dismissButton} onPress={dismiss}>
          <Text style={[styles.dismissText, { color: theme.colors.textSecondary }]}>Agora não</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  primaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryText: {
    fontSize: 14,
    fontWeight: "700",
  },
  dismissButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 8,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
