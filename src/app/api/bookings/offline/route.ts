import { NextResponse } from "next/server";
import { addHours } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  expireStalePendingBookings,
  LOCKED_SLOT_STATUSES,
} from "@/lib/booking-policy";
import {
  generateBookingCode,
  isDateInBookingWindow,
  slotDateFromDayAndHour,
} from "@/lib/booking-window";
import { prisma } from "@/lib/prisma";
import { overlaps } from "@/lib/room-status";
import { getSettings } from "@/lib/settings";

export async function POST(request: Request) {
  await expireStalePendingBookings();

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const roomId = String(body.roomId ?? "");
  const dayKey = String(body.day ?? "");
  const hour = Number(body.hour);
  const durationHours = Math.max(1, Math.min(8, Number(body.durationHours ?? 1)));
  const customerName = String(body.customerName ?? "").trim();
  const customerPhone = String(body.customerPhone ?? "").replace(/\D/g, "");
  const mode = String(body.mode ?? "confirmed");

  if (!roomId || !dayKey || Number.isNaN(hour)) {
    return NextResponse.json(
      { error: "Room, hari, dan jam wajib dipilih" },
      { status: 400 },
    );
  }

  if (!customerName) {
    return NextResponse.json({ error: "Nama customer wajib diisi" }, { status: 400 });
  }

  if (!["confirmed", "active"].includes(mode)) {
    return NextResponse.json({ error: "Mode booking tidak valid" }, { status: 400 });
  }

  const settings = await getSettings();
  const startAt = slotDateFromDayAndHour(dayKey, hour);
  if (!startAt) {
    return NextResponse.json({ error: "Format tanggal invalid" }, { status: 400 });
  }

  if (!isDateInBookingWindow(startAt, settings.bookingWindowDays)) {
    return NextResponse.json(
      { error: "Tanggal di luar window booking" },
      { status: 400 },
    );
  }

  if (hour < settings.openHour || hour + durationHours > settings.closeHour) {
    return NextResponse.json(
      { error: "Durasi booking melewati jam operasional" },
      { status: 400 },
    );
  }

  const now = new Date();
  const isCurrentHour =
    now.getHours() === hour &&
    startAt.toDateString() === now.toDateString();

  if (startAt < now && !(mode === "active" && isCurrentHour)) {
    return NextResponse.json(
      { error: "Slot jam sudah lewat" },
      { status: 400 },
    );
  }

  const endAt = addHours(startAt, durationHours);
  const room = await prisma.room.findFirst({
    where: { id: roomId, isActive: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Room tidak ditemukan" }, { status: 404 });
  }

  const existing = await prisma.booking.findMany({
    where: {
      roomId,
      status: { in: [...LOCKED_SLOT_STATUSES] },
    },
  });

  const conflict = existing.some((b) =>
    overlaps(startAt, endAt, b.startAt, b.endAt),
  );

  if (conflict) {
    return NextResponse.json(
      { error: "Slot tidak tersedia untuk durasi yang dipilih" },
      { status: 409 },
    );
  }

  const booking = await prisma.booking.create({
    data: {
      code: generateBookingCode(),
      roomId,
      customerName,
      customerPhone: customerPhone || "offline",
      startAt,
      endAt,
      status: mode,
    },
    include: { room: true },
  });

  return NextResponse.json({ booking }, { status: 201 });
}
