import { subMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";

/** Pending otomatis batal jika admin belum acc */
export const PENDING_EXPIRE_MINUTES = 10;

/** Maks pending aktif per nomor WA */
export const MAX_PENDING_PER_PHONE = 1;

/** Rate limit booking customer per IP */
export const RATE_LIMIT_MAX = 5;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/** Status yang menahan slot di halaman customer */
export const PUBLIC_SLOT_STATUSES = ["confirmed", "active"] as const;

/** Status yang menahan slot saat admin lock / offline */
export const LOCKED_SLOT_STATUSES = ["confirmed", "active"] as const;

export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8") && digits.length >= 9) return `62${digits}`;
  return digits;
}

export function phoneMatchVariants(raw: string) {
  const normalized = normalizePhone(raw);
  const variants = new Set<string>([raw.replace(/\D/g, ""), normalized]);
  if (normalized.startsWith("62")) {
    variants.add(`0${normalized.slice(2)}`);
    variants.add(normalized.slice(2));
  }
  return [...variants].filter(Boolean);
}

export async function expireStalePendingBookings(
  expireMinutes = PENDING_EXPIRE_MINUTES,
) {
  const cutoff = subMinutes(new Date(), expireMinutes);
  const result = await prisma.booking.updateMany({
    where: {
      status: "pending",
      createdAt: { lt: cutoff },
    },
    data: { status: "cancelled" },
  });
  return result.count;
}

const rateBuckets = new Map<string, number[]>();

export function checkBookingRateLimit(ip: string) {
  const now = Date.now();
  const recent = (rateBuckets.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT_MAX) {
    return {
      allowed: false as const,
      retryAfterSec: Math.ceil(
        (RATE_LIMIT_WINDOW_MS - (now - recent[0])) / 1000,
      ),
    };
  }

  recent.push(now);
  rateBuckets.set(ip, recent);
  return { allowed: true as const };
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}
