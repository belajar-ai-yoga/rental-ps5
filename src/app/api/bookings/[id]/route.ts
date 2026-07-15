import { NextResponse } from "next/server";
import { addHours } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  expireStalePendingBookings,
  LOCKED_SLOT_STATUSES,
} from "@/lib/booking-policy";
import {
  isDateInBookingWindow,
  slotDateFromDayAndHour,
} from "@/lib/booking-window";
import { prisma } from "@/lib/prisma";
import { overlaps } from "@/lib/room-status";
import { getSettings } from "@/lib/settings";

type Params = { params: Promise<{ id: string }> };

const ALLOWED: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["active", "cancelled"],
  active: ["completed"],
};

export async function PATCH(request: Request, { params }: Params) {
  await expireStalePendingBookings();

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 });
  }

  // Pindah jam / room / durasi (untuk negosiasi via WA)
  if (body.reschedule) {
    if (!["pending", "confirmed"].includes(booking.status)) {
      return NextResponse.json(
        { error: "Hanya pending/confirmed yang bisa dipindah" },
        { status: 400 },
      );
    }

    const settings = await getSettings();
    const roomId = String(body.roomId ?? booking.roomId);
    const dayKey = String(body.day ?? "");
    const hour = Number(body.hour);
    const durationHours = Math.max(
      1,
      Math.min(
        8,
        Number(
          body.durationHours ??
            Math.round(
              (booking.endAt.getTime() - booking.startAt.getTime()) / 3600000,
            ),
        ),
      ),
    );

    if (!dayKey || Number.isNaN(hour)) {
      return NextResponse.json(
        { error: "Hari dan jam baru wajib diisi" },
        { status: 400 },
      );
    }

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
        { error: "Durasi melewati jam operasional" },
        { status: 400 },
      );
    }

    const endAt = addHours(startAt, durationHours);
    const locked = await prisma.booking.findMany({
      where: {
        roomId,
        id: { not: id },
        status: { in: [...LOCKED_SLOT_STATUSES] },
      },
    });

    if (locked.some((b) => overlaps(startAt, endAt, b.startAt, b.endAt))) {
      return NextResponse.json(
        { error: "Slot tujuan sudah terisi (sudah dikonfirmasi)" },
        { status: 409 },
      );
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { roomId, startAt, endAt },
      include: { room: true },
    });

    return NextResponse.json(updated);
  }

  const nextStatus = String(body.status ?? "");
  const allowed = ALLOWED[booking.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    return NextResponse.json(
      {
        error: `Tidak bisa ubah status dari ${booking.status} ke ${nextStatus}`,
      },
      { status: 400 },
    );
  }

  if (nextStatus === "confirmed" || nextStatus === "active") {
    const locked = await prisma.booking.findMany({
      where: {
        roomId: booking.roomId,
        id: { not: id },
        status: { in: [...LOCKED_SLOT_STATUSES] },
      },
    });

    if (
      locked.some((b) =>
        overlaps(booking.startAt, booking.endAt, b.startAt, b.endAt),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Slot bentrok dengan booking yang sudah dikonfirmasi. Pindahkan ke jam lain dulu, lalu konfirmasi.",
        },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: nextStatus },
    include: { room: true },
  });

  return NextResponse.json(updated);
}
