// types/theme.ts
import type { Timestamp } from "firebase/firestore";

export interface ThemeSettings {
  id: string;
  cor_primaria: string;
  cor_secundaria: string;
  cor_fundo: string;
  cor_texto: string;
  cor_texto_secundario: string;
  cor_sucesso: string;
  cor_erro: string;
  cor_aviso: string;
  cor_info: string;
  ativo: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

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
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface BackgroundSettings {
  id: string;
  secao: string; // ex: home, lessons, devotionals, avisos, profile
  url_imagem: string;
  opacidade: number; // 0..1
  posicao: string; // ex: center, cover, top, bottom
  ativo: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
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
  created_at: Timestamp;
  updated_at: Timestamp;
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
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type ScreenLayoutConfigInput = Omit<
  ScreenLayoutConfig,
  "id" | "created_at" | "updated_at"
>;
