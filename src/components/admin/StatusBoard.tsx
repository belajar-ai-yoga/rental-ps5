"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STATUS_LABEL, type RoomLiveStatus } from "@/lib/room-status";

type RoomCard = {
  id: string;
  name: string;
  consoleType: string;
  status: RoomLiveStatus;
  currentBooking: {
    id: string;
    code: string;
    customerName: string;
    startAt: string;
    endAt: string;
    status: string;
  } | null;
};

const tone: Record<RoomLiveStatus, string> = {
  kosong: "border-emerald-300 bg-emerald-50",
  dibooking: "border-amber-300 bg-amber-50",
  terisi: "border-rose-300 bg-rose-50",
};

const badge: Record<RoomLiveStatus, string> = {
  kosong: "bg-emerald-600 text-white",
  dibooking: "bg-amber-500 text-white",
  terisi: "bg-rose-500 text-white",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Makassar",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StatusBoard({ rooms }: { rooms: RoomCard[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateBooking(bookingId: string, status: string) {
    setLoadingId(bookingId);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Status Room</h2>
        <p className="text-slate-500">Pantau room kosong, dibooking, atau terisi</p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => (
          <article
            key={room.id}
            className={`rounded-3xl border-2 p-5 ${tone[room.status]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{room.name}</h3>
                <p className="text-sm text-slate-600">{room.consoleType}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${badge[room.status]}`}
              >
                {STATUS_LABEL[room.status]}
              </span>
            </div>

            {room.currentBooking ? (
              <div className="mt-5 space-y-1 text-sm text-slate-700">
                <p className="text-lg font-semibold text-slate-900">
                  {room.currentBooking.customerName}
                </p>
                <p>
                  {formatTime(room.currentBooking.startAt)} –{" "}
                  {formatTime(room.currentBooking.endAt)}
                </p>
                <p className="text-slate-500">{room.currentBooking.code}</p>
              </div>
            ) : (
              <p className="mt-5 text-slate-600">Tidak ada booking aktif</p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {room.currentBooking?.status === "pending" && (
                <>
                  <button
                    type="button"
                    disabled={loadingId === room.currentBooking.id}
                    onClick={() =>
                      updateBooking(room.currentBooking!.id, "confirmed")
                    }
                    className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Konfirmasi
                  </button>
                  <button
                    type="button"
                    disabled={loadingId === room.currentBooking.id}
                    onClick={() =>
                      updateBooking(room.currentBooking!.id, "cancelled")
                    }
                    className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-300"
                  >
                    Batal
                  </button>
                </>
              )}
              {room.currentBooking?.status === "confirmed" && (
                <>
                  <button
                    type="button"
                    disabled={loadingId === room.currentBooking.id}
                    onClick={() =>
                      updateBooking(room.currentBooking!.id, "active")
                    }
                    className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Mulai
                  </button>
                  <button
                    type="button"
                    disabled={loadingId === room.currentBooking.id}
                    onClick={() =>
                      updateBooking(room.currentBooking!.id, "cancelled")
                    }
                    className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-300"
                  >
                    Batal
                  </button>
                </>
              )}
              {room.currentBooking?.status === "active" && (
                <button
                  type="button"
                  disabled={loadingId === room.currentBooking.id}
                  onClick={() =>
                    updateBooking(room.currentBooking!.id, "completed")
                  }
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Selesai
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
