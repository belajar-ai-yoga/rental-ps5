import { AdminShell } from "@/components/admin/AdminShell";
import { RoomsManager } from "@/components/admin/RoomsManager";
import { prisma } from "@/lib/prisma";
import { resolveRoomStatus } from "@/lib/room-status";

export const dynamic = "force-dynamic";

export default async function AdminRoomsPage() {
  const rooms = await prisma.room.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      bookings: {
        where: { status: { in: ["pending", "confirmed", "active"] } },
      },
    },
  });

  const rows = rooms.map((room) => ({
    id: room.id,
    name: room.name,
    consoleType: room.consoleType,
    isActive: room.isActive,
    status: resolveRoomStatus(room.bookings).status,
  }));

  return (
    <AdminShell>
      <RoomsManager rooms={rows} />
    </AdminShell>
  );
}
