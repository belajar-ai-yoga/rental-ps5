import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { id as localeId } from "date-fns/locale";

/**
 * Bali memakai WITA (UTC+8).
 * IANA tidak punya "Asia/Bali" — zona yang benar: Asia/Makassar.
 */
export const STORE_TIMEZONE = "Asia/Makassar";

export function formatInStoreTz(
  date: Date,
  pattern: string,
  options?: { locale?: typeof localeId },
) {
  return formatInTimeZone(date, STORE_TIMEZONE, pattern, options);
}

/** Awal hari (00:00:00.000) di zona toko, sebagai Instant UTC */
export function startOfStoreDay(date = new Date()) {
  const dayKey = formatInTimeZone(date, STORE_TIMEZONE, "yyyy-MM-dd");
  return fromZonedTime(`${dayKey}T00:00:00.000`, STORE_TIMEZONE);
}

/** Akhir hari (23:59:59.999) di zona toko */
export function endOfStoreDay(date = new Date()) {
  const dayKey = formatInTimeZone(date, STORE_TIMEZONE, "yyyy-MM-dd");
  return fromZonedTime(`${dayKey}T23:59:59.999`, STORE_TIMEZONE);
}

export function storeDayKey(date = new Date()) {
  return formatInTimeZone(date, STORE_TIMEZONE, "yyyy-MM-dd");
}

export function storeHour(date = new Date()) {
  return Number(formatInTimeZone(date, STORE_TIMEZONE, "H"));
}

/** Buat Date UTC dari tanggal lokal toko + jam */
export function zonedDateTime(dayKey: string, hour: number, minute = 0) {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return fromZonedTime(`${dayKey}T${hh}:${mm}:00.000`, STORE_TIMEZONE);
}

export function isSameStoreDay(a: Date, b: Date) {
  return storeDayKey(a) === storeDayKey(b);
}

export function toStoreZoned(date: Date) {
  return toZonedTime(date, STORE_TIMEZONE);
}
