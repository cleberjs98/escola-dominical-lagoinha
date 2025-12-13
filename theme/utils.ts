// Utilitários de tema compartilhados
// Aplica transparência a uma cor hex (#RRGGBB ou #RRGGBBAA)
export function withAlpha(color: string, alpha: number): string {
  if (color?.startsWith("#") && (color.length === 7 || color.length === 9)) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

