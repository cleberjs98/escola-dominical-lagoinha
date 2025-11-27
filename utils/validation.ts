// utils/validation.ts
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim());
}

export function isValidPassword(password: string, minLength = 8): boolean {
  return typeof password === "string" && password.trim().length >= minLength;
}

export function isValidPhone(phone: string, minDigits = 9): boolean {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length >= minDigits;
}

export function isNonEmpty(text: string, minLength = 1): boolean {
  return typeof text === "string" && text.trim().length >= minLength;
}

export function isValidDateLike(value: string): boolean {
  if (!isNonEmpty(value)) return false;
  // aceita YYYY-MM-DD ou DD/MM/YYYY de forma simples
  const normalized = value.trim();
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(normalized) ||
    /^\d{2}\/\d{2}\/\d{4}$/.test(normalized)
  );
}
