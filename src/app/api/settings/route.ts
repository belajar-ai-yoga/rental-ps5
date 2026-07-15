import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      whatsappNumber:
        body.whatsappNumber !== undefined
          ? String(body.whatsappNumber).replace(/\D/g, "")
          : undefined,
      openHour:
        body.openHour !== undefined ? Number(body.openHour) : undefined,
      closeHour:
        body.closeHour !== undefined ? Number(body.closeHour) : undefined,
      bookingWindowDays:
        body.bookingWindowDays !== undefined
          ? Number(body.bookingWindowDays)
          : undefined,
      pricePerHour:
        body.pricePerHour !== undefined
          ? Number(body.pricePerHour)
          : undefined,
      shopName:
        body.shopName !== undefined ? String(body.shopName).trim() : undefined,
    },
    create: {
      id: 1,
      whatsappNumber: String(body.whatsappNumber ?? "6281234567890"),
      openHour: Number(body.openHour ?? 10),
      closeHour: Number(body.closeHour ?? 22),
      bookingWindowDays: Number(body.bookingWindowDays ?? 3),
      pricePerHour: Number(body.pricePerHour ?? 25000),
      shopName: String(body.shopName ?? "Rental PS Arena"),
    },
  });

  return NextResponse.json(settings);
}
