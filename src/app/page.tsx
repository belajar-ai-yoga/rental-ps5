import { expireStalePendingBookings, PUBLIC_SLOT_STATUSES } from "@/lib/booking-policy";
import {
  buildHourSlots,
  getBookableDays,
  startOfLocalDay,
} from "@/lib/booking-window";
import { prisma } from "@/lib/prisma";
import { resolveDayAvailability } from "@/lib/room-availability";
import { getSettings } from "@/lib/settings";
import { endOfStoreDay } from "@/lib/timezone";
import Link from "next/link";
import { BookingExperience } from "@/components/customer/BookingExperience";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await expireStalePendingBookings();

  const settings = await getSettings();
  const today = startOfLocalDay();
  const dayEnd = endOfStoreDay();

  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      bookings: {
        where: { status: { in: [...PUBLIC_SLOT_STATUSES] } },
        orderBy: { startAt: "asc" },
      },
    },
  });

  const roomCards = rooms.map((room) => {
    const todayBookings = room.bookings.filter(
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
      availability: availabilityInfo.availability,
      availabilityLabel: availabilityInfo.label,
      availableSlotsToday: availabilityInfo.availableCount,
    };
  });

  const days = getBookableDays(settings.bookingWindowDays).map((d) => ({
    key: d.key,
    label: d.label,
    dateLabel: d.dateLabel,
  }));

  return (
    <main className="customer-bg min-h-screen">
      <header className="fixed inset-x-0 top-0 z-20 border-b border-white/5 bg-ink/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="font-display text-sm font-semibold tracking-[0.2em] text-white uppercase">
            {settings.shopName}
          </span>
          <Link
            href="/admin"
            className="text-xs text-mist/70 transition hover:text-teal"
          >
            Admin
          </Link>
        </div>
      </header>

      <BookingExperience
        initialRooms={roomCards}
        initialDays={days}
        settings={{
          shopName: settings.shopName,
          bookingWindowDays: settings.bookingWindowDays,
          openHour: settings.openHour,
          closeHour: settings.closeHour,
        }}
      />

      <footer className="border-t border-white/5 py-8 text-center text-xs text-mist/50">
        Booking tersedia {settings.bookingWindowDays} hari ke depan · Jam{" "}
        {String(settings.openHour).padStart(2, "0")}:00–
        {String(settings.closeHour).padStart(2, "0")}:00 · Pending otomatis batal
        setelah 10 menit jika belum dikonfirmasi
      </footer>
    </main>
  );
}
