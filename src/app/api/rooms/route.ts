import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  expireStalePendingBookings,
  PUBLIC_SLOT_STATUSES,
} from "@/lib/booking-policy";
import { buildHourSlots, startOfLocalDay } from "@/lib/booking-window";
import { prisma } from "@/lib/prisma";
import { resolveDayAvailability } from "@/lib/room-availability";
import { resolveRoomStatus } from "@/lib/room-status";
import { getSettings } from "@/lib/settings";

export async function GET(request: Request) {
  await expireStalePendingBookings();

  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "1";
  const isAdmin = Boolean(session);

  const settings = await getSettings();
  const today = startOfLocalDay();
  const dayEnd = new Date(today);
  dayEnd.setHours(23, 59, 59, 999);

  const rooms = await prisma.room.findMany({
    where: isAdmin && all ? undefined : { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      bookings: {
        where: {
          status: { in: ["pending", "confirmed", "active"] },
        },
        orderBy: { startAt: "asc" },
      },
    },
  });

  const payload = rooms.map((room) => {
    const { status, currentBooking } = resolveRoomStatus(room.bookings);

    const publicBookings = room.bookings.filter((booking) =>
      (PUBLIC_SLOT_STATUSES as readonly string[]).includes(booking.status),
    );

    const todayBookings = publicBookings.filter(
      (booking) => booking.startAt < dayEnd && booking.endAt > today,
    );

    const slots = buildHourSlots(
      today,
      settings.openHour,
      settings.closeHour,
      todayBookings.map((booking) => ({
        startAt: booking.startAt,
        endAt: booking.endAt,
        status: booking.status,
        customerName: booking.customerName,
      })),
    );

    const availabilityInfo = resolveDayAvailability(slots);

    return {
      id: room.id,
      name: room.name,
      consoleType: room.consoleType,
      pricePerHour: room.pricePerHour,
      isActive: room.isActive,
      sortOrder: room.sortOrder,
      status,
      availability: availabilityInfo.availability,
      availabilityLabel: availabilityInfo.label,
      availableSlotsToday: availabilityInfo.availableCount,
      currentBooking: currentBooking
        ? {
            id: currentBooking.id,
            code: currentBooking.code,
            customerName: currentBooking.customerName,
            startAt: currentBooking.startAt,
            endAt: currentBooking.endAt,
            status: currentBooking.status,
          }
        : null,
    };
  });

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const consoleType = String(body.consoleType ?? "PS5").trim() || "PS5";
  const pricePerHour = Math.max(0, Number(body.pricePerHour ?? 25000));

  if (!name) {
    return NextResponse.json({ error: "Nama room wajib diisi" }, { status: 400 });
  }

  const maxOrder = await prisma.room.aggregate({ _max: { sortOrder: true } });
  const room = await prisma.room.create({
    data: {
      name,
      consoleType,
      pricePerHour,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      isActive: true,
    },
  });

  return NextResponse.json(room, { status: 201 });
}
