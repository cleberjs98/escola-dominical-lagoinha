// types/theme.ts
import type { Timestamp } from "firebase/firestore";

export type ThemeMode = "dark" | "light" | "blue" | "green" | "custom" | "auto-image";

export type BackgroundType = "none" | "color" | "image";

/**
 * Novo modelo de configurações de tema salvas em theme_settings/global.
 * Inclui campos legados (cor_primaria, etc.) para manter compatibilidade
 * com telas já existentes enquanto migramos para os novos nomes.
 */
export interface ThemeSettings {
  // Novo modelo
  mode?: ThemeMode;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  cardBackgroundColor?: string;
  textColor?: string;
  accentColor?: string;

  backgroundType?: BackgroundType;
  backgroundEnabled?: boolean;
  backgroundSolidColor?: string;
  backgroundImageUrl?: string;

  updatedAt?: Timestamp | null;
  updatedBy?: string;

  // Compatibilidade legada (mantidos para não quebrar UI existente)
  id?: string;
  ativo?: boolean;
  cor_primaria?: string;
  cor_secundaria?: string;
  cor_fundo?: string;
  cor_texto?: string;
  cor_texto_secundario?: string;
  cor_sucesso?: string;
  cor_erro?: string;
  cor_aviso?: string;
  cor_info?: string;
  created_at?: Timestamp | null;
  updated_at?: Timestamp | null;
}

export interface AppTheme {
  colors: {
    background: string;
    card: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary?: string;
    accent: string;
    border?: string;
    muted?: string;
    divider?: string;
    inputBg?: string;
    inputBorder?: string;
    inputBorderFocus?: string;
    inputText?: string;
    inputPlaceholder?: string;
    status?: {
      successBg: string;
      successText: string;
      infoBg: string;
      infoText: string;
      warningBg: string;
      warningText: string;
      dangerBg: string;
      dangerText: string;
    };
    buttons?: {
      primaryBg: string;
      primaryText: string;
      secondaryBg: string;
      secondaryText: string;
    };
    tabBarBackground: string;
    tabBarActive: string;
    tabBarInactive: string;
  };
  background: {
    type: BackgroundType;
    enabled: boolean;
    color?: string;
    imageUrl?: string;
  };
}

// Tipos legados mantidos para minimizar refactors (algumas telas ainda usam)
export interface LayoutSettings {
  id: string;
  espacamento_xs: number;
  espacamento_sm: number;
  espacamento_md: number;
  espacamento_lg: number;
  espacamento_xl: number;
  espacamento_xxl: number;
  escala_fonte: number;
  raio_borda: number;
  intensidade_sombra: number;
  estilo_card: string;
  padding_componente: number;
  ativo: boolean;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}

export interface BackgroundSettings {
  id: string;
  secao: string; // ex: home, lessons, devotionals, avisos, profile
  url_imagem: string;
  opacidade: number; // 0..1
  posicao: string; // ex: center, cover, top, bottom
  ativo: boolean;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}

export type BackgroundSettingsInput = Omit<
  BackgroundSettings,
  "id" | "created_at" | "updated_at"
>;

export interface NavigationTabConfig {
  id: string;
  chave: string; // identificador da tab, ex: home, lessons, devotionals
  label: string;
  icone: string; // emoji ou nome do icone
  ordem: number;
  visivel_para: string[]; // papeis permitidos
  ativo: boolean;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}

export type NavigationTabConfigInput = Omit<
  NavigationTabConfig,
  "id" | "created_at" | "updated_at"
>;

export interface ScreenLayoutConfig {
  id: string;
  tela: string; // ex: home, lessons, devotionals, profile
  secoes: string[]; // lista de secoes/slots que a tela exibe em ordem
  layout_tipo: string; // ex: "padrao", "cards", "lista"
  ativo: boolean;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}

export type ScreenLayoutConfigInput = Omit<
  ScreenLayoutConfig,
  "id" | "created_at" | "updated_at"
>;
