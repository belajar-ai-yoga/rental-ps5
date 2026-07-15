import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum di-set");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
  });

  try {
    const passwordHash = await hash("admin05", 10);
    const updated = await prisma.adminUser.update({
      where: { email: "admin@rentalps.local" },
      data: { passwordHash },
    });
    console.log("Password admin berhasil diganti untuk:", updated.email);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
