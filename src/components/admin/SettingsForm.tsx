"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Settings = {
  shopName: string;
  whatsappNumber: string;
  openHour: number;
  closeHour: number;
  bookingWindowDays: number;
  pricePerHour: number;
};

const fieldClass =
  "w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-400";

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal simpan");
      setForm(data);
      setMessage("Pengaturan tersimpan.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal simpan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Setting</h2>
        <p className="text-slate-500">WhatsApp, jam buka, dan harga</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            Nama Toko
          </span>
          <input
            value={form.shopName}
            onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            className={fieldClass}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            Nomor WhatsApp Admin
          </span>
          <input
            value={form.whatsappNumber}
            onChange={(e) =>
              setForm({ ...form, whatsappNumber: e.target.value })
            }
            className={fieldClass}
            placeholder="628xxxxxxxxxx"
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">
              Jam Buka
            </span>
            <input
              type="number"
              min={0}
              max={23}
              value={form.openHour}
              onChange={(e) =>
                setForm({ ...form, openHour: Number(e.target.value) })
              }
              className={fieldClass}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">
              Jam Tutup
            </span>
            <input
              type="number"
              min={1}
              max={24}
              value={form.closeHour}
              onChange={(e) =>
                setForm({ ...form, closeHour: Number(e.target.value) })
              }
              className={fieldClass}
              required
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            Window Booking (hari)
          </span>
          <input
            type="number"
            min={1}
            max={14}
            value={form.bookingWindowDays}
            onChange={(e) =>
              setForm({ ...form, bookingWindowDays: Number(e.target.value) })
            }
            className={fieldClass}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            Harga / Jam (Rp)
          </span>
          <input
            type="number"
            min={0}
            value={form.pricePerHour}
            onChange={(e) =>
              setForm({ ...form, pricePerHour: Number(e.target.value) })
            }
            className={fieldClass}
            required
          />
        </label>

        {message && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </div>
  );
}
