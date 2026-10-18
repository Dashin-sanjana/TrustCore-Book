import "server-only";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { findActiveSession } from "./repositories/identity";
import { findMembership } from "./repositories/membership";
const verifiedTenant: unique symbol = Symbol("verifiedTenant");
export type TenantContext = {
  readonly businessId: string;
  readonly actorId: string;
  readonly role: "OWNER" | "ADMIN" | "MEMBER";
  readonly [verifiedTenant]: true;
};
import { canManage } from "@/lib/validation";
export async function requireUser() {
  const session = await getServerSession(authOptions());
  if (!session?.user.id || !session.sessionId) redirect("/login");
  const record = await findActiveSession(session.sessionId, session.user.id);
  if (!record) redirect("/login");
  return record.user;
}
export async function requireTenant(businessId: string, manage = false) {
  const user = await requireUser();
  const member = await findMembership(businessId, user.id);
  if (!member || (manage && !canManage(member.role))) notFound();
  return {
    user,
    member,
    business: member.business,
    context: {
      businessId,
      actorId: user.id,
      role: member.role,
      [verifiedTenant]: true,
    } satisfies TenantContext,
  };
}
export async function requirePlatformAdmin() {
  const user = await requireUser();
  if (!user.platformAdmin) notFound();
  return user;
}
