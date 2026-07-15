import { prisma } from "@/lib/prisma";

export async function getSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (settings) return settings;

  return prisma.settings.create({
    data: {
      id: 1,
      whatsappNumber: "6281234567890",
      openHour: 10,
      closeHour: 22,
      bookingWindowDays: 3,
      pricePerHour: 25000,
      shopName: "Rental PS Arena",
    },
  });
}
