import "server-only";
import { db } from "@/lib/db";
export function findCredentialsUser(email: string) {
  return db().user.findUnique({ where: { email } });
}
export function createCredentialsUser(data: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  return db().user.create({ data, select: { id: true } });
}
export function createSession(userId: string, expiresAt: Date) {
  return db().refreshSession.create({ data: { userId, expiresAt } });
}
export function findActiveSession(id: string, userId: string) {
  return db().refreshSession.findFirst({
    where: { id, userId, revokedAt: null, expiresAt: { gt: new Date() } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          platformAdmin: true,
          createdAt: true,
        },
      },
    },
  });
}
export function revokeSession(id: string) {
  return db().refreshSession.updateMany({
    where: { id },
    data: { revokedAt: new Date() },
  });
}
