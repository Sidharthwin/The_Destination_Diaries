import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Pooled connection for the app (Supabase transaction pooler, port 6543).
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder",
    // Direct connection for migrations (port 5432).
    directUrl: process.env.DIRECT_URL,
  },
});
