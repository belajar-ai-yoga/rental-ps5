"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  canBookDuration,
  maxConsecutiveHours,
} from "@/lib/booking-window";

type RoomOption = { id: string; name: string };
type DayOption = { key: string; label: string; dateLabel: string };

type Slot = {
  hour: number;
  label: string;
  available: boolean;
};

const fieldClass =
  "w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-400";

export function OfflineBookingForm({
  rooms,
  days,
  closeHour,
}: {
  rooms: RoomOption[];
  days: DayOption[];
  closeHour: number;
}) {
  const router = useRouter();
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [day, setDay] = useState(days[0]?.key ?? "");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [hour, setHour] = useState<number | null>(null);
  const [durationHours, setDurationHours] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [mode, setMode] = useState<"confirmed" | "active">("active");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const maxHours = useMemo(() => {
    if (hour === null) return 0;
    return maxConsecutiveHours(hour, slots, closeHour);
  }, [hour, slots, closeHour]);

  const durationOptions = useMemo(() => {
    if (maxHours === 0) return [1];
    return Array.from({ length: maxHours }, (_, i) => i + 1);
  }, [maxHours]);

  useEffect(() => {
    if (!roomId || !day) return;

    let cancelled = false;
    async function loadSlots() {
      setLoadingSlots(true);
      setError(null);
      setHour(null);
      setDurationHours(1);
      try {
        const res = await fetch(`/api/slots?roomId=${roomId}&day=${day}&admin=1`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat slot");
        if (!cancelled) setSlots(data.slots);
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
  }, [roomId, day]);

  useEffect(() => {
    if (durationHours > maxHours && maxHours > 0) {
      setDurationHours(maxHours);
    }
  }, [durationHours, maxHours]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !roomId ||
      hour === null ||
      !canBookDuration(hour, durationHours, slots, closeHour)
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/bookings/offline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          day,
          hour,
          durationHours,
          customerName,
          customerPhone,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal tambah booking");

      setMessage(`Booking ${data.booking.code} berhasil ditambahkan.`);
      setCustomerName("");
      setCustomerPhone("");
      setHour(null);
      setDurationHours(1);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal tambah booking");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <div>
        <h3 className="text-xl font-bold text-slate-900">Tambah Booking Offline</h3>
        <p className="text-sm text-slate-500">
          Untuk customer datang langsung ke tempat
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Room</span>
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className={fieldClass}
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Hari</span>
          <select value={day} onChange={(e) => setDay(e.target.value)} className={fieldClass}>
            {days.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label} ({d.dateLabel})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-slate-600">Jam mulai</span>
        {loadingSlots ? (
          <p className="text-sm text-slate-500">Memuat slot...</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot.hour}
                type="button"
                disabled={!slot.available}
                onClick={() => {
                  setHour(slot.hour);
                  setDurationHours(1);
                }}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                  hour === slot.hour
                    ? "bg-slate-900 text-white"
                    : slot.available
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      : "cursor-not-allowed bg-slate-50 text-slate-300 line-through"
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {hour !== null && maxHours > 0 && (
        <div>
          <span className="mb-2 block text-sm font-medium text-slate-600">Durasi</span>
          <div className="flex flex-wrap gap-2">
            {durationOptions.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setDurationHours(h)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  durationHours === h
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {h} jam
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Nama</span>
          <input
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={fieldClass}
            placeholder="Nama customer"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            No. WA (opsional)
          </span>
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className={fieldClass}
            placeholder="08xxxxxxxxxx"
            inputMode="tel"
          />
        </label>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-slate-600">Status awal</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("active")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold ${
              mode === "active"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Langsung main
          </button>
          <button
            type="button"
            onClick={() => setMode("confirmed")}
            className={`rounded-xl px-4 py-3 text-sm font-semibold ${
              mode === "confirmed"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Dikonfirmasi (belum main)
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}
      {message && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={
          busy ||
          !roomId ||
          hour === null ||
          !customerName ||
          !canBookDuration(hour, durationHours, slots, closeHour)
        }
        className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Menyimpan..." : "Simpan Booking Offline"}
      </button>
    </form>
  );
}
