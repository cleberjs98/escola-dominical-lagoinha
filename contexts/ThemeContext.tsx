import React, { createContext, useContext, useMemo, useState, ReactNode } from "react";
import type {
  AppTheme,
  BackgroundSettings,
  LayoutSettings,
  NavigationTabConfig,
  ScreenLayoutConfig,
  ThemeSettings,
} from "../types/theme";
import { themeTokens } from "../theme/tokens";

type BackgroundMap = Record<string, BackgroundSettings | null>;

export interface ThemeContextValue {
  theme: AppTheme;
  settings: ThemeSettings | null;
  // Alias para compatibilidade com o nome antigo usado no app
  themeSettings: ThemeSettings | null;
  layoutSettings: LayoutSettings | null;
  backgrounds: BackgroundMap;
  navigationTabs: NavigationTabConfig[];
  screenLayouts: ScreenLayoutConfig[];
  isThemeLoading: boolean;
  reloadTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const defaultLayout: LayoutSettings = {
  id: "default",
  espacamento_xs: 4,
  espacamento_sm: 8,
  espacamento_md: 12,
  espacamento_lg: 16,
  espacamento_xl: 20,
  espacamento_xxl: 24,
  escala_fonte: 1,
  raio_borda: 12,
  intensidade_sombra: 1,
  estilo_card: "padrao",
  padding_componente: 12,
  ativo: true,
  created_at: null,
  updated_at: null,
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeSettings] = useState<ThemeSettings | null>({
    cor_primaria: themeTokens.colors.primary,
    cor_secundaria: themeTokens.colors.surface2,
    cor_fundo: themeTokens.colors.background,
    cor_texto: themeTokens.colors.textPrimary,
    cor_texto_secundario: themeTokens.colors.textSecondary,
    cor_sucesso: themeTokens.colors.primary,
    cor_erro: themeTokens.colors.danger,
    cor_aviso: themeTokens.colors.primary,
    cor_info: themeTokens.colors.primary,
    id: "lagoinha-fixed",
    ativo: true,
  } as ThemeSettings);
  const [theme] = useState<AppTheme>({
    colors: {
      background: themeTokens.colors.background,
      card: themeTokens.colors.surface,
      primary: themeTokens.colors.primary,
      secondary: themeTokens.colors.surface2,
      text: themeTokens.colors.textPrimary,
      accent: themeTokens.colors.white,
      tabBarBackground: themeTokens.colors.tabBarBg,
      tabBarActive: themeTokens.colors.tabActive,
      tabBarInactive: themeTokens.colors.tabInactive,
      border: themeTokens.colors.border,
      muted: themeTokens.colors.muted,
      status: {
        successBg: themeTokens.status.publicada.bg,
        successText: themeTokens.status.publicada.text,
        infoBg: themeTokens.status.disponivel.bg,
        infoText: themeTokens.status.disponivel.text,
        warningBg: themeTokens.status.pendente.bg,
        warningText: themeTokens.status.pendente.text,
        dangerBg: themeTokens.colors.danger,
        dangerText: themeTokens.colors.onDanger,
      },
      buttons: {
        primaryBg: themeTokens.colors.primary,
        primaryText: themeTokens.colors.onPrimary,
        secondaryBg: "transparent",
        secondaryText: themeTokens.colors.white,
      },
    },
    background: {
      type: "none",
      enabled: false,
    },
  });
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings | null>(defaultLayout);
  const [backgrounds] = useState<BackgroundMap>({});
  const [navigationTabs] = useState<NavigationTabConfig[]>([]);
  const [screenLayouts] = useState<ScreenLayoutConfig[]>([]);
  const [isThemeLoading] = useState<boolean>(false);

  const contextValue: ThemeContextValue = useMemo(
    () => ({
      theme,
      settings: themeSettings,
      themeSettings,
      layoutSettings,
      backgrounds,
      navigationTabs,
      screenLayouts,
      isThemeLoading,
      reloadTheme,
    }),
    [theme, themeSettings, layoutSettings, backgrounds, navigationTabs, screenLayouts, isThemeLoading]
  );

  async function reloadTheme() {
    // Tema é fixo; mantemos assinatura para compatibilidade
    return Promise.resolve();
  }

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext deve ser usado dentro de ThemeProvider");
  }
  return ctx;
}
