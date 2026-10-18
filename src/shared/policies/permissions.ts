export const roles = ["OWNER", "ADMIN", "MEMBER"] as const;
export type MemberRole = (typeof roles)[number];
export type Permission =
  | "workspace.read"
  | "records.manage"
  | "settings.manage"
  | "members.manage"
  | "ownership.transfer";
export function hasPermission(role: MemberRole, permission: Permission) {
  if (permission === "workspace.read") return true;
  if (permission === "ownership.transfer") return role === "OWNER";
  return role === "OWNER" || role === "ADMIN";
}
// Policies are pure decisions. Services must first derive role from current database membership.
