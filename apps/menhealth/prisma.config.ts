import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Use the direct (non-pooler) URL for migrations so Prisma can introspect
    // the schema. At runtime, DATABASE_URL should point to the Supabase
    // connection pooler (port 6543, transaction mode) for serverless compatibility.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"]!,
  },
});
