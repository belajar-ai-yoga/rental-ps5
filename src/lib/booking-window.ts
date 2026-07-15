import { addDays, addHours, isBefore } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toInitials } from "@/lib/privacy";
import {
  formatInStoreTz,
  startOfStoreDay,
  storeDayKey,
  storeHour,
  zonedDateTime,
  isSameStoreDay,
} from "@/lib/timezone";

export type DayOption = {
  key: string;
  label: string;
  dateLabel: string;
  date: Date;
};

export type HourSlot = {
  hour: number;
  label: string;
  startAt: Date;
  endAt: Date;
  available: boolean;
  past: boolean;
  bookingStatus?: "pending" | "confirmed" | "active" | null;
  bookingLabel?: string | null;
};

type SlotBooking = {
  startAt: Date;
  endAt: Date;
  status: string;
  customerName?: string;
};

const BOOKING_SLOT_LABEL: Record<string, string> = {
  pending: "Dibooking",
  confirmed: "Dibooking",
  active: "Terisi",
};

export function bookingLabelForStatus(
  status: string,
  isStart: boolean,
  customerName?: string,
) {
  const base = BOOKING_SLOT_LABEL[status] ?? "Terisi";
  if (isStart && customerName) return `${base} · ${toInitials(customerName)}`;
  return base;
}

export function buildHourSlots(
  dayKeyOrDate: string | Date,
  openHour: number,
  closeHour: number,
  bookings: SlotBooking[],
  now = new Date(),
  allowCurrentHourForAdmin = false,
): HourSlot[] {
  const dayKey =
    typeof dayKeyOrDate === "string"
      ? dayKeyOrDate
      : storeDayKey(dayKeyOrDate);

  const slots: HourSlot[] = [];
  const nowHour = storeHour(now);
  const nowDayKey = storeDayKey(now);

  for (let hour = openHour; hour < closeHour; hour += 1) {
    const startAt = zonedDateTime(dayKey, hour);
    const endAt = addHours(startAt, 1);
    const isCurrentHour =
      allowCurrentHourForAdmin &&
      hour === nowHour &&
      dayKey === nowDayKey;
    const past = isCurrentHour ? false : isBefore(startAt, now);

    const covering = bookings.find((booking) => {
      return startAt < booking.endAt && endAt > booking.startAt;
    });

    const isStart =
      covering != null && covering.startAt.getTime() === startAt.getTime();

    slots.push({
      hour,
      label: `${formatInStoreTz(startAt, "HH:mm")}–${formatInStoreTz(endAt, "HH:mm")}`,
      startAt,
      endAt,
      available: !past && !covering,
      past,
      bookingStatus: covering
        ? (covering.status as HourSlot["bookingStatus"])
        : null,
      bookingLabel: covering
        ? bookingLabelForStatus(covering.status, isStart, covering.customerName)
        : null,
    });
  }

  return slots;
}

export function maxConsecutiveHours(
  startHour: number,
  slots: Pick<HourSlot, "hour" | "available">[],
  closeHour: number,
) {
  let count = 0;
  for (let hour = startHour; hour < closeHour; hour += 1) {
    const slot = slots.find((s) => s.hour === hour);
    if (!slot?.available) break;
    count += 1;
  }
  return count;
}

export function canBookDuration(
  startHour: number,
  durationHours: number,
  slots: Pick<HourSlot, "hour" | "available">[],
  closeHour: number,
) {
  if (durationHours < 1) return false;
  if (startHour + durationHours > closeHour) return false;

  for (let offset = 0; offset < durationHours; offset += 1) {
    const slot = slots.find((s) => s.hour === startHour + offset);
    if (!slot?.available) return false;
  }

  return true;
}

/** @deprecated gunakan startOfStoreDay — alias kompatibilitas */
export function startOfLocalDay(date = new Date()) {
  return startOfStoreDay(date);
}

export function getBookableDays(windowDays = 3, from = new Date()): DayOption[] {
  const labels = ["Hari ini", "Besok", "Lusa"];
  const baseKey = storeDayKey(from);
  const base = zonedDateTime(baseKey, 0);

  return Array.from({ length: windowDays }, (_, index) => {
    const date = addDays(base, index);
    const key = storeDayKey(date);
    return {
      key,
      label: labels[index] ?? formatInStoreTz(date, "EEEE", { locale: localeId }),
      dateLabel: formatInStoreTz(date, "d MMM", { locale: localeId }),
      date: startOfStoreDay(date),
    };
  });
}

export function isDateInBookingWindow(
  date: Date,
  windowDays = 3,
  from = new Date(),
) {
  const targetKey = storeDayKey(date);
  const minKey = storeDayKey(from);
  const maxDate = addDays(startOfStoreDay(from), windowDays - 1);
  const maxKey = storeDayKey(maxDate);
  return targetKey >= minKey && targetKey <= maxKey;
}

export function parseDayKey(dayKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
  return zonedDateTime(dayKey, 0);
}

export function slotDateFromDayAndHour(dayKey: string, hour: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
  if (Number.isNaN(hour) || hour < 0 || hour > 23) return null;
  return zonedDateTime(dayKey, hour);
}

export { isSameStoreDay, storeDayKey, storeHour };

export function generateBookingCode() {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PS-${now.slice(-4)}${rand}`;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
