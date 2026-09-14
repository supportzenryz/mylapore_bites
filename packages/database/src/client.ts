import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

export interface CreateClientOptions {
  connectionString?: string;
  /** Max pooled connections. Keep api+worker total under Postgres max_connections. */
  maxConnections?: number;
  log?: boolean;
}

/**
 * Prisma 7 runs through a driver adapter, so the pg pool is ours to tune and
 * no native query engine ships in the Docker image.
 */
export function createPrismaClient(options: CreateClientOptions = {}): PrismaClient {
  const connectionString = options.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  }

  const adapter = new PrismaPg({
    connectionString,
    max: options.maxConnections ?? Number(process.env.DB_POOL_SIZE ?? 15),
  });

  return new PrismaClient({
    adapter,
    log: options.log ? ["query", "warn", "error"] : ["warn", "error"],
  });
}

export type { PrismaClient };

/** Exposed so Nest can own the client lifecycle while pooling stays here. */
export function createAdapter(connectionString?: string, max?: number): PrismaPg {
  const conn = connectionString ?? process.env.DATABASE_URL;
  if (!conn) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  return new PrismaPg({ connectionString: conn, max: max ?? Number(process.env.DB_POOL_SIZE ?? 15) });
}
