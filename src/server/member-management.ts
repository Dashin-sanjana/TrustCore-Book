import "server-only";
import { notFound } from "next/navigation";
import { hasPermission } from "@/shared/policies/permissions";
import { requireTenant } from "./authorization";
import { listBusinessMembersPage } from "./repositories/membership";

const PAGE_SIZE = 50;

export async function listBusinessMembersService(
  businessId: string,
  after?: string,
) {
  const scope = await requireTenant(businessId);
  if (!hasPermission(scope.member.role, "members.manage")) notFound();
  if (after && !/^[A-Za-z0-9_-]{1,128}$/.test(after)) notFound();

  const rows = await listBusinessMembersPage(scope.business.id, after);
  const visible = rows.slice(0, PAGE_SIZE);
  return {
    businessName: scope.business.name,
    actorId: scope.member.id,
    actorRole: scope.member.role,
    members: visible.map((row) => ({
      id: row.id,
      name: row.user.name,
      email: row.user.email,
      role: row.role,
    })),
    nextCursor: rows.length > PAGE_SIZE ? visible.at(-1)!.id : null,
  };
}
