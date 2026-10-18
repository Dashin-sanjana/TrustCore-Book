import "server-only";
import { db } from "@/lib/db";
export function incrementRateLimit(key: string, expiresAt: Date) {
  return db().rateLimit.upsert({
    where: { key },
    create: { key, count: 1, expiresAt },
    update: { count: { increment: 1 } },
  });
}
export async function checkDatabase() {
  await db().$queryRaw`SELECT 1`;
}
