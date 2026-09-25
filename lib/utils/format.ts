import { clsx, type ClassValue } from "clsx";

export const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";
const APP_UTC_OFFSET = "+07:00";

export function cn(...values: ClassValue[]) {
  return clsx(values);
}

export function formatScore(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isInteger(numeric) ? numeric.toString() : numeric.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE
  }).format(new Date(value));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeZone: APP_TIME_ZONE }).format(new Date(value));
}

// Giá trị cho <input type="datetime-local"> theo giờ Việt Nam.
export function toDateTimeInputValue(value: string | null | undefined) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

// Chuyển giá trị datetime-local (giờ Việt Nam) sang ISO để lưu vào timestamptz.
export function fromDateTimeInputValue(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return null;
  return new Date(`${text}:00${APP_UTC_OFFSET}`).toISOString();
}
