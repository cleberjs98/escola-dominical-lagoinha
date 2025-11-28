// utils/validation.ts
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim());
}

export function isValidPassword(password: string, minLength = 8): boolean {
  return typeof password === "string" && password.trim().length >= minLength;
}

/**
 * Valida senha forte:
 * - mínimo 6 caracteres
 * - ao menos 1 maiúscula, 1 número e 1 caractere especial.
 * Retorna null se válida ou a mensagem de erro se inválida.
 */
export function validateStrongPassword(password: string): string | null {
  if (typeof password !== "string") {
    return "A senha deve ter pelo menos 6 caracteres, incluindo 1 letra maiuscula, 1 numero e 1 caractere especial.";
  }
  const trimmed = password.trim();
  if (trimmed.length < 6) {
    return "A senha deve ter pelo menos 6 caracteres, incluindo 1 letra maiuscula, 1 numero e 1 caractere especial.";
  }
  if (!/[A-Z]/.test(trimmed)) {
    return "A senha deve ter pelo menos 6 caracteres, incluindo 1 letra maiuscula, 1 numero e 1 caractere especial.";
  }
  if (!/[0-9]/.test(trimmed)) {
    return "A senha deve ter pelo menos 6 caracteres, incluindo 1 letra maiuscula, 1 numero e 1 caractere especial.";
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\\\/[\];'`~]/.test(trimmed)) {
    return "A senha deve ter pelo menos 6 caracteres, incluindo 1 letra maiuscula, 1 numero e 1 caractere especial.";
  }
  return null;
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
