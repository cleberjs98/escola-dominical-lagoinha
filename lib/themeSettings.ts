import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import type { AppTheme, ThemeSettings } from "../types/theme";
import { firebaseDb } from "./firebase";

const THEME_DOC = doc(firebaseDb, "theme_settings", "global");

export const defaultThemeSettings: ThemeSettings = {
  mode: "dark",
  primaryColor: "#22c55e",
  secondaryColor: "#334155",
  backgroundColor: "#020617",
  cardBackgroundColor: "#0b1224",
  textColor: "#e5e7eb",
  accentColor: "#22c55e",
  backgroundType: "none",
  backgroundEnabled: false,
  backgroundSolidColor: "#020617",
  backgroundImageUrl: "",
  created_at: null,
  updated_at: null,
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
};

export async function getThemeSettings(): Promise<ThemeSettings | null> {
  try {
    const snap = await getDoc(THEME_DOC);
    if (!snap.exists()) return null;
    const data = snap.data() as ThemeSettings;
    const normalized = normalizeThemeSettings(data);
    // Debug leve
    console.log("[ThemeSettings] Loaded", normalized.mode, normalized.backgroundType);
    return normalized;
  } catch (err) {
    console.error("[ThemeSettings] Erro ao ler theme_settings/global", err);
    return null;
  }
}

export async function saveThemeSettings(settings: ThemeSettings, userId: string): Promise<void> {
  const payload: ThemeSettings = {
    ...settings,
    updatedAt: serverTimestamp() as Timestamp,
    updatedBy: userId,
    // campos legados para compatibilidade
    cor_primaria: settings.primaryColor,
    cor_secundaria: settings.secondaryColor,
    cor_fundo: settings.backgroundColor,
    cor_texto: settings.textColor,
    cor_texto_secundario: settings.textColor,
    cor_sucesso: settings.accentColor,
    cor_erro: settings.accentColor,
    cor_aviso: "#f59e0b",
    cor_info: "#38bdf8",
    ativo: true,
    updated_at: serverTimestamp() as Timestamp,
  };

  console.log("[ThemeSettings] Saving", payload.mode, payload.backgroundType);
  await setDoc(THEME_DOC, payload, { merge: true });
}

export function getMergedAppTheme(settings?: ThemeSettings | null): AppTheme {
  const base = settings ? normalizeThemeSettings(settings) : defaultThemeSettings;

  return {
    colors: {
      background: base.backgroundColor || defaultThemeSettings.backgroundColor!,
      card: base.cardBackgroundColor || defaultThemeSettings.cardBackgroundColor!,
      primary: base.primaryColor || defaultThemeSettings.primaryColor!,
      secondary: base.secondaryColor || defaultThemeSettings.secondaryColor!,
      text: base.textColor || defaultThemeSettings.textColor!,
      accent: base.accentColor || base.primaryColor || defaultThemeSettings.accentColor!,
      tabBarBackground: base.cardBackgroundColor || "#0f1521",
      tabBarActive: base.accentColor || "#00ff7f",
      tabBarInactive: "#aaa",
    },
    background: {
      type: base.backgroundType || "none",
      enabled: !!base.backgroundEnabled,
      color: base.backgroundType === "color" ? base.backgroundSolidColor || base.backgroundColor : undefined,
      imageUrl: base.backgroundType === "image" ? base.backgroundImageUrl : undefined,
    },
  };
}

export function normalizeThemeSettings(input: ThemeSettings): ThemeSettings {
  const normalized: ThemeSettings = {
    ...defaultThemeSettings,
    ...input,
    primaryColor: input.primaryColor || input.cor_primaria || defaultThemeSettings.primaryColor,
    secondaryColor: input.secondaryColor || input.cor_secundaria || defaultThemeSettings.secondaryColor,
    backgroundColor: input.backgroundColor || input.cor_fundo || defaultThemeSettings.backgroundColor,
    cardBackgroundColor: input.cardBackgroundColor || input.backgroundColor || "#0b1224",
    textColor: input.textColor || input.cor_texto || defaultThemeSettings.textColor,
    accentColor: input.accentColor || input.cor_primaria || defaultThemeSettings.accentColor,
    backgroundType: input.backgroundType || "none",
    backgroundEnabled: input.backgroundEnabled ?? false,
    backgroundSolidColor: input.backgroundSolidColor || input.cor_fundo || defaultThemeSettings.backgroundColor,
    backgroundImageUrl: input.backgroundImageUrl || "",
  };

  // Compatibilidade de campos legados
  normalized.cor_primaria = normalized.primaryColor;
  normalized.cor_secundaria = normalized.secondaryColor;
  normalized.cor_fundo = normalized.backgroundColor;
  normalized.cor_texto = normalized.textColor;
  normalized.cor_texto_secundario = normalized.textColor;
  normalized.cor_sucesso = normalized.accentColor;
  normalized.cor_erro = normalized.accentColor;
  normalized.cor_aviso = normalized.cor_aviso || "#f59e0b";
  normalized.cor_info = normalized.cor_info || "#38bdf8";

  return normalized;
}

export function buildThemeFromPalette(
  palette: { dominant: string; vibrant?: string; muted?: string; lightVibrant?: string; darkMuted?: string },
  previous?: ThemeSettings
): ThemeSettings {
  const base = normalizeThemeSettings(previous || defaultThemeSettings);
  const primary = palette.vibrant || palette.dominant || base.primaryColor;
  const secondary = palette.muted || palette.dominant || base.secondaryColor;
  const accent = palette.lightVibrant || primary;

  return normalizeThemeSettings({
    ...base,
    mode: "auto-image",
    primaryColor: primary,
    secondaryColor: secondary,
    accentColor: accent,
    cardBackgroundColor: "rgba(15,23,42,0.9)",
    backgroundColor: "#020617",
    backgroundType: "image",
    backgroundEnabled: true,
  });
}
