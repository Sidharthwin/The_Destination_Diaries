import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Used by the Prisma CLI (migrations, introspection): prefer the direct
    // connection. The app itself connects through the pg driver adapter using
    // DATABASE_URL (see src/server/db/prisma.ts).
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      "postgresql://localhost:5432/placeholder",
  },
});
