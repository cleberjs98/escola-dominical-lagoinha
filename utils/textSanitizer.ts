// utils/textSanitizer.ts
// Helper simples para remover caracteres corrompidos na exibição sem alterar dados no backend.
export function normalizeMojibake(text?: string, fieldName?: string): string {
  if (text == null) return "";
  const hasReplacement = text.includes("\uFFFD");
  const cleaned = text.replace(/\uFFFD/g, "");
  if (hasReplacement && fieldName) {
    console.warn("[UI] Mojibake detected on field:", fieldName);
  }
  return cleaned.normalize?.("NFC") ?? cleaned;
}
