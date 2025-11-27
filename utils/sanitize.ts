// utils/sanitize.ts
// Sanitiza texto simples removendo scripts, handlers e esquemas perigosos.
export function sanitizeText(input: string): string {
  if (!input) return "";
  const base = String(input);
  const withoutScripts = base.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  const withoutEvents = withoutScripts
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
  const withoutJsSchemes = withoutEvents.replace(
    /(href|src)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi,
    '$1="#"'
  );
  return withoutJsSchemes.trim();
}
