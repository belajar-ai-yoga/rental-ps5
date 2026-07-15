import type { Booking, Room } from "@/generated/prisma/client";

export type RoomLiveStatus = "kosong" | "dibooking" | "terisi";

export type RoomWithStatus = Room & {
  status: RoomLiveStatus;
  currentBooking: Booking | null;
};

/** Admin board: pending juga terlihat sebagai dibooking */
const ADMIN_HOLDING_STATUSES = new Set(["pending", "confirmed", "active"]);

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export function resolveRoomStatus(
  bookings: Booking[],
  now = new Date(),
): { status: RoomLiveStatus; currentBooking: Booking | null } {
  const relevant = bookings
    .filter((b) => ADMIN_HOLDING_STATUSES.has(b.status))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const active = relevant.find(
    (b) => b.status === "active" && b.startAt <= now && b.endAt > now,
  );
  if (active) {
    return { status: "terisi", currentBooking: active };
  }

  const confirmedNow = relevant.find(
    (b) => b.status === "confirmed" && b.startAt <= now && b.endAt > now,
  );
  if (confirmedNow) {
    return { status: "dibooking", currentBooking: confirmedNow };
  }

  const upcoming = relevant.find(
    (b) =>
      (b.status === "pending" || b.status === "confirmed") &&
      b.endAt > now,
  );
  if (upcoming) {
    return { status: "dibooking", currentBooking: upcoming };
  }

  return { status: "kosong", currentBooking: null };
}

export function bookingsHoldingSlot(status: string) {
  return ADMIN_HOLDING_STATUSES.has(status);
}

export const STATUS_LABEL: Record<RoomLiveStatus, string> = {
  kosong: "Kosong",
  dibooking: "Dibooking",
  terisi: "Terisi",
};
