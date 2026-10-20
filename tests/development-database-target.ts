// The caller must verify Neon API metadata and schema before setting the opt-in gate.
export function approvedDevelopmentDatabase(
  url: string | undefined,
  env: Record<string, string | undefined> = process.env,
) {
  if (
    env.DEV_NEON_TARGET_VERIFIED !== "YES" ||
    env.DEV_NEON_PROJECT_ID !== "fragrant-hat-50630079" ||
    env.DEV_NEON_BRANCH_ID !== "br-dark-brook-b4vdolwu" ||
    !url
  )
    return false;
  try {
    const target = new URL(url);
    return (
      ["postgres:", "postgresql:"].includes(target.protocol) &&
      !!target.username &&
      !!target.password &&
      target.hostname === env.DEV_NEON_ENDPOINT &&
      /^ep-[a-z0-9-]+(?:\.[a-z0-9-]+){1,3}\.aws\.neon\.tech$/.test(
        target.hostname,
      ) &&
      !target.hostname.includes("-pooler.") &&
      target.pathname === "/neondb" &&
      (!target.port || target.port === "5432") &&
      target.searchParams.get("sslmode") === "verify-full"
    );
  } catch {
    return false;
  }
}
