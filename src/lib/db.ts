import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getEnv } from "./env";
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export function db() {
  if (!globalDb.prisma)
    globalDb.prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: getEnv().DATABASE_URL,
        max: 5,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 10000,
      }),
    });
  return globalDb.prisma;
}
