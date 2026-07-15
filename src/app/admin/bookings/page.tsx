import { AdminShell } from "@/components/admin/AdminShell";
import { BookingsPanel } from "@/components/admin/BookingsPanel";
import { OfflineBookingForm } from "@/components/admin/OfflineBookingForm";
import { expireStalePendingBookings } from "@/lib/booking-policy";
import { getBookableDays } from "@/lib/booking-window";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { endOfStoreDay, startOfStoreDay } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  await expireStalePendingBookings();

  const settings = await getSettings();
  const startToday = startOfStoreDay();
  const endToday = endOfStoreDay();

  const [bookings, rooms] = await Promise.all([
    prisma.booking.findMany({
      where: {
        OR: [
          { status: "pending" },
          {
            startAt: { gte: startToday, lte: endToday },
            status: { in: ["pending", "confirmed", "active", "completed"] },
          },
        ],
      },
      include: { room: true },
      orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.room.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows = bookings.map((b) => ({
    id: b.id,
    code: b.code,
    customerName: b.customerName,
    customerPhone: b.customerPhone,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    roomId: b.roomId,
    room: { name: b.room.name },
  }));

  const days = getBookableDays(settings.bookingWindowDays).map((d) => ({
    key: d.key,
    label: d.label,
    dateLabel: d.dateLabel,
  }));

  return (
    <AdminShell>
      <OfflineBookingForm
        rooms={rooms}
        days={days}
        closeHour={settings.closeHour}
      />
      <BookingsPanel
        bookings={rows}
        rooms={rooms}
        days={days}
        openHour={settings.openHour}
        closeHour={settings.closeHour}
      />
    </AdminShell>
  );
}
