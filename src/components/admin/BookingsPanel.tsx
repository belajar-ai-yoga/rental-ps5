"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type BookingRow = {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  startAt: string;
  endAt: string;
  status: string;
  createdAt: string;
  roomId: string;
  room: { name: string };
};

type RoomOption = { id: string; name: string };
type DayOption = { key: string; label: string; dateLabel: string };

const statusLabel: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  active: "Sedang main",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pendingMinutesLeft(createdAt: string) {
  const expireAt = new Date(createdAt).getTime() + 10 * 60 * 1000;
  const left = Math.max(0, Math.ceil((expireAt - Date.now()) / 60000));
  return left;
}

export function BookingsPanel({
  bookings,
  rooms,
  days,
  openHour,
  closeHour,
}: {
  bookings: BookingRow[];
  rooms: RoomOption[];
  days: DayOption[];
  openHour: number;
  closeHour: number;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveRoomId, setMoveRoomId] = useState("");
  const [moveDay, setMoveDay] = useState(days[0]?.key ?? "");
  const [moveHour, setMoveHour] = useState(openHour);
  const [moveDuration, setMoveDuration] = useState(1);

  const hourOptions = useMemo(() => {
    const list: number[] = [];
    for (let h = openHour; h < closeHour; h += 1) list.push(h);
    return list;
  }, [openHour, closeHour]);

  async function updateStatus(id: string, status: string) {
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal update");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal update");
    } finally {
      setLoadingId(null);
    }
  }

  function openMove(booking: BookingRow) {
    const start = new Date(booking.startAt);
    const end = new Date(booking.endAt);
    const dayKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    setMovingId(booking.id);
    setMoveRoomId(booking.roomId);
    setMoveDay(dayKey);
    setMoveHour(start.getHours());
    setMoveDuration(
      Math.max(1, Math.round((end.getTime() - start.getTime()) / 3600000)),
    );
  }

  async function submitMove(id: string) {
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reschedule: true,
          roomId: moveRoomId,
          day: moveDay,
          hour: moveHour,
          durationHours: moveDuration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal pindah jam");
      setMovingId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal pindah jam");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Booking</h2>
        <p className="text-slate-500">
          Pending & jadwal hari ini · pending otomatis batal setelah 10 menit
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {bookings.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-slate-500 shadow-sm">
          Belum ada booking.
        </p>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <article
              key={booking.id}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {booking.customerName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {booking.room.name} · {formatDateTime(booking.startAt)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {booking.customerPhone} · {booking.code}
                  </p>
                  {booking.status === "pending" && (
                    <p className="mt-1 text-xs font-medium text-amber-600">
                      Auto-batal dalam ~{pendingMinutesLeft(booking.createdAt)}{" "}
                      menit jika belum di-acc
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  {statusLabel[booking.status] ?? booking.status}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {booking.status === "pending" && (
                  <>
                    <ActionButton
                      label="Konfirmasi"
                      loading={loadingId === booking.id}
                      onClick={() => updateStatus(booking.id, "confirmed")}
                    />
                    <ActionButton
                      label="Pindah jam"
                      variant="ghost"
                      loading={loadingId === booking.id}
                      onClick={() => openMove(booking)}
                    />
                    <ActionButton
                      label="Batal"
                      variant="ghost"
                      loading={loadingId === booking.id}
                      onClick={() => updateStatus(booking.id, "cancelled")}
                    />
                  </>
                )}
                {booking.status === "confirmed" && (
                  <>
                    <ActionButton
                      label="Mulai"
                      loading={loadingId === booking.id}
                      onClick={() => updateStatus(booking.id, "active")}
                    />
                    <ActionButton
                      label="Pindah jam"
                      variant="ghost"
                      loading={loadingId === booking.id}
                      onClick={() => openMove(booking)}
                    />
                    <ActionButton
                      label="Batal"
                      variant="ghost"
                      loading={loadingId === booking.id}
                      onClick={() => updateStatus(booking.id, "cancelled")}
                    />
                  </>
                )}
                {booking.status === "active" && (
                  <ActionButton
                    label="Selesai"
                    loading={loadingId === booking.id}
                    onClick={() => updateStatus(booking.id, "completed")}
                  />
                )}
              </div>

              {movingId === booking.id && (
                <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-800">
                    Alihkan ke jam lain (setelah sepakat di WhatsApp)
                  </p>
                  <div className="grid gap-2 md:grid-cols-4">
                    <select
                      value={moveRoomId}
                      onChange={(e) => setMoveRoomId(e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={moveDay}
                      onChange={(e) => setMoveDay(e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      {days.map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={moveHour}
                      onChange={(e) => setMoveHour(Number(e.target.value))}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      {hourOptions.map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                    <select
                      value={moveDuration}
                      onChange={(e) => setMoveDuration(Number(e.target.value))}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      {[1, 2, 3, 4, 5, 6].map((h) => (
                        <option key={h} value={h}>
                          {h} jam
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      label="Simpan pindahan"
                      loading={loadingId === booking.id}
                      onClick={() => submitMove(booking.id)}
                    />
                    <ActionButton
                      label="Tutup"
                      variant="ghost"
                      loading={false}
                      onClick={() => setMovingId(null)}
                    />
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  loading,
  variant = "solid",
}: {
  label: string;
  onClick: () => void;
  loading: boolean;
  variant?: "solid" | "ghost";
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={`rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50 ${
        variant === "solid"
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-700 ring-1 ring-slate-300"
      }`}
    >
      {label}
    </button>
  );
}
