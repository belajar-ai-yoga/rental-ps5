import {
  addDays,
  addHours,
  format,
  isBefore,
  startOfDay,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toInitials } from "@/lib/privacy";

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

export function bookingLabelForStatus(status: string, isStart: boolean, customerName?: string) {
  const base = BOOKING_SLOT_LABEL[status] ?? "Terisi";
  if (isStart && customerName) return `${base} · ${toInitials(customerName)}`;
  return base;
}

export function buildHourSlots(
  day: Date,
  openHour: number,
  closeHour: number,
  bookings: SlotBooking[],
  now = new Date(),
  allowCurrentHourForAdmin = false,
): HourSlot[] {
  const dayStart = startOfLocalDay(day);
  const slots: HourSlot[] = [];

  for (let hour = openHour; hour < closeHour; hour += 1) {
    const startAt = setMilliseconds(
      setSeconds(setMinutes(setHours(dayStart, hour), 0), 0),
      0,
    );
    const endAt = addHours(startAt, 1);
    const isCurrentHour =
      allowCurrentHourForAdmin &&
      hour === now.getHours() &&
      startAt.toDateString() === now.toDateString();
    const past = isCurrentHour ? false : isBefore(startAt, now);

    const covering = bookings.find((booking) => {
      return startAt < booking.endAt && endAt > booking.startAt;
    });

    const isStart =
      covering != null && covering.startAt.getTime() === startAt.getTime();

    slots.push({
      hour,
      label: `${format(startAt, "HH:mm")}–${format(endAt, "HH:mm")}`,
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

export function startOfLocalDay(date = new Date()) {
  return startOfDay(date);
}

export function getBookableDays(windowDays = 3, from = new Date()): DayOption[] {
  const labels = ["Hari ini", "Besok", "Lusa"];
  const base = startOfLocalDay(from);

  return Array.from({ length: windowDays }, (_, index) => {
    const date = addDays(base, index);
    return {
      key: format(date, "yyyy-MM-dd"),
      label: labels[index] ?? format(date, "EEEE", { locale: localeId }),
      dateLabel: format(date, "d MMM", { locale: localeId }),
      date,
    };
  });
}

export function isDateInBookingWindow(
  date: Date,
  windowDays = 3,
  from = new Date(),
) {
  const target = startOfLocalDay(date).getTime();
  const min = startOfLocalDay(from).getTime();
  const max = addDays(startOfLocalDay(from), windowDays - 1).getTime();
  return target >= min && target <= max;
}

export function parseDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function slotDateFromDayAndHour(dayKey: string, hour: number) {
  const day = parseDayKey(dayKey);
  if (!day) return null;
  return setMilliseconds(setSeconds(setMinutes(setHours(day, hour), 0), 0), 0);
}

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
