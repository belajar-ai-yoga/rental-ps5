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

  const passwordHash = await hash("admin05", 10);
  await prisma.adminUser.upsert({
    where: { email: "admin@rentalps.local" },
    update: { passwordHash },
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
        { name: "Room 1", consoleType: "PS5", pricePerHour: 35000, sortOrder: 1 },
        { name: "Room 2", consoleType: "PS5", pricePerHour: 30000, sortOrder: 2 },
        { name: "Room 3", consoleType: "PS5", pricePerHour: 30000, sortOrder: 3 },
        { name: "Room 4", consoleType: "PS4", pricePerHour: 20000, sortOrder: 4 },
        { name: "Room 5", consoleType: "PS4", pricePerHour: 18000, sortOrder: 5 },
      ],
    });
  } else {
    // Pastikan room lama juga punya tarif berbeda (sekali isi bila masih default seragam)
    const rooms = await prisma.room.findMany({ orderBy: { sortOrder: "asc" } });
    const defaults = [35000, 30000, 30000, 20000, 18000];
    const allSame = rooms.every((r) => r.pricePerHour === rooms[0]?.pricePerHour);
    if (allSame) {
      for (let i = 0; i < rooms.length; i += 1) {
        await prisma.room.update({
          where: { id: rooms[i].id },
          data: { pricePerHour: defaults[i] ?? 25000 },
        });
      }
    }
  }

  console.log("Seed selesai.");
  console.log("Login admin: admin@rentalps.local / admin05");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
