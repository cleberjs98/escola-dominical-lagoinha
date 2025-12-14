import type { AppTheme } from "../types/theme";
import { withAlpha } from "../theme/utils";

export function buildStackHeaderOptions(theme: AppTheme) {
  return {
    headerStyle: { backgroundColor: withAlpha(theme.colors.tabBarBackground, 0.78) },
    headerTintColor: theme.colors.text,
    headerTitleStyle: { color: theme.colors.text, fontWeight: "600" },
    headerBackTitleVisible: false,
    contentStyle: { backgroundColor: theme.colors.background },
  };
}
