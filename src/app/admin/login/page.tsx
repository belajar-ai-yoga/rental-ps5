"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@rentalps.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setBusy(false);

    if (result?.error) {
      setError("Email atau password salah.");
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="admin-body flex min-h-screen items-center justify-center p-5">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200"
      >
        <div>
          <p className="text-xs tracking-widest text-slate-400 uppercase">
            Admin
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Masuk Dashboard</h1>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-400"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            Password
          </span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-400"
          />
        </label>

        {error && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Masuk..." : "Masuk"}
        </button>

        <Link
          href="/"
          className="block text-center text-sm text-slate-500 hover:text-slate-800"
        >
          ← Kembali ke halaman booking
        </Link>
      </form>
    </main>
  );
}
