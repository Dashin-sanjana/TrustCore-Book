import "server-only";
import { db } from "@/lib/db";
// Platform-only exception to tenant scoping; caller must requirePlatformAdmin first.
export function readPlatformOverview() {
  return Promise.all([
    db().business.count(),
    db().user.count(),
    db().business.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      select: { name: true, country: true, timezone: true, slug: true },
    }),
  ]);
}
