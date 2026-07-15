import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const data: {
    name?: string;
    consoleType?: string;
    isActive?: boolean;
    sortOrder?: number;
    pricePerHour?: number;
  } = {};

  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.consoleType !== undefined) {
    data.consoleType = String(body.consoleType).trim();
  }
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);
  if (body.pricePerHour !== undefined) {
    data.pricePerHour = Math.max(0, Number(body.pricePerHour));
  }

  if (data.name !== undefined && !data.name) {
    return NextResponse.json({ error: "Nama room wajib diisi" }, { status: 400 });
  }

  const room = await prisma.room.update({
    where: { id },
    data,
  });

  return NextResponse.json(room);
}
