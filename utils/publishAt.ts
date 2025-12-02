// Utilidades para máscaras e conversão de datas/horas no formato dd/mm/aaaa e dd/mm/aaaa hh:mm.
import { Timestamp } from "firebase/firestore";

type ParseResult = {
  timestamp: Timestamp;
  display: string;
};

export function maskDate(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  if (digits.length <= 2) return d;
  if (digits.length <= 4) return `${d}/${m}`;
  return `${d}/${m}/${y}`;
}

export function maskDateTime(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  const h = digits.slice(8, 10);
  const min = digits.slice(10, 12);
  let out = d;
  if (m) out = `${d}/${m}`;
  if (y) out = `${d}/${m}/${y}`;
  if (h) out = `${out} ${h}`;
  if (min) out = `${out}:${min}`;
  return out.trim();
}

export function parseDateToTimestamp(input: string): Timestamp | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const date = new Date(year, month - 1, day, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return Timestamp.fromDate(date);
}

export function parseDateTimeToTimestamp(input: string): ParseResult | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 12) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const hour = Number(digits.slice(8, 10));
  const minute = Number(digits.slice(10, 12));
  if (month < 1 || month > 12 || hour > 23 || minute > 59) return null;
  const date = new Date(year, month - 1, day, hour, minute, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }
  return {
    timestamp: Timestamp.fromDate(date),
    display: formatDateTime(date),
  };
}

function timestampLikeToDate(ts?: Timestamp | string | null): Date | null {
  if (!ts) return null;
  if (typeof ts === "string") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof (ts as any).toDate === "function") {
    return (ts as Timestamp).toDate();
  }
  return null;
}

export function formatTimestampToDateInput(ts?: Timestamp | string | null): string {
  const date = timestampLikeToDate(ts);
  if (!date) return "";
  return formatDate(date);
}

export function formatTimestampToDateTimeInput(ts?: Timestamp | string | null): string {
  const date = timestampLikeToDate(ts);
  if (!date) return "";
  return formatDateTime(date);
}

export function formatDate(date: Date): string {
  const dd = `${date.getDate()}`.padStart(2, "0");
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(
    2,
    "0"
  )}`;
}

export function timestampNow(): Timestamp {
  return Timestamp.now();
}
