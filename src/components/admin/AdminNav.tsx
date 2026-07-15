"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/admin", label: "Status" },
  { href: "/admin/bookings", label: "Booking" },
  { href: "/admin/rooms", label: "Room" },
  { href: "/admin/settings", label: "Setting" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col gap-2 border-b border-slate-200 bg-white p-4 md:min-h-screen md:w-56 md:border-r md:border-b-0">
      <div className="mb-2">
        <p className="text-xs tracking-widest text-slate-400 uppercase">Admin</p>
        <h1 className="text-lg font-bold text-slate-900">Rental PS</h1>
      </div>
      <nav className="flex flex-wrap gap-2 md:flex-col">
        {links.map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/admin/login" })}
        className="mt-auto rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Keluar
      </button>
    </aside>
  );
}
