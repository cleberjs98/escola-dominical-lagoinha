import React, { createContext, useContext, useMemo, useState, ReactNode } from "react";
import type {
  AppTheme,
  BackgroundSettings,
  LayoutSettings,
  NavigationTabConfig,
  ScreenLayoutConfig,
  ThemeSettings,
} from "../types/theme";
import { bordoTheme, legacyThemeSettings } from "../theme/colors";

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
    ...legacyThemeSettings,
    id: "lagoinha-fixed",
    ativo: true,
  } as ThemeSettings);
  const [theme] = useState<AppTheme>({
    colors: {
      background: bordoTheme.background,
      card: bordoTheme.surface,
      primary: bordoTheme.surface,
      secondary: bordoTheme.surfaceAlt,
      text: bordoTheme.textPrimary,
      accent: bordoTheme.accent,
      tabBarBackground: bordoTheme.tabBackground,
      tabBarActive: bordoTheme.tabActive,
      tabBarInactive: bordoTheme.tabInactive,
      border: bordoTheme.border,
      muted: bordoTheme.textMuted,
      status: {
        successBg: bordoTheme.statusSuccessBg,
        successText: bordoTheme.statusSuccessText,
        infoBg: bordoTheme.statusInfoBg,
        infoText: bordoTheme.statusInfoText,
        warningBg: bordoTheme.statusWarningBg,
        warningText: bordoTheme.statusWarningText,
        dangerBg: bordoTheme.statusDangerBg,
        dangerText: bordoTheme.statusDangerText,
      },
      buttons: {
        primaryBg: bordoTheme.buttonPrimaryBg,
        primaryText: bordoTheme.buttonPrimaryText,
        secondaryBg: bordoTheme.buttonSecondaryBg,
        secondaryText: bordoTheme.buttonSecondaryText,
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
