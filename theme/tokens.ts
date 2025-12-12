// Tema global: Bordô escuro + branco (sem dourado)
// Todos os componentes devem consumir estes tokens.
export const themeTokens = {
  colors: {
    // Base
    background: "#1A0509",
    surface: "#2A0E12",
    surface2: "#3A1118",
    border: "#3A0E15",
    borderSoft: "#5A1622",

    // Texto
    textPrimary: "#FFFFFF",
    textSecondary: "#CBD5E1",
    muted: "#94A3B8",

    // Ações
    primary: "#7A1422",
    primaryHover: "#8E1B2B",
    primaryPressed: "#5E0E18",
    onPrimary: "#FFFFFF",

    // Neutros
    white: "#FFFFFF",
    black: "#000000",

    // Estados
    danger: "#9F1D2D",
    onDanger: "#FFFFFF",

    // Tab bar
    tabBarBg: "#120407",
    tabActive: "#FFFFFF",
    tabInactive: "rgba(255,255,255,0.6)",
    tabIndicator: "#7A1422",

    // Inputs
    inputBg: "#0E1626",
    inputBorder: "#2A3448",
    inputBorderFocus: "#7A1422",
    inputText: "#FFFFFF",
    inputPlaceholder: "#94A3B8",
  },

  status: {
    disponivel: { bg: "#7A1422", text: "#FFFFFF" },
    publicada: { bg: "#FFFFFF", text: "#7A1422" },
    publicado: { bg: "#FFFFFF", text: "#7A1422" },
    pendente: { bg: "#3A1118", text: "#FFFFFF" },
    pendente_reserva: { bg: "#3A1118", text: "#FFFFFF" },
    reservada: { bg: "#2A0E12", text: "#FFFFFF", border: "#7A1422" },
    default: { bg: "rgba(255,255,255,0.08)", text: "#FFFFFF" },
  },
} as const;

export type ThemeTokens = typeof themeTokens;
