import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { accountEmailDelivery } from "./account-email";
import { requireTenant, requireUser } from "./authorization";
import { getEnv } from "@/lib/env";
import { rateLimit, RateLimitExceededError } from "./rate-limit";
import {
  changeMembership,
  createInvitation,
  listPendingInvitations,
  redeemInvitation,
  revokeInvitation,
  revokeUndeliveredInvitation,
  transferOwnership,
} from "./repositories/invitations";
import { accountEmailSchema } from "@/lib/validation";

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const inviteSchema = accountEmailSchema.extend({
  role: z.enum(["ADMIN", "MEMBER"]),
});
const roleSchema = z.object({
  targetId: idSchema,
  role: z.enum(["ADMIN", "MEMBER"]),
});
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const UNAVAILABLE = { error: "Member management is not available yet." };
const DENIED = { error: "Unable to complete member request." };
type MembershipResult = {
  error?: string;
  success?: string;
  businessId?: string;
};

export function a2Enabled() {
  return process.env.A2_MEMBERSHIP_ENABLED === "true";
}

export function digestInvitationToken(token: string) {
  return TOKEN.test(token)
    ? createHash("sha256").update(`INVITATION:${token}`).digest("hex")
    : null;
}

function issueInvitationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, digest: digestInvitationToken(token)! };
}

export async function pendingInvitations(businessId: string) {
  if (!a2Enabled()) return [];
  const scope = await requireTenant(businessId, true);
  return listPendingInvitations(
    businessId,
    scope.member.role === "OWNER" ? "OWNER" : "ADMIN",
  );
}

export async function inviteMember(
  businessId: string,
  input: unknown,
): Promise<MembershipResult> {
  if (!a2Enabled()) return UNAVAILABLE;
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter an email and role." };
  const scope = await requireTenant(businessId, true);
  const delivery = accountEmailDelivery();
  if (!delivery.configured)
    return { error: "Invitation email delivery is unavailable." };
  try {
    await rateLimit(`invitation:${businessId}`, 30);
    await rateLimit(`invitation:${businessId}:${parsed.data.email}`, 5);
    if (delivery.preflight && !(await delivery.preflight()))
      return { error: "Invitation email delivery is unavailable." };
    const token = issueInvitationToken();
    const invitationId = await createInvitation({
      businessId,
      actorId: scope.user.id,
      email: parsed.data.email,
      role: parsed.data.role,
      digest: token.digest,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
    });
    const link = new URL("/invitations", getEnv().NEXTAUTH_URL);
    link.hash = `token=${token.token}`;
    const result = await delivery.send({
      kind: "INVITATION",
      recipient: parsed.data.email,
      link: link.toString(),
    });
    if (!result.delivered) {
      await revokeUndeliveredInvitation(invitationId);
      return { error: "Invitation delivery failed. Please retry." };
    }
    return {
      success:
        process.env.ACCOUNT_EMAIL_PROVIDER === "local"
          ? "Invitation available in the development outbox."
          : "Invitation sent.",
    };
  } catch (error) {
    return {
      error:
        error instanceof RateLimitExceededError
          ? "Too many invitations. Try again later."
          : DENIED.error,
    };
  }
}

export async function cancelInvitation(
  businessId: string,
  invitationId: unknown,
): Promise<MembershipResult> {
  if (!a2Enabled()) return UNAVAILABLE;
  if (!idSchema.safeParse(invitationId).success) return DENIED;
  const scope = await requireTenant(businessId, true);
  try {
    await revokeInvitation(businessId, scope.user.id, invitationId as string);
    return { success: "Invitation cancelled." };
  } catch {
    return DENIED;
  }
}

export async function respondToInvitation(
  token: unknown,
  accept: boolean,
): Promise<MembershipResult> {
  if (!a2Enabled()) return UNAVAILABLE;
  const user = await requireUser();
  const digest =
    typeof token === "string" ? digestInvitationToken(token) : null;
  if (!digest) return { error: "Invalid or expired invitation." };
  try {
    await rateLimit(`invitation-redeem:${digest}`, 10);
    const businessId = await redeemInvitation(digest, user.id, accept);
    return {
      success: accept ? "Invitation accepted." : "Invitation declined.",
      businessId,
    };
  } catch {
    return { error: "Invalid or expired invitation." };
  }
}

export async function setMemberRole(
  businessId: string,
  input: unknown,
): Promise<MembershipResult> {
  if (!a2Enabled()) return UNAVAILABLE;
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return DENIED;
  const scope = await requireTenant(businessId, true);
  try {
    await changeMembership(
      businessId,
      scope.user.id,
      parsed.data.targetId,
      parsed.data.role,
    );
    return { success: "Role updated." };
  } catch {
    return DENIED;
  }
}

export async function removeMember(
  businessId: string,
  targetId: unknown,
): Promise<MembershipResult> {
  if (!a2Enabled()) return UNAVAILABLE;
  if (!idSchema.safeParse(targetId).success) return DENIED;
  const scope = await requireTenant(businessId, true);
  try {
    await changeMembership(businessId, scope.user.id, targetId as string);
    return { success: "Member removed." };
  } catch {
    return DENIED;
  }
}

export async function transferBusinessOwnership(
  businessId: string,
  targetId: unknown,
): Promise<MembershipResult> {
  if (!a2Enabled()) return UNAVAILABLE;
  if (!idSchema.safeParse(targetId).success) return DENIED;
  const scope = await requireTenant(businessId, true);
  try {
    await transferOwnership(businessId, scope.user.id, targetId as string);
    return { success: "Ownership transferred." };
  } catch {
    return DENIED;
  }
}
