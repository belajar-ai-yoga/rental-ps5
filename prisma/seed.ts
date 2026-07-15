import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL belum di-set");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      whatsappNumber: "6281234567890",
      openHour: 10,
      closeHour: 22,
      bookingWindowDays: 3,
      pricePerHour: 25000,
      shopName: "Rental PS Arena",
    },
  });

  const passwordHash = await hash("admin123", 10);
  await prisma.adminUser.upsert({
    where: { email: "admin@rentalps.local" },
    update: {},
    create: {
      email: "admin@rentalps.local",
      passwordHash,
      name: "Admin",
    },
  });

  const existingRooms = await prisma.room.count();
  if (existingRooms === 0) {
    await prisma.room.createMany({
      data: [
        { name: "Room 1", consoleType: "PS5", sortOrder: 1 },
        { name: "Room 2", consoleType: "PS5", sortOrder: 2 },
        { name: "Room 3", consoleType: "PS5", sortOrder: 3 },
        { name: "Room 4", consoleType: "PS4", sortOrder: 4 },
        { name: "Room 5", consoleType: "PS4", sortOrder: 5 },
      ],
    });
  }

  console.log("Seed selesai.");
  console.log("Login admin: admin@rentalps.local / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
