import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getActiveLayoutSettings,
  getActiveThemeSettings,
} from "../lib/theme";
import {
  getActiveBackgrounds,
  getActiveScreenLayouts,
  listActiveNavigationTabs,
} from "../lib/navigationSettings";
import type {
  BackgroundSettings,
  LayoutSettings,
  NavigationTabConfig,
  ScreenLayoutConfig,
  ThemeSettings,
} from "../types/theme";

type BackgroundMap = Record<string, BackgroundSettings | null>;

export interface AppTheme {
  themeSettings: ThemeSettings | null;
  layoutSettings: LayoutSettings | null;
  backgrounds: BackgroundMap;
  navigationTabs: NavigationTabConfig[];
  screenLayouts: ScreenLayoutConfig[];
}

export interface ThemeContextValue extends AppTheme {
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

const defaultTheme: ThemeSettings = {
  id: "default",
  cor_primaria: "#22c55e",
  cor_secundaria: "#334155",
  cor_fundo: "#020617",
  cor_texto: "#e5e7eb",
  cor_texto_secundario: "#9ca3af",
  cor_sucesso: "#22c55e",
  cor_erro: "#ef4444",
  cor_aviso: "#f59e0b",
  cor_info: "#38bdf8",
  ativo: true,
  created_at: null as any,
  updated_at: null as any,
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
  created_at: null as any,
  updated_at: null as any,
};

const defaultContext: AppTheme = {
  themeSettings: defaultTheme,
  layoutSettings: defaultLayout,
  backgrounds: {},
  navigationTabs: [],
  screenLayouts: [],
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(
    defaultTheme
  );
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings | null>(
    defaultLayout
  );
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
      themeSettings,
      layoutSettings,
      backgrounds,
      navigationTabs,
      screenLayouts,
      isThemeLoading,
      reloadTheme,
    }),
    [themeSettings, layoutSettings, backgrounds, navigationTabs, screenLayouts, isThemeLoading]
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

      if (themeStr) setThemeSettings(JSON.parse(themeStr));
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

      const [
        activeTheme,
        activeLayout,
        activeBgs,
        activeTabs,
        activeScreenLayouts,
      ] = await Promise.all([
        getActiveThemeSettings(),
        getActiveLayoutSettings(),
        getActiveBackgrounds(),
        listActiveNavigationTabs(),
        getActiveScreenLayouts(),
      ]);

      if (activeTheme) {
        setThemeSettings(activeTheme);
        await AsyncStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(activeTheme));
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
        await AsyncStorage.setItem(
          STORAGE_KEYS.screenLayouts,
          JSON.stringify(activeScreenLayouts)
        );
      }
    } catch (err) {
      const code = (err as any)?.code || "";
      const isPermission =
        code === "permission-denied" ||
        String(err).toLowerCase().includes("missing or insufficient permissions");

      if (isPermission) {
        // Usuário sem permissão para ler configurações remotas (ex.: não-admin).
        // Mantemos os valores padrão/cache e evitamos quebrar o app.
        console.warn("Tema remoto nao lido: sem permissao. Usando default/cache.");
      } else {
        console.error("Erro ao carregar tema do Firestore:", err);
      }
    } finally {
      setIsThemeLoading(false);
    }
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
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
