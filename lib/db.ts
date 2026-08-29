/**
 * Prisma client singleton.
 *
 * Next dev reloads modules on every edit, so a plain `new PrismaClient()` would
 * open a fresh pool each time until Postgres refuses new connections. Caching it
 * on `globalThis` in development keeps that to one.
 */

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  }
  // Prisma 7 talks to Postgres through a driver adapter rather than its own
  // query engine binary.
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
