import { NextResponse } from "next/server";
import { addHours } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  checkBookingRateLimit,
  expireStalePendingBookings,
  getClientIp,
  LOCKED_SLOT_STATUSES,
  MAX_PENDING_PER_PHONE,
  PENDING_EXPIRE_MINUTES,
  phoneMatchVariants,
  normalizePhone,
} from "@/lib/booking-policy";
import {
  generateBookingCode,
  isDateInBookingWindow,
  slotDateFromDayAndHour,
} from "@/lib/booking-window";
import { prisma } from "@/lib/prisma";
import { overlaps } from "@/lib/room-status";
import { getSettings } from "@/lib/settings";
import { buildWhatsAppBookingUrl } from "@/lib/whatsapp";

export async function GET(request: Request) {
  await expireStalePendingBookings();

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") ?? "today";

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);

  const where =
    filter === "pending"
      ? { status: "pending" as const }
      : filter === "all"
        ? {}
        : {
            OR: [
              { status: "pending" },
              {
                startAt: { gte: startToday, lte: endToday },
                status: { in: ["pending", "confirmed", "active", "completed"] },
              },
            ],
          };

  const bookings = await prisma.booking.findMany({
    where,
    include: { room: true },
    orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json(bookings);
}

export async function POST(request: Request) {
  await expireStalePendingBookings();

  const ip = getClientIp(request);
  const rate = checkBookingRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak percobaan booking. Coba lagi dalam ${rate.retryAfterSec} detik.`,
      },
      { status: 429 },
    );
  }

  const body = await request.json();
  const roomId = String(body.roomId ?? "");
  const dayKey = String(body.day ?? "");
  const hour = Number(body.hour);
  const durationHours = Math.max(1, Math.min(8, Number(body.durationHours ?? 1)));
  const customerName = String(body.customerName ?? "").trim();
  const customerPhone = normalizePhone(
    String(body.customerPhone ?? "").replace(/\D/g, ""),
  );

  if (!roomId || !dayKey || Number.isNaN(hour)) {
    return NextResponse.json(
      { error: "Room, hari, dan jam wajib dipilih" },
      { status: 400 },
    );
  }

  if (!customerName || customerPhone.length < 10) {
    return NextResponse.json(
      { error: "Nama dan nomor WA valid wajib diisi" },
      { status: 400 },
    );
  }

  const settings = await getSettings();
  const startAt = slotDateFromDayAndHour(dayKey, hour);
  if (!startAt) {
    return NextResponse.json({ error: "Format tanggal invalid" }, { status: 400 });
  }

  if (!isDateInBookingWindow(startAt, settings.bookingWindowDays)) {
    return NextResponse.json(
      { error: "Hanya bisa booking untuk 3 hari ke depan" },
      { status: 400 },
    );
  }

  if (hour < settings.openHour || hour + durationHours > settings.closeHour) {
    return NextResponse.json(
      { error: "Durasi booking melewati jam operasional" },
      { status: 400 },
    );
  }

  if (startAt < new Date()) {
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

  const phoneVariants = phoneMatchVariants(customerPhone);
  const pendingCount = await prisma.booking.count({
    where: {
      status: "pending",
      customerPhone: { in: phoneVariants },
    },
  });

  if (pendingCount >= MAX_PENDING_PER_PHONE) {
    return NextResponse.json(
      {
        error: `Nomor WA ini masih punya booking menunggu konfirmasi. Tunggu admin acc atau maksimal ${PENDING_EXPIRE_MINUTES} menit hingga pending otomatis batal.`,
      },
      { status: 429 },
    );
  }

  // Hanya confirmed/active yang menahan slot publik — pending tidak mengunci
  const locked = await prisma.booking.findMany({
    where: {
      roomId,
      status: { in: [...LOCKED_SLOT_STATUSES] },
    },
  });

  const conflict = locked.some((b) =>
    overlaps(startAt, endAt, b.startAt, b.endAt),
  );

  if (conflict) {
    return NextResponse.json(
      {
        error:
          "Slot sudah dikonfirmasi admin. Pilih jam lain, atau chat admin via WhatsApp untuk dialihkan.",
      },
      { status: 409 },
    );
  }

  const booking = await prisma.booking.create({
    data: {
      code: generateBookingCode(),
      roomId,
      customerName,
      customerPhone,
      startAt,
      endAt,
      status: "pending",
    },
    include: { room: true },
  });

  const whatsappUrl = buildWhatsAppBookingUrl({
    shopName: settings.shopName,
    whatsappNumber: settings.whatsappNumber,
    code: booking.code,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    roomName: booking.room.name,
    startAt: booking.startAt,
    endAt: booking.endAt,
    durationHours,
    pricePerHour: settings.pricePerHour,
  });

  return NextResponse.json(
    {
      booking,
      whatsappUrl,
      expiresInMinutes: PENDING_EXPIRE_MINUTES,
    },
    { status: 201 },
  );
}
