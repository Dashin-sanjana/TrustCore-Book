import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export class MembershipDenied extends Error {
  constructor() {
    super("Membership operation denied");
  }
}

export type InvitationRole = "ADMIN" | "MEMBER";

export function canAdminister(
  actor: string | undefined,
  target: string | undefined,
  next?: string,
) {
  if (next && next !== "ADMIN" && next !== "MEMBER") return false;
  if (actor === "OWNER") return target === "ADMIN" || target === "MEMBER";
  return (
    actor === "ADMIN" && target === "MEMBER" && (!next || next === "MEMBER")
  );
}

async function lockBusiness(tx: Prisma.TransactionClient, businessId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE
  `;
  if (!rows[0]) throw new MembershipDenied();
}

async function actorRole(
  tx: Prisma.TransactionClient,
  businessId: string,
  actorId: string,
) {
  const actor = await tx.businessMember.findUnique({
    where: { businessId_userId: { businessId, userId: actorId } },
  });
  return actor?.role;
}

export function listPendingInvitations(
  businessId: string,
  actorRole: "OWNER" | "ADMIN",
) {
  return db().businessInvitation.findMany({
    where: {
      businessId,
      ...(actorRole === "ADMIN" ? { role: "MEMBER" as const } : {}),
      acceptedAt: null,
      declinedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      invitedEmail: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export function createInvitation(data: {
  businessId: string;
  actorId: string;
  email: string;
  role: InvitationRole;
  digest: string;
  expiresAt: Date;
}) {
  return db().$transaction(async (tx) => {
    await lockBusiness(tx, data.businessId);
    if (
      !canAdminister(
        await actorRole(tx, data.businessId, data.actorId),
        "MEMBER",
        data.role,
      )
    )
      throw new MembershipDenied();
    const existing = await tx.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (
      existing &&
      (await tx.businessMember.findUnique({
        where: {
          businessId_userId: {
            businessId: data.businessId,
            userId: existing.id,
          },
        },
      }))
    )
      throw new MembershipDenied();
    await tx.businessInvitation.updateMany({
      where: {
        businessId: data.businessId,
        invitedEmail: data.email,
        acceptedAt: null,
        declinedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    const invite = await tx.businessInvitation.create({
      data: {
        businessId: data.businessId,
        invitedEmail: data.email,
        role: data.role,
        tokenDigest: data.digest,
        invitedById: data.actorId,
        expiresAt: data.expiresAt,
      },
    });
    await tx.auditLog.create({
      data: {
        businessId: data.businessId,
        actorId: data.actorId,
        action: "member.invited",
        entityId: invite.id,
      },
    });
    return invite.id;
  });
}

export function revokeInvitation(
  businessId: string,
  actorId: string,
  invitationId: string,
) {
  return db().$transaction(async (tx) => {
    await lockBusiness(tx, businessId);
    const invite = await tx.businessInvitation.findFirst({
      where: {
        id: invitationId,
        businessId,
        acceptedAt: null,
        declinedAt: null,
        revokedAt: null,
      },
    });
    if (
      !invite ||
      !canAdminister(await actorRole(tx, businessId, actorId), invite.role)
    )
      throw new MembershipDenied();
    await tx.businessInvitation.update({
      where: { id: invite.id },
      data: { revokedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        businessId,
        actorId,
        action: "member.invitation_revoked",
        entityId: invite.id,
      },
    });
  });
}

export function revokeUndeliveredInvitation(invitationId: string) {
  return db().businessInvitation.updateMany({
    where: {
      id: invitationId,
      acceptedAt: null,
      declinedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export function redeemInvitation(
  digest: string,
  userId: string,
  accept: boolean,
) {
  return db().$transaction(async (tx) => {
    const candidate = await tx.businessInvitation.findUnique({
      where: { tokenDigest: digest },
      select: { businessId: true },
    });
    if (!candidate) throw new MembershipDenied();
    await lockBusiness(tx, candidate.businessId);
    const invite = await tx.businessInvitation.findUnique({
      where: { tokenDigest: digest },
    });
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerifiedAt: true },
    });
    if (
      !invite ||
      !user ||
      !user.emailVerifiedAt ||
      user.email.trim().toLowerCase() !== invite.invitedEmail ||
      invite.acceptedAt ||
      invite.declinedAt ||
      invite.revokedAt ||
      invite.expiresAt <= new Date()
    )
      throw new MembershipDenied();
    if (
      !canAdminister(
        await actorRole(tx, invite.businessId, invite.invitedById),
        "MEMBER",
        invite.role,
      )
    )
      throw new MembershipDenied();
    if (accept) {
      await tx.businessMember.create({
        data: { businessId: invite.businessId, userId, role: invite.role },
      });
    }
    await tx.businessInvitation.update({
      where: { id: invite.id },
      data: accept
        ? { acceptedAt: new Date(), acceptedById: userId }
        : { declinedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        businessId: invite.businessId,
        actorId: userId,
        action: accept
          ? "member.invitation_accepted"
          : "member.invitation_declined",
        entityId: invite.id,
      },
    });
    return invite.businessId;
  });
}

export function changeMembership(
  businessId: string,
  actorId: string,
  targetId: string,
  next?: InvitationRole,
) {
  return db().$transaction(async (tx) => {
    await lockBusiness(tx, businessId);
    const target = await tx.businessMember.findFirst({
      where: { id: targetId, businessId },
    });
    if (
      !target ||
      !canAdminister(
        await actorRole(tx, businessId, actorId),
        target.role,
        next,
      )
    )
      throw new MembershipDenied();
    if (next)
      await tx.businessMember.update({
        where: { id: target.id },
        data: { role: next },
      });
    else await tx.businessMember.delete({ where: { id: target.id } });
    await tx.auditLog.create({
      data: {
        businessId,
        actorId,
        action: next ? "member.role_changed" : "member.removed",
        entityId: target.id,
      },
    });
  });
}

export function transferOwnership(
  businessId: string,
  actorId: string,
  targetId: string,
) {
  return db().$transaction(async (tx) => {
    await lockBusiness(tx, businessId);
    const actor = await tx.businessMember.findUnique({
      where: { businessId_userId: { businessId, userId: actorId } },
    });
    const target = await tx.businessMember.findFirst({
      where: { id: targetId, businessId },
      include: { user: { select: { emailVerifiedAt: true } } },
    });
    if (
      actor?.role !== "OWNER" ||
      !target ||
      target.role === "OWNER" ||
      !target.user.emailVerifiedAt
    )
      throw new MembershipDenied();
    await tx.businessMember.update({
      where: { id: target.id },
      data: { role: "OWNER" },
    });
    await tx.businessMember.update({
      where: { id: actor.id },
      data: { role: "ADMIN" },
    });
    await tx.auditLog.create({
      data: {
        businessId,
        actorId,
        action: "member.ownership_transferred",
        entityId: target.id,
      },
    });
  });
}
