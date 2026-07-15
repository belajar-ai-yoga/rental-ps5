import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

type WhatsAppBookingPayload = {
  shopName: string;
  whatsappNumber: string;
  code: string;
  customerName: string;
  customerPhone: string;
  roomName: string;
  startAt: Date;
  endAt: Date;
  durationHours?: number;
  pricePerHour?: number;
};

export function normalizeWhatsAppNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }
  return digits;
}

export function buildWhatsAppBookingUrl(payload: WhatsAppBookingPayload) {
  const phone = normalizeWhatsAppNumber(payload.whatsappNumber);
  const tanggal = format(payload.startAt, "EEEE, d MMMM yyyy", {
    locale: localeId,
  });
  const jam = `${format(payload.startAt, "HH:mm")}–${format(payload.endAt, "HH:mm")}`;

  const lines = [
    `Halo ${payload.shopName}!`,
    `Saya ingin booking rental PS.`,
    ``,
    `Kode: ${payload.code}`,
    `Nama: ${payload.customerName}`,
    `WA: ${payload.customerPhone}`,
    `Room: ${payload.roomName}`,
    `Tanggal: ${tanggal}`,
    `Jam: ${jam}`,
  ];

  if (payload.durationHours && payload.durationHours > 1) {
    lines.push(`Durasi: ${payload.durationHours} jam`);
  }

  if (payload.pricePerHour) {
    const hours = payload.durationHours ?? 1;
    const total = payload.pricePerHour * hours;
    lines.push(
      `Estimasi: Rp ${total.toLocaleString("id-ID")} (${payload.pricePerHour.toLocaleString("id-ID")}/jam × ${hours} jam)`,
    );
  }

  lines.push(
    ``,
    `Mohon konfirmasinya dalam 10 menit ya. Terima kasih!`,
  );

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${phone}?text=${text}`;
}
