import { AdminShell } from "@/components/admin/AdminShell";
import { StatusBoard } from "@/components/admin/StatusBoard";
import { expireStalePendingBookings } from "@/lib/booking-policy";
import { prisma } from "@/lib/prisma";
import { resolveRoomStatus } from "@/lib/room-status";

export const dynamic = "force-dynamic";

export default async function AdminStatusPage() {
  await expireStalePendingBookings();

  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      bookings: {
        where: { status: { in: ["pending", "confirmed", "active"] } },
        orderBy: { startAt: "asc" },
      },
    },
  });

  const cards = rooms.map((room) => {
    const { status, currentBooking } = resolveRoomStatus(room.bookings);
    return {
      id: room.id,
      name: room.name,
      consoleType: room.consoleType,
      status,
      currentBooking: currentBooking
        ? {
            id: currentBooking.id,
            code: currentBooking.code,
            customerName: currentBooking.customerName,
            startAt: currentBooking.startAt.toISOString(),
            endAt: currentBooking.endAt.toISOString(),
            status: currentBooking.status,
          }
        : null,
    };
  });

  return (
    <AdminShell>
      <StatusBoard rooms={cards} />
    </AdminShell>
  );
}
