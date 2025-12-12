// Tema bordô + branco (sem dourado)
export const bordoTheme = {
  background: "#2A0E12",
  surface: "#3A1118",
  surfaceAlt: "#45141D",
  border: "#4A1520",

  textPrimary: "#FFFFFF",
  textSecondary: "#E9E9E9",
  textMuted: "#CFCFCF",

  accent: "#FFFFFF",
  accentSoft: "rgba(255,255,255,0.12)",

  tabActive: "#FFFFFF",
  tabInactive: "rgba(255,255,255,0.6)",
  tabBackground: "#2A0E12",

  buttonPrimaryBg: "#FFFFFF",
  buttonPrimaryText: "#2A0E12",
  buttonSecondaryBg: "#3A1118",
  buttonSecondaryText: "#FFFFFF",

  statusSuccessBg: "#FFFFFF",
  statusSuccessText: "#2A0E12",
  statusInfoBg: "rgba(255,255,255,0.12)",
  statusInfoText: "#FFFFFF",
  statusWarningBg: "#45141D",
  statusWarningText: "#FFFFFF",
  statusDangerBg: "#4A1520",
  statusDangerText: "#FFFFFF",

  overlay: "rgba(0,0,0,0.5)",
  divider: "#4A1520",
} as const;

export type BordoTheme = typeof bordoTheme;

export const legacyThemeSettings = {
  cor_primaria: bordoTheme.accent,
  cor_secundaria: bordoTheme.surfaceAlt,
  cor_fundo: bordoTheme.background,
  cor_texto: bordoTheme.textPrimary,
  cor_texto_secundario: bordoTheme.textSecondary,
  cor_sucesso: bordoTheme.statusSuccessText,
  cor_erro: bordoTheme.statusDangerBg,
  cor_aviso: bordoTheme.statusWarningBg,
  cor_info: bordoTheme.statusInfoBg,
};
