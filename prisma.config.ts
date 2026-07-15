import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma migrate butuh DIRECT_URL (non-pooler). App runtime pakai DATABASE_URL (pooler).
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
