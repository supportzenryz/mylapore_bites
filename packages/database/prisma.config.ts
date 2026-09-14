import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Driver-adapter configuration.
 *
 * Prisma 7 runs migrate and generate through the pg driver + WASM engine,
 * so no native Rust binaries are downloaded at install or build time. That
 * keeps the Docker image small and the CI build free of a binary CDN
 * dependency.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx src/seed.ts",
  },
  adapter: async () =>
    new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
