import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  expireStalePendingBookings,
  PUBLIC_SLOT_STATUSES,
} from "@/lib/booking-policy";
import {
  buildHourSlots,
  getBookableDays,
  isDateInBookingWindow,
  parseDayKey,
} from "@/lib/booking-window";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { endOfStoreDay } from "@/lib/timezone";

export async function GET(request: Request) {
  await expireStalePendingBookings();

  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");
  const dayKey = searchParams.get("day");
  const admin = searchParams.get("admin") === "1" && Boolean(session);

  if (!roomId || !dayKey) {
    return NextResponse.json(
      { error: "roomId dan day wajib diisi" },
      { status: 400 },
    );
  }

  const settings = await getSettings();
  const day = parseDayKey(dayKey);
  if (!day) {
    return NextResponse.json({ error: "Format tanggal invalid" }, { status: 400 });
  }

  if (!isDateInBookingWindow(day, settings.bookingWindowDays)) {
    return NextResponse.json(
      { error: "Tanggal di luar window booking 3 hari" },
      { status: 400 },
    );
  }

  const room = await prisma.room.findFirst({
    where: { id: roomId, isActive: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room tidak ditemukan" }, { status: 404 });
  }

  const dayStart = day;
  const dayEnd = endOfStoreDay(day);

  // Customer: hanya confirmed/active. Admin: termasuk pending agar kasir lihat antrian.
  const statusFilter = admin
    ? ["pending", "confirmed", "active"]
    : [...PUBLIC_SLOT_STATUSES];

  const bookings = await prisma.booking.findMany({
    where: {
      roomId,
      status: { in: statusFilter },
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
    },
  });

  const slots = buildHourSlots(
    dayKey,
    settings.openHour,
    settings.closeHour,
    bookings.map((b) => ({
      startAt: b.startAt,
      endAt: b.endAt,
      status: b.status,
      customerName: b.customerName,
    })),
    new Date(),
    admin,
  );

  return NextResponse.json({
    days: getBookableDays(settings.bookingWindowDays),
    slots: slots.map((slot) => ({
      ...slot,
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
    })),
    room: { id: room.id, name: room.name, consoleType: room.consoleType },
    closeHour: settings.closeHour,
  });
}
