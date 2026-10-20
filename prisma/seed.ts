import { compare } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  assertNeonTarget,
  decideSeedAction,
  hashSeedPassword,
  SeedRefused,
  seedIds,
  validateSeedConfig,
} from "./seed-guards";

const requiredMigrations = [
  "20261018000000_initial",
  "20261018010000_phase_a1_identity",
  "20261019010000_phase_a2_invitations",
  "20261019020000_phase_a2_final_owner_guard",
  "20261019030000_booking_idempotency",
];

async function verifyNeon(target: ReturnType<typeof validateSeedConfig>) {
  const { config } = target;
  const base = `https://console.neon.tech/api/v2/projects/${config.SEED_NEON_PROJECT_ID}`;
  const headers = { Authorization: `Bearer ${config.SEED_NEON_API_KEY}` };
  const [branchResponse, endpointsResponse] = await Promise.all([
    fetch(`${base}/branches/${config.SEED_NEON_BRANCH_ID}`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    }),
    fetch(`${base}/endpoints`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    }),
  ]);
  if (!branchResponse.ok || !endpointsResponse.ok) throw new SeedRefused();
  const branchBody = await branchResponse.json();
  const endpointsBody = await endpointsResponse.json();
  if (!branchBody?.branch || !Array.isArray(endpointsBody?.endpoints))
    throw new SeedRefused();
  assertNeonTarget(target, branchBody.branch, endpointsBody.endpoints);
}

async function verifyDatabase(client: PrismaClient, database: string) {
  const identity = await client.$queryRaw<{ name: string }[]>`
    SELECT current_database() AS name
  `;
  if (identity[0]?.name !== database) throw new SeedRefused();
  const history = await client.$queryRaw<
    {
      migration_name: string;
      finished_at: Date | null;
      rolled_back_at: Date | null;
    }[]
  >`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations" ORDER BY migration_name
  `;
  if (
    history.length !== requiredMigrations.length ||
    history.some(
      (row, index) =>
        row.migration_name !== requiredMigrations[index] ||
        !row.finished_at ||
        row.rolled_back_at,
    )
  )
    throw new SeedRefused();
}

async function seed(
  client: PrismaClient,
  target: ReturnType<typeof validateSeedConfig>,
) {
  const { config, database } = target;
  const email = config.SEED_DEV_EMAIL;
  const ids = seedIds(
    config.SEED_NEON_PROJECT_ID,
    config.SEED_NEON_BRANCH_ID,
    database,
    email,
  );
  const passwordHash = await hashSeedPassword(config.SEED_DEV_PASSWORD);
  return client.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT 1 AS locked
        FROM (SELECT pg_advisory_xact_lock(hashtext(${`trustcore-dev-seed:${ids.user}`}))) AS guard
      `;
      const [user, userById, business, businessById, marker] =
        await Promise.all([
          tx.user.findUnique({ where: { email } }),
          tx.user.findUnique({ where: { id: ids.user } }),
          tx.business.findUnique({ where: { slug: ids.slug } }),
          tx.business.findUnique({ where: { id: ids.business } }),
          tx.auditLog.findUnique({ where: { id: ids.marker } }),
        ]);
      const action = decideSeedAction(ids, email, {
        user,
        userById,
        business,
        businessById,
        marker,
      });
      if (action === "verify") {
        if (
          !user ||
          user.platformAdmin ||
          !user.emailVerificationRequired ||
          !user.emailVerifiedAt ||
          !(await compare(config.SEED_DEV_PASSWORD, user.passwordHash))
        )
          throw new SeedRefused();
        const [membership, service, staff, assignment, rules] =
          await Promise.all([
            tx.businessMember.findUnique({ where: { id: ids.membership } }),
            tx.service.findUnique({ where: { id: ids.service } }),
            tx.staff.findUnique({ where: { id: ids.staff } }),
            tx.staffService.findUnique({
              where: {
                businessId_staffId_serviceId: {
                  businessId: ids.business,
                  staffId: ids.staff,
                  serviceId: ids.service,
                },
              },
            }),
            tx.availabilityRule.findMany({
              where: { id: { in: [1, 2, 3, 4, 5].map(ids.rule) } },
            }),
          ]);
        if (
          membership?.businessId !== ids.business ||
          membership.userId !== ids.user ||
          membership.role !== "OWNER" ||
          service?.businessId !== ids.business ||
          !service.active ||
          staff?.businessId !== ids.business ||
          !staff.active ||
          !assignment ||
          rules.length !== 5 ||
          rules.some(
            (rule) =>
              rule.businessId !== ids.business ||
              rule.staffId !== ids.staff ||
              rule.id !== ids.rule(rule.weekday) ||
              rule.startMinute !== 9 * 60 ||
              rule.endMinute !== 17 * 60,
          )
        )
          throw new SeedRefused();
        return "unchanged";
      }
      await tx.user.create({
        data: {
          id: ids.user,
          email,
          name: "Development Owner",
          passwordHash,
          emailVerificationRequired: true,
          emailVerifiedAt: new Date(),
          platformAdmin: false,
        },
      });
      await tx.business.create({
        data: {
          id: ids.business,
          name: "Development Studio",
          slug: ids.slug,
          country: "LK",
          currency: "LKR",
          timezone: "Asia/Colombo",
        },
      });
      await tx.businessMember.create({
        data: {
          id: ids.membership,
          businessId: ids.business,
          userId: ids.user,
          role: "OWNER",
        },
      });
      await tx.service.create({
        data: {
          id: ids.service,
          businessId: ids.business,
          name: "Consultation",
          durationMinutes: 30,
          price: "2500.00",
        },
      });
      await tx.staff.create({
        data: { id: ids.staff, businessId: ids.business, name: "Sample Staff" },
      });
      await tx.staffService.create({
        data: {
          businessId: ids.business,
          staffId: ids.staff,
          serviceId: ids.service,
        },
      });
      await tx.availabilityRule.createMany({
        data: [1, 2, 3, 4, 5].map((weekday) => ({
          id: ids.rule(weekday),
          businessId: ids.business,
          staffId: ids.staff,
          weekday,
          startMinute: 9 * 60,
          endMinute: 17 * 60,
        })),
      });
      await tx.auditLog.create({
        data: {
          id: ids.marker,
          businessId: ids.business,
          actorId: ids.user,
          action: "development.seed.created",
          entityId: ids.user,
        },
      });
      return "created";
    },
    { timeout: 15_000 },
  );
}

async function main() {
  const target = validateSeedConfig(process.env);
  await verifyNeon(target);
  const client = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: target.config.SEED_DEV_DATABASE_URL,
      max: 2,
      connectionTimeoutMillis: 5000,
    }),
  });
  try {
    await verifyDatabase(client, target.database);
    const result = await seed(client, target);
    console.log(`Development seed ${result}. Sign in at /login.`);
  } finally {
    await client.$disconnect();
  }
}

main().catch(() => {
  console.error(
    "Development seed refused; no credentials or database details logged.",
  );
  process.exitCode = 1;
});
