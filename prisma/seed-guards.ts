import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";

export class SeedRefused extends Error {
  constructor() {
    super("Development seed safety check failed");
  }
}

export function hashSeedPassword(password: string) {
  return hash(password, 12);
}

const configSchema = z.object({
  SEED_ALLOW_DEVELOPMENT: z.literal("YES"),
  SEED_TARGET_APPROVED: z.literal("YES"),
  SEED_DEV_DISPOSABLE_CONFIRMED: z.literal("YES"),
  NODE_ENV: z.literal("development"),
  DOTENV_CONFIG_PATH: z.literal("/dev/null"),
  SEED_DEV_EMAIL: z.email().max(254).trim().toLowerCase(),
  SEED_DEV_PASSWORD: z
    .string()
    .min(12)
    .max(72)
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72),
  SEED_DEV_DATABASE_URL: z.url(),
  SEED_NEON_API_KEY: z.string().min(1),
  SEED_NEON_PROJECT_ID: z.string().regex(/^[a-z0-9-]{1,60}$/),
  SEED_NEON_BRANCH_ID: z.string().regex(/^br-[a-z0-9-]+$/),
  SEED_NEON_BRANCH_NAME: z.string().min(1),
  SEED_EXPECTED_ENDPOINT: z.string().min(1),
  SEED_EXPECTED_DATABASE: z.string().min(1),
});

export function validateSeedConfig(env: Record<string, string | undefined>) {
  if (env.DATABASE_URL || env.DIRECT_URL || env.PGHOST || env.PGPASSWORD)
    throw new SeedRefused();
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) throw new SeedRefused();
  const config = parsed.data;
  const url = new URL(config.SEED_DEV_DATABASE_URL);
  const database = decodeURIComponent(url.pathname.slice(1));
  const host = url.hostname.toLowerCase();
  const dedicatedDevProject =
    config.SEED_NEON_PROJECT_ID === "fragrant-hat-50630079" &&
    config.SEED_NEON_BRANCH_ID === "br-dark-brook-b4vdolwu" &&
    config.SEED_NEON_BRANCH_NAME === "production" &&
    database === "neondb";
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.username ||
    !url.password ||
    (url.port && url.port !== "5432") ||
    !!url.hash ||
    host !== config.SEED_EXPECTED_ENDPOINT.toLowerCase() ||
    !/^ep-[a-z0-9-]+(?:\.[a-z0-9-]+){1,3}\.aws\.neon\.tech$/.test(host) ||
    host.includes("-pooler.") ||
    database !== config.SEED_EXPECTED_DATABASE ||
    (!dedicatedDevProject &&
      (!/^[a-z0-9_]+_(dev|test)$/.test(database) ||
        /(prod|production|shared|neondb)/.test(database) ||
        !/(dev|test)/i.test(config.SEED_NEON_BRANCH_NAME) ||
        /^(main|master|production|prod)$/i.test(
          config.SEED_NEON_BRANCH_NAME,
        ))) ||
    url.searchParams.get("sslmode") !== "verify-full" ||
    [...url.searchParams.keys()].some(
      (key) => key !== "sslmode" && key !== "channel_binding",
    )
  )
    throw new SeedRefused();
  return { config, url, database, host };
}

export function assertNeonTarget(
  target: ReturnType<typeof validateSeedConfig>,
  branch: Record<string, unknown>,
  endpoints: Record<string, unknown>[],
  now = Date.now(),
) {
  const { config, host } = target;
  const dedicatedDevProject =
    config.SEED_NEON_PROJECT_ID === "fragrant-hat-50630079" &&
    config.SEED_NEON_BRANCH_ID === "br-dark-brook-b4vdolwu" &&
    config.SEED_NEON_BRANCH_NAME === "production" &&
    target.database === "neondb";
  if (
    branch.id !== config.SEED_NEON_BRANCH_ID ||
    branch.name !== config.SEED_NEON_BRANCH_NAME ||
    (!dedicatedDevProject &&
      (typeof branch.parent_id !== "string" || !branch.parent_id)) ||
    (!dedicatedDevProject && branch.protected === true) ||
    (!dedicatedDevProject &&
      (branch.default === true || branch.is_default === true)) ||
    (branch.expires_at != null &&
      (typeof branch.expires_at !== "string" ||
        !Number.isFinite(Date.parse(branch.expires_at)) ||
        Date.parse(branch.expires_at) <= now)) ||
    !endpoints.some(
      (endpoint) =>
        endpoint.host === host &&
        endpoint.branch_id === branch.id &&
        endpoint.project_id === config.SEED_NEON_PROJECT_ID &&
        endpoint.type === "read_write" &&
        endpoint.disabled !== true,
    )
  )
    throw new SeedRefused();
}

export function seedIds(
  project: string,
  branch: string,
  database: string,
  email: string,
) {
  const scope = `${project}:${branch}:${database}:${email}`;
  const digest = (kind: string) =>
    createHash("sha256")
      .update(`trustcore-dev-seed:${scope}:${kind}`)
      .digest("hex");
  const id = (kind: string) => `c${digest(kind).slice(0, 24)}`;
  return {
    user: id("user"),
    business: id("business"),
    membership: id("membership"),
    service: id("service"),
    staff: id("staff"),
    marker: id("marker"),
    rule: (day: number) => id(`rule:${day}`),
    slug: `dev-studio-${digest("slug").slice(0, 12)}`,
  };
}

export function decideSeedAction(
  ids: ReturnType<typeof seedIds>,
  email: string,
  records: {
    user: { id: string; email: string } | null;
    userById: { id: string; email: string } | null;
    business: { id: string; slug: string } | null;
    businessById: { id: string; slug: string } | null;
    marker: {
      id: string;
      action: string;
      actorId: string | null;
      entityId: string | null;
      businessId: string;
    } | null;
  },
) {
  const { user, userById, business, businessById, marker } = records;
  if (!user && !userById && !business && !businessById && !marker)
    return "create" as const;
  if (
    user?.id === ids.user &&
    user.email === email &&
    userById?.email === email &&
    business?.id === ids.business &&
    business.slug === ids.slug &&
    businessById?.slug === ids.slug &&
    marker?.id === ids.marker &&
    marker.action === "development.seed.created" &&
    marker.actorId === ids.user &&
    marker.entityId === ids.user &&
    marker.businessId === ids.business
  )
    return "verify" as const;
  throw new SeedRefused();
}
