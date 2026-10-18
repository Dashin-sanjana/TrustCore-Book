import "server-only";
import { db } from "@/lib/db";
export function findMembership(businessId: string, userId: string) {
  return db().businessMember.findUnique({
    where: { businessId_userId: { businessId, userId } },
    include: { business: true },
  });
}
export function listMemberships(userId: string) {
  return db().businessMember.findMany({
    where: { userId },
    include: { business: true },
    orderBy: { id: "asc" },
  });
}
