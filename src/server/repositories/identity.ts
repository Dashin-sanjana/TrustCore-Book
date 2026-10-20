import "server-only";
import { db } from "@/lib/db";
import type { AccountTokenPurpose } from "@/generated/prisma/client";
export function findCredentialsUser(email: string) {
  return db().user.findUnique({ where: { email } });
}
export function createCredentialsUser(data: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  return db().user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      emailVerificationRequired: false,
    },
    select: { id: true },
  });
}
export function createSession(
  userId: string,
  credentialVersion: number,
  expiresAt: Date,
) {
  return db().$transaction(async (tx) => {
    // Serialize session creation with password changes that update this user row.
    const users = await tx.$queryRaw<
      {
        credentialVersion: number;
        emailVerificationRequired: boolean;
        emailVerifiedAt: Date | null;
      }[]
    >`SELECT "credentialVersion", "emailVerificationRequired", "emailVerifiedAt" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const user = users[0];
    if (
      !user ||
      user.credentialVersion !== credentialVersion ||
      (user.emailVerificationRequired && !user.emailVerifiedAt)
    )
      return null;
    return tx.refreshSession.create({
      data: { userId, credentialVersion, expiresAt },
    });
  });
}
export async function findActiveSession(id: string, userId: string) {
  const record = await db().refreshSession.findFirst({
    where: { id, userId, revokedAt: null, expiresAt: { gt: new Date() } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          platformAdmin: true,
          credentialVersion: true,
          emailVerificationRequired: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      },
    },
  });
  return record &&
    record.credentialVersion === record.user.credentialVersion &&
    (!record.user.emailVerificationRequired || !!record.user.emailVerifiedAt)
    ? record
    : null;
}
export function revokeSession(id: string) {
  return db().refreshSession.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
export function listOwnSessions(userId: string, credentialVersion: number) {
  return db().refreshSession.findMany({
    where: {
      userId,
      credentialVersion,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
export function revokeOwnSession(userId: string, id: string) {
  return db().refreshSession.updateMany({
    where: { id, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
export function revokeAllOwnSessions(userId: string) {
  return db().refreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
export function updateOwnName(userId: string, name: string) {
  return db().user.update({
    where: { id: userId },
    data: { name },
    select: { id: true, name: true, email: true },
  });
}
export function findOwnPassword(userId: string) {
  return db().user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
}
export function findUserForEmail(email: string) {
  return db().user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      emailVerificationRequired: true,
      emailVerifiedAt: true,
    },
  });
}
export function createAccountSecurityToken(data: {
  userId: string;
  purpose: AccountTokenPurpose;
  digest: string;
  expiresAt: Date;
}) {
  return db().accountSecurityToken.create({ data, select: { id: true } });
}
export function hasRedeemableResetToken(digest: string, now = new Date()) {
  return db().accountSecurityToken.findFirst({
    where: {
      digest,
      purpose: "RESET_PASSWORD",
      consumedAt: null,
      expiresAt: { gt: now },
    },
    select: { id: true },
  });
}
export function redeemVerificationToken(digest: string, now = new Date()) {
  return db().$transaction(async (tx) => {
    const token = await tx.accountSecurityToken.findUnique({
      where: { digest },
      select: { id: true, userId: true },
    });
    if (!token) return false;
    const claimed = await tx.accountSecurityToken.updateMany({
      where: {
        id: token.id,
        purpose: "VERIFY_EMAIL",
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    if (claimed.count !== 1) return false;
    await tx.user.update({
      where: { id: token.userId },
      data: { emailVerifiedAt: now },
    });
    return true;
  });
}
export function redeemResetToken(
  digest: string,
  passwordHash: string,
  now = new Date(),
) {
  return db().$transaction(async (tx) => {
    const token = await tx.accountSecurityToken.findUnique({
      where: { digest },
      select: { id: true, userId: true },
    });
    if (!token) return false;
    const claimed = await tx.accountSecurityToken.updateMany({
      where: {
        id: token.id,
        purpose: "RESET_PASSWORD",
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    if (claimed.count !== 1) return false;
    await tx.user.update({
      where: { id: token.userId },
      data: { passwordHash, credentialVersion: { increment: 1 } },
    });
    await tx.refreshSession.updateMany({
      where: { userId: token.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.accountSecurityToken.updateMany({
      where: {
        userId: token.userId,
        purpose: "RESET_PASSWORD",
        consumedAt: null,
      },
      data: { consumedAt: now },
    });
    return true;
  });
}
export function replaceOwnPasswordAndRevokeSessions(
  userId: string,
  previousHash: string,
  passwordHash: string,
) {
  return db().$transaction(async (tx) => {
    const changed = await tx.user.updateMany({
      where: { id: userId, passwordHash: previousHash },
      data: { passwordHash, credentialVersion: { increment: 1 } },
    });
    if (changed.count !== 1) return false;
    await tx.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return true;
  });
}
