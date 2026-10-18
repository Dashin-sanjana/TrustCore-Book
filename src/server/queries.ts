import "server-only";
import {
  requireTenant,
  requireUser,
  requirePlatformAdmin,
} from "./authorization";
import { readWorkspace, readDashboardCounts } from "./repositories/workspace";
import { listMemberships } from "./repositories/membership";
import { readPlatformOverview } from "./repositories/platform";
import { findPublicBusiness } from "./repositories/public-booking";
import { rateLimit } from "./rate-limit";
export async function getWorkspace(businessId: string) {
  const scope = await requireTenant(businessId);
  const [services, staff, customers, appointments] = await readWorkspace(
    scope.context,
  );
  return { ...scope, services, staff, customers, appointments };
}
export async function getDashboard(businessId: string) {
  const scope = await requireTenant(businessId);
  const [appointments, services, staff, customers] = await readDashboardCounts(
    scope.context,
  );
  return { ...scope, appointments, services, staff, customers };
}
export async function getNavigation(businessId: string) {
  const scope = await requireTenant(businessId);
  return { ...scope, memberships: await listMemberships(scope.user.id) };
}
export async function getDefaultBusiness() {
  const user = await requireUser();
  return (await listMemberships(user.id))[0]?.businessId;
}
export async function getPlatformOverview() {
  await requirePlatformAdmin();
  const [businessCount, userCount, businesses] = await readPlatformOverview();
  return { businessCount, userCount, businesses };
}
export async function getPublicBusiness(slug: string) {
  await rateLimit("public-booking:global", 300, 60);
  return findPublicBusiness(slug);
}
