import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getActiveLayoutSettings } from "../lib/theme";
import { getActiveBackgrounds, getActiveScreenLayouts, listActiveNavigationTabs } from "../lib/navigationSettings";
import { getMergedAppTheme, getThemeSettings } from "../lib/themeSettings";
import type {
  AppTheme,
  BackgroundSettings,
  LayoutSettings,
  NavigationTabConfig,
  ScreenLayoutConfig,
  ThemeSettings,
} from "../types/theme";

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

const STORAGE_KEYS = {
  theme: "theme_settings_active",
  layout: "layout_settings_active",
  backgrounds: "backgrounds_active",
  tabs: "navigation_tabs_active",
  screenLayouts: "screen_layouts_active",
};

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
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);
  const [theme, setTheme] = useState<AppTheme>(getMergedAppTheme(null));
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings | null>(defaultLayout);
  const [backgrounds, setBackgrounds] = useState<BackgroundMap>({});
  const [navigationTabs, setNavigationTabs] = useState<NavigationTabConfig[]>([]);
  const [screenLayouts, setScreenLayouts] = useState<ScreenLayoutConfig[]>([]);
  const [isThemeLoading, setIsThemeLoading] = useState<boolean>(true);

  // Carrega cache inicial
  useEffect(() => {
    void loadFromCache().finally(() => {
      // Em seguida, busca remoto
      void reloadTheme();
    });
  }, []);

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

  async function loadFromCache() {
    try {
      const [themeStr, layoutStr, bgStr, tabsStr, layoutsStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.theme),
        AsyncStorage.getItem(STORAGE_KEYS.layout),
        AsyncStorage.getItem(STORAGE_KEYS.backgrounds),
        AsyncStorage.getItem(STORAGE_KEYS.tabs),
        AsyncStorage.getItem(STORAGE_KEYS.screenLayouts),
      ]);

      if (themeStr) {
        const parsed: ThemeSettings = JSON.parse(themeStr);
        setThemeSettings(parsed);
        setTheme(getMergedAppTheme(parsed));
      }
      if (layoutStr) setLayoutSettings(JSON.parse(layoutStr));
      if (bgStr) {
        const arr: BackgroundSettings[] = JSON.parse(bgStr);
        setBackgrounds(mapBackgrounds(arr));
      }
      if (tabsStr) setNavigationTabs(JSON.parse(tabsStr));
      if (layoutsStr) setScreenLayouts(JSON.parse(layoutsStr));
    } catch (err) {
      console.error("Erro ao carregar tema do cache:", err);
    }
  }

  async function reloadTheme() {
    try {
      setIsThemeLoading(true);

      const [activeTheme, activeLayout, activeBgs, activeTabs, activeScreenLayouts] = await Promise.all([
        getThemeSettings(),
        getActiveLayoutSettings(),
        getActiveBackgrounds(),
        listActiveNavigationTabs(),
        getActiveScreenLayouts(),
      ]);

      if (activeTheme) {
        setThemeSettings(activeTheme);
        setTheme(getMergedAppTheme(activeTheme));
        await AsyncStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(activeTheme));
      } else {
        setThemeSettings(null);
        setTheme(getMergedAppTheme(null));
      }

      if (activeLayout) {
        setLayoutSettings(activeLayout);
        await AsyncStorage.setItem(STORAGE_KEYS.layout, JSON.stringify(activeLayout));
      }
      if (activeBgs) {
        setBackgrounds(mapBackgrounds(activeBgs));
        await AsyncStorage.setItem(STORAGE_KEYS.backgrounds, JSON.stringify(activeBgs));
      }
      if (activeTabs) {
        setNavigationTabs(activeTabs);
        await AsyncStorage.setItem(STORAGE_KEYS.tabs, JSON.stringify(activeTabs));
      }
      if (activeScreenLayouts) {
        setScreenLayouts(activeScreenLayouts);
        await AsyncStorage.setItem(STORAGE_KEYS.screenLayouts, JSON.stringify(activeScreenLayouts));
      }
    } catch (err) {
      const code = (err as any)?.code || "";
      const isPermission =
        code === "permission-denied" || String(err).toLowerCase().includes("missing or insufficient permissions");

      if (isPermission) {
        console.warn("Tema remoto nao lido: sem permissao. Usando default/cache.");
      } else {
        console.error("Erro ao carregar tema do Firestore:", err);
      }
    } finally {
      setIsThemeLoading(false);
    }
  }

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

function mapBackgrounds(arr: BackgroundSettings[]): BackgroundMap {
  const map: BackgroundMap = {};
  arr.forEach((bg) => {
    map[bg.secao] = bg;
  });
  return map;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext deve ser usado dentro de ThemeProvider");
  }
  return ctx;
}
