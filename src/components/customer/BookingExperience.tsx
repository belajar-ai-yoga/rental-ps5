"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  canBookDuration,
  formatCurrency,
  maxConsecutiveHours,
} from "@/lib/booking-window";
import type { RoomAvailability } from "@/lib/room-availability";

type RoomCard = {
  id: string;
  name: string;
  consoleType: string;
  availability: RoomAvailability;
  availabilityLabel: string;
  availableSlotsToday: number;
};

type DayOption = {
  key: string;
  label: string;
  dateLabel: string;
};

type Slot = {
  hour: number;
  label: string;
  available: boolean;
  past: boolean;
  bookingStatus?: "pending" | "confirmed" | "active" | null;
  bookingLabel?: string | null;
};

type Settings = {
  shopName: string;
  pricePerHour: number;
  bookingWindowDays: number;
  openHour: number;
  closeHour: number;
};

const availabilityTone: Record<RoomAvailability, string> = {
  ada_slot: "border-teal/40 bg-teal/10 text-teal",
  hampir_penuh: "border-amber/40 bg-amber/10 text-amber",
  penuh: "border-rose/40 bg-rose/10 text-rose",
};

const availabilityCardClass: Record<RoomAvailability, string> = {
  ada_slot: "availability-ada_slot",
  hampir_penuh: "availability-hampir_penuh",
  penuh: "availability-penuh",
};

const slotBookingTone: Record<string, string> = {
  pending: "border-amber/40 bg-amber/10 text-amber",
  confirmed: "border-amber/40 bg-amber/10 text-amber",
  active: "border-rose/40 bg-rose/10 text-rose",
};

export function BookingExperience({
  initialRooms,
  initialDays,
  settings,
}: {
  initialRooms: RoomCard[];
  initialDays: DayOption[];
  settings: Settings;
}) {
  const [rooms, setRooms] = useState(initialRooms);
  const [days] = useState(initialDays);
  const [selectedDay, setSelectedDay] = useState(days[0]?.key ?? "");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [closeHour, setCloseHour] = useState(settings.closeHour);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [durationHours, setDurationHours] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );

  const maxHours = useMemo(() => {
    if (selectedHour === null) return 0;
    return maxConsecutiveHours(selectedHour, slots, closeHour);
  }, [selectedHour, slots, closeHour]);

  const durationOptions = useMemo(() => {
    if (maxHours === 0) return [1];
    return Array.from({ length: maxHours }, (_, i) => i + 1);
  }, [maxHours]);

  useEffect(() => {
    if (durationHours > maxHours && maxHours > 0) {
      setDurationHours(maxHours);
    }
  }, [durationHours, maxHours]);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/rooms");
        if (res.ok) {
          const data = await res.json();
          setRooms(
            data.map(
              (room: RoomCard) => ({
                id: room.id,
                name: room.name,
                consoleType: room.consoleType,
                availability: room.availability,
                availabilityLabel: room.availabilityLabel,
                availableSlotsToday: room.availableSlotsToday,
              }),
            ),
          );
        }
      } catch {
        /* ignore polling errors */
      }
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedRoomId || !selectedDay) return;

    let cancelled = false;
    async function loadSlots() {
      setLoadingSlots(true);
      setError(null);
      setSelectedHour(null);
      setDurationHours(1);
      try {
        const res = await fetch(
          `/api/slots?roomId=${selectedRoomId}&day=${selectedDay}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat slot");
        if (!cancelled) {
          setSlots(data.slots);
          setCloseHour(data.closeHour ?? settings.closeHour);
        }
      } catch (e) {
        if (!cancelled) {
          setSlots([]);
          setError(e instanceof Error ? e.message : "Gagal memuat slot");
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }

    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [selectedRoomId, selectedDay, settings.closeHour]);

  function isInSelectedRange(hour: number) {
    if (selectedHour === null) return false;
    return hour >= selectedHour && hour < selectedHour + durationHours;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !selectedRoomId ||
      selectedHour === null ||
      !canBookDuration(selectedHour, durationHours, slots, closeHour)
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoomId,
          day: selectedDay,
          hour: selectedHour,
          durationHours,
          customerName,
          customerPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking gagal");

      setSuccessCode(data.booking.code);
      window.open(data.whatsappUrl, "_blank");

      const roomsRes = await fetch("/api/rooms");
      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setRooms(
          roomsData.map((room: RoomCard) => ({
            id: room.id,
            name: room.name,
            consoleType: room.consoleType,
            availability: room.availability,
            availabilityLabel: room.availabilityLabel,
            availableSlotsToday: room.availableSlotsToday,
          })),
        );
      }

      const slotsRes = await fetch(
        `/api/slots?roomId=${selectedRoomId}&day=${selectedDay}`,
      );
      if (slotsRes.ok) {
        const slotsData = await slotsRes.json();
        setSlots(slotsData.slots);
        setSelectedHour(null);
        setDurationHours(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking gagal");
    } finally {
      setSubmitting(false);
    }
  }

  const estimatedTotal = settings.pricePerHour * durationHours;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-noise opacity-70" />

      <section className="relative mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-end px-5 pb-16 pt-28 md:justify-center md:pb-24 md:pt-24">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-sm tracking-[0.35em] text-teal uppercase"
        >
          Online Booking
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-display mt-3 max-w-3xl text-5xl leading-[0.95] font-bold tracking-tight text-white md:text-7xl"
        >
          {settings.shopName}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mt-5 max-w-xl text-lg text-mist/90"
        >
          Pilih room, hari, jam, dan durasi — lanjut konfirmasi via WhatsApp.
        </motion.p>
        <motion.a
          href="#booking"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-semibold text-ink transition hover:scale-[1.02] hover:bg-lime/90"
        >
          Mulai Booking
          <span aria-hidden>↓</span>
        </motion.a>
      </section>

      <section className="relative mx-auto max-w-6xl px-5 pb-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white">
              Ketersediaan Room Hari Ini
            </h2>
            <p className="text-sm text-mist/70">
              Detail per jam ada di grid booking di bawah
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {rooms.map((room, index) => (
            <motion.button
              key={room.id}
              type="button"
              onClick={() => {
                setSelectedRoomId(room.id);
                document
                  .getElementById("booking")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`${availabilityCardClass[room.availability]} rounded-2xl border border-[color:var(--status)]/30 bg-[color:var(--panel)] p-4 text-left backdrop-blur transition hover:border-[color:var(--status)] hover:shadow-[0_0_30px_rgba(45,212,191,0.12)]`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-semibold text-white">
                  {room.name}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${availabilityTone[room.availability]}`}
                >
                  {room.availabilityLabel}
                </span>
              </div>
              <p className="mt-2 text-xs tracking-wide text-mist/60 uppercase">
                {room.consoleType}
              </p>
              {room.availability !== "penuh" && (
                <p className="mt-2 text-xs text-mist/70">
                  Sisa {room.availableSlotsToday} slot hari ini
                </p>
              )}
            </motion.button>
          ))}
        </div>
      </section>

      <section
        id="booking"
        className="relative mx-auto max-w-6xl px-5 pb-24 pt-6"
      >
        <div className="rounded-[28px] border border-[color:var(--line)] bg-[color:var(--panel)] p-5 backdrop-blur md:p-8">
          <div className="mb-6">
            <h2 className="font-display text-3xl font-semibold text-white">
              Booking Slot
            </h2>
            <p className="mt-1 text-mist/70">
              Tersedia {settings.bookingWindowDays} hari ke depan ·{" "}
              {formatCurrency(settings.pricePerHour)} / jam
            </p>
          </div>

          <div className="mb-6">
            <p className="mb-3 text-xs tracking-[0.2em] text-teal uppercase">
              1 · Pilih Hari
            </p>
            <div className="flex flex-wrap gap-2">
              {days.map((day) => {
                const active = selectedDay === day.key;
                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDay(day.key)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-teal bg-teal/15 text-white shadow-[0_0_24px_rgba(45,212,191,0.2)]"
                        : "border-white/10 bg-white/5 text-mist hover:border-teal/40"
                    }`}
                  >
                    <div className="text-sm font-semibold">{day.label}</div>
                    <div className="text-xs opacity-70">{day.dateLabel}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <p className="mb-3 text-xs tracking-[0.2em] text-teal uppercase">
              2 · Pilih Room
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {rooms.map((room) => {
                const active = selectedRoomId === room.id;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-lime bg-lime/10 text-white"
                        : "border-white/10 bg-white/5 text-mist hover:border-lime/40"
                    }`}
                  >
                    <div className="font-medium">{room.name}</div>
                    <div className="text-xs opacity-70">{room.consoleType}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {selectedRoom && (
              <motion.div
                key={`${selectedRoom.id}-${selectedDay}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="mb-6">
                  <p className="mb-3 text-xs tracking-[0.2em] text-teal uppercase">
                    3 · Pilih Jam · {selectedRoom.name}
                  </p>
                  {loadingSlots ? (
                    <p className="text-sm text-mist/70">Memuat slot...</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                      {slots.map((slot) => {
                        const selected = selectedHour === slot.hour;
                        const inRange = isInSelectedRange(slot.hour);
                        const booked = !slot.available && slot.bookingLabel;
                        const disabled = !slot.available;

                        return (
                          <button
                            key={slot.hour}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              setSelectedHour(slot.hour);
                              setDurationHours(1);
                            }}
                            className={`rounded-xl border px-2 py-3 text-left text-sm transition ${
                              selected || inRange
                                ? "border-lime bg-lime text-ink font-semibold"
                                : booked
                                  ? `cursor-not-allowed ${slotBookingTone[slot.bookingStatus ?? "active"]}`
                                  : disabled
                                    ? "cursor-not-allowed border-white/5 bg-white/[0.03] text-white/25"
                                    : "border-white/10 bg-white/5 text-mist hover:border-lime/50 hover:text-white"
                            }`}
                          >
                            <span className="block">{slot.label}</span>
                            {booked && (
                              <span
                                className={`mt-1 block text-[10px] leading-tight font-medium ${
                                  selected || inRange
                                    ? "text-ink/80"
                                    : "opacity-90"
                                }`}
                              >
                                {slot.bookingLabel}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedHour !== null && maxHours > 0 && (
                  <div className="mb-6">
                    <p className="mb-3 text-xs tracking-[0.2em] text-teal uppercase">
                      4 · Durasi Booking
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {durationOptions.map((hours) => {
                        const active = durationHours === hours;
                        return (
                          <button
                            key={hours}
                            type="button"
                            onClick={() => setDurationHours(hours)}
                            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                              active
                                ? "border-lime bg-lime/15 text-white"
                                : "border-white/10 bg-white/5 text-mist hover:border-lime/40"
                            }`}
                          >
                            {hours} jam
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-sm text-mist/70">
                      Memakan {durationHours} slot berturut-turut · estimasi{" "}
                      {formatCurrency(estimatedTotal)}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-xs tracking-[0.2em] text-teal uppercase">
                    5 · Data & WhatsApp
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm text-mist/80">Nama</span>
                      <input
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-white outline-none ring-teal focus:ring-2"
                        placeholder="Nama lengkap"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm text-mist/80">
                        No. WhatsApp
                      </span>
                      <input
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-ink/60 px-4 py-3 text-white outline-none ring-teal focus:ring-2"
                        placeholder="08xxxxxxxxxx"
                        inputMode="tel"
                      />
                    </label>
                  </div>

                  {error && (
                    <p className="rounded-xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose">
                      {error}
                    </p>
                  )}
                  {successCode && (
                    <p className="rounded-xl border border-teal/30 bg-teal/10 px-4 py-3 text-sm text-teal">
                      Booking {successCode} tersimpan sebagai permintaan.
                      Lanjutkan chat WhatsApp — admin punya 10 menit untuk
                      konfirmasi sebelum pending otomatis batal. Slot baru
                      terkunci setelah admin acc.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      !selectedRoomId ||
                      selectedHour === null ||
                      !canBookDuration(
                        selectedHour,
                        durationHours,
                        slots,
                        closeHour,
                      ) ||
                      !customerName ||
                      !customerPhone
                    }
                    className="w-full rounded-2xl bg-lime px-5 py-4 text-base font-semibold text-ink transition enabled:hover:scale-[1.01] enabled:hover:bg-lime/90 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
                  >
                    {submitting ? "Memproses..." : "Booking via WhatsApp"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {!selectedRoom && (
            <p className="text-sm text-mist/60">
              Pilih room di atas untuk melihat slot jam.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
