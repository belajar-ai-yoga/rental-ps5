import type { HourSlot } from "@/lib/booking-window";

export type RoomAvailability = "ada_slot" | "hampir_penuh" | "penuh";

export const AVAILABILITY_LABEL: Record<RoomAvailability, string> = {
  ada_slot: "Ada slot",
  hampir_penuh: "Hampir penuh",
  penuh: "Penuh hari ini",
};

export function resolveDayAvailability(
  slots: Pick<HourSlot, "available" | "past">[],
) {
  const bookable = slots.filter((slot) => !slot.past);
  const total = bookable.length;
  const available = bookable.filter((slot) => slot.available).length;

  if (total === 0 || available === 0) {
    return {
      availability: "penuh" as const,
      label: AVAILABILITY_LABEL.penuh,
      availableCount: 0,
      totalCount: total,
    };
  }

  const ratio = available / total;
  const hampirPenuh = available <= 2 || ratio <= 0.25;

  if (hampirPenuh) {
    return {
      availability: "hampir_penuh" as const,
      label: AVAILABILITY_LABEL.hampir_penuh,
      availableCount: available,
      totalCount: total,
    };
  }

  return {
    availability: "ada_slot" as const,
    label: AVAILABILITY_LABEL.ada_slot,
    availableCount: available,
    totalCount: total,
  };
}
