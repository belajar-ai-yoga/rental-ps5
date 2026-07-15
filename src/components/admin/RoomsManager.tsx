"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RoomRow = {
  id: string;
  name: string;
  consoleType: string;
  pricePerHour: number;
  isActive: boolean;
  status: string;
};

const fieldClass =
  "rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-400";

export function RoomsManager({ rooms }: { rooms: RoomRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [consoleType, setConsoleType] = useState("PS5");
  const [pricePerHour, setPricePerHour] = useState(25000);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addRoom(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, consoleType, pricePerHour }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah room");
      setName("");
      setPricePerHour(25000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah room");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(room: RoomRow) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !room.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal update room");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal update room");
    } finally {
      setBusy(false);
    }
  }

  async function renameRoom(room: RoomRow) {
    const next = window.prompt("Nama room baru", room.name);
    if (!next || !next.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal rename");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal rename");
    } finally {
      setBusy(false);
    }
  }

  async function editPrice(room: RoomRow) {
    const next = window.prompt(
      "Tarif per jam (Rp)",
      String(room.pricePerHour),
    );
    if (next === null) return;
    const value = Number(next.replace(/\D/g, ""));
    if (Number.isNaN(value) || value < 0) {
      setError("Tarif tidak valid");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricePerHour: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal ubah tarif");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal ubah tarif");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Kelola Room</h2>
        <p className="text-slate-500">
          Tambah, rename, ubah tarif, atau nonaktifkan room
        </p>
      </div>

      <form
        onSubmit={addRoom}
        className="mb-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:grid-cols-[1fr_120px_140px_auto]"
      >
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama room baru"
          className={fieldClass}
        />
        <select
          value={consoleType}
          onChange={(e) => setConsoleType(e.target.value)}
          className={fieldClass}
        >
          <option value="PS5">PS5</option>
          <option value="PS4">PS4</option>
        </select>
        <input
          type="number"
          min={0}
          required
          value={pricePerHour}
          onChange={(e) => setPricePerHour(Number(e.target.value))}
          placeholder="Tarif/jam"
          className={fieldClass}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          Tambah Room
        </button>
      </form>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {rooms.map((room) => (
          <article
            key={room.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          >
            <div>
              <p className="text-lg font-bold text-slate-900">{room.name}</p>
              <p className="text-sm text-slate-500">
                {room.consoleType} · Rp {room.pricePerHour.toLocaleString("id-ID")}
                /jam · {room.isActive ? "Aktif" : "Nonaktif"} · {room.status}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => renameRoom(room)}
                className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Rename
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => editPrice(room)}
                className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Ubah Tarif
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => toggleActive(room)}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
              >
                {room.isActive ? "Nonaktifkan" : "Reaktifkan"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
