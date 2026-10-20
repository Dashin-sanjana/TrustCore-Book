import { compare, getRounds } from "bcryptjs";
import { describe, expect, it } from "vitest";
import { loginSchema } from "@/lib/validation";
import {
  assertNeonTarget,
  decideSeedAction,
  hashSeedPassword,
  seedIds,
  validateSeedConfig,
} from "../prisma/seed-guards";

const valid = {
  SEED_ALLOW_DEVELOPMENT: "YES",
  SEED_TARGET_APPROVED: "YES",
  SEED_DEV_DISPOSABLE_CONFIRMED: "YES",
  NODE_ENV: "development",
  DOTENV_CONFIG_PATH: "/dev/null",
  SEED_DEV_EMAIL: "owner@example.test",
  SEED_DEV_PASSWORD: "test-only-long-passphrase",
  SEED_DEV_DATABASE_URL:
    "postgresql://test_user:test_only@ep-example.c-7.us-east-2.aws.neon.tech/trustcore_seed_test?sslmode=verify-full",
  SEED_NEON_API_KEY: "test-only-api-placeholder",
  SEED_NEON_PROJECT_ID: "example-project-123",
  SEED_NEON_BRANCH_ID: "br-disposable-test-123",
  SEED_NEON_BRANCH_NAME: "disposable-dev-test",
  SEED_EXPECTED_ENDPOINT: "ep-example.c-7.us-east-2.aws.neon.tech",
  SEED_EXPECTED_DATABASE: "trustcore_seed_test",
};

describe("development seed target guards", () => {
  it("accepts only the separate development project's default branch", () => {
    const dev = {
      ...valid,
      SEED_NEON_PROJECT_ID: "fragrant-hat-50630079",
      SEED_NEON_BRANCH_ID: "br-dark-brook-b4vdolwu",
      SEED_NEON_BRANCH_NAME: "production",
      SEED_EXPECTED_DATABASE: "neondb",
      SEED_DEV_DATABASE_URL: valid.SEED_DEV_DATABASE_URL.replace(
        "trustcore_seed_test",
        "neondb",
      ),
    };
    const target = validateSeedConfig(dev);
    const branch = {
      id: dev.SEED_NEON_BRANCH_ID,
      name: "production",
      default: true,
      parent_id: null,
      protected: false,
    };
    const endpoint = {
      host: dev.SEED_EXPECTED_ENDPOINT,
      branch_id: branch.id,
      project_id: dev.SEED_NEON_PROJECT_ID,
      type: "read_write",
    };
    expect(() => assertNeonTarget(target, branch, [endpoint])).not.toThrow();
    expect(() =>
      assertNeonTarget(target, { ...branch, protected: true }, [endpoint]),
    ).not.toThrow();
    expect(() =>
      assertNeonTarget(target, branch, [
        { ...endpoint, project_id: "quiet-mouse-55892784" },
      ]),
    ).toThrow();
    expect(() =>
      validateSeedConfig({
        ...dev,
        SEED_NEON_PROJECT_ID: "quiet-mouse-55892784",
      }),
    ).toThrow();
    expect(() =>
      validateSeedConfig({ ...dev, NODE_ENV: "production" }),
    ).toThrow();
  });
  it("rejects production mode, missing approval, inherited DB configuration and unsafe targets", () => {
    for (const change of [
      { NODE_ENV: "production" },
      { SEED_TARGET_APPROVED: undefined },
      { DATABASE_URL: valid.SEED_DEV_DATABASE_URL },
      { DIRECT_URL: valid.SEED_DEV_DATABASE_URL },
      { SEED_EXPECTED_DATABASE: "neondb" },
      {
        SEED_DEV_DATABASE_URL: valid.SEED_DEV_DATABASE_URL.replace(
          "verify-full",
          "require",
        ),
      },
      {
        SEED_DEV_DATABASE_URL: valid.SEED_DEV_DATABASE_URL.replace(
          "ep-example",
          "ep-other",
        ),
      },
    ])
      expect(() => validateSeedConfig({ ...valid, ...change })).toThrow();
  });

  it("requires live child-branch and read-write endpoint association", () => {
    const target = validateSeedConfig(valid);
    const branch = {
      id: valid.SEED_NEON_BRANCH_ID,
      name: valid.SEED_NEON_BRANCH_NAME,
      parent_id: "br-parent",
      protected: false,
    };
    const endpoint = {
      host: valid.SEED_EXPECTED_ENDPOINT,
      branch_id: valid.SEED_NEON_BRANCH_ID,
      project_id: valid.SEED_NEON_PROJECT_ID,
      type: "read_write",
    };
    expect(() => assertNeonTarget(target, branch, [endpoint])).not.toThrow();
    expect(() =>
      assertNeonTarget(target, branch, [
        { ...endpoint, branch_id: "br-other" },
      ]),
    ).toThrow();
    expect(() =>
      assertNeonTarget(target, { ...branch, parent_id: null }, [endpoint]),
    ).toThrow();
    expect(() =>
      assertNeonTarget(target, { ...branch, expires_at: "2000-01-01" }, [
        endpoint,
      ]),
    ).toThrow();
  });
});

describe("development seed ownership", () => {
  const ids = seedIds("project", "branch", "database", "owner@example.test");
  const records = {
    user: { id: ids.user, email: "owner@example.test" },
    userById: { id: ids.user, email: "owner@example.test" },
    business: { id: ids.business, slug: ids.slug },
    businessById: { id: ids.business, slug: ids.slug },
    marker: {
      id: ids.marker,
      action: "development.seed.created",
      actorId: ids.user,
      entityId: ids.user,
      businessId: ids.business,
    },
  };

  it("creates only when empty and treats a complete marked fixture as unchanged", () => {
    expect(
      decideSeedAction(ids, "owner@example.test", {
        user: null,
        userById: null,
        business: null,
        businessById: null,
        marker: null,
      }),
    ).toBe("create");
    expect(decideSeedAction(ids, "owner@example.test", records)).toBe("verify");
    const repeated = seedIds(
      "project",
      "branch",
      "database",
      "owner@example.test",
    );
    expect(repeated.user).toBe(ids.user);
    expect(repeated.business).toBe(ids.business);
    expect(repeated.rule(1)).toBe(ids.rule(1));
  });

  it("refuses unrelated accounts, businesses and incomplete markers", () => {
    expect(() =>
      decideSeedAction(ids, "owner@example.test", {
        ...records,
        user: { ...records.user, id: "unrelated-user" },
      }),
    ).toThrow();
    expect(() =>
      decideSeedAction(ids, "owner@example.test", {
        ...records,
        marker: null,
      }),
    ).toThrow();
    expect(() =>
      decideSeedAction(ids, "owner@example.test", {
        ...records,
        business: { ...records.business, id: "unrelated-business" },
      }),
    ).toThrow();
  });

  it("produces a hash compatible with the login password boundary", async () => {
    const password = valid.SEED_DEV_PASSWORD;
    expect(
      loginSchema.safeParse({ email: valid.SEED_DEV_EMAIL, password }).success,
    ).toBe(true);
    const digest = await hashSeedPassword(password);
    expect(getRounds(digest)).toBe(12);
    expect(await compare(password, digest)).toBe(true);
    expect(await compare("not-the-test-password", digest)).toBe(false);
  });
});
