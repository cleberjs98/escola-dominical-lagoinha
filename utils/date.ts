import type { Timestamp } from "firebase/firestore";

export function formatTimestamp(
  value?: Timestamp | Date | null,
  fallback: string = "-"
): string {
  if (!value) return fallback;

  let date: Date | null = null;
  if (value instanceof Date) {
    date = value;
  } else if ((value as any)?.toDate) {
    date = (value as any).toDate();
  }

  if (!date) return fallback;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
