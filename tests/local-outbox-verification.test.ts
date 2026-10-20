import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: () => ({ $queryRaw: mocks.query }) }));

import {
  localOutboxTarget,
  verifyLocalOutboxTarget,
} from "@/server/local-outbox-target";

const host = "ep-wild-cloud-b52apabm.c-7.us-east-2.aws.neon.tech";
const target = localOutboxTarget({
  NODE_ENV: "development",
  ACCOUNT_EMAIL_PROVIDER: "local",
  LOCAL_OUTBOX_ENABLED: "YES",
  LOCAL_OUTBOX_TARGET_APPROVED: "YES",
  LOCAL_OUTBOX_EXPECTED_ENDPOINT: host,
  LOCAL_OUTBOX_EXPECTED_DATABASE: "trustcore_book_a1_test",
  LOCAL_OUTBOX_NEON_PROJECT_ID: "quiet-mouse-55892784",
  LOCAL_OUTBOX_NEON_BRANCH_ID: "br-late-sunset-b5k5go82",
  LOCAL_OUTBOX_NEON_BRANCH_NAME: "trustcore-book-a1-test",
  LOCAL_OUTBOX_NEON_API_KEY: "test-only-api-key",
  LOCAL_OUTBOX_ACCESS_TOKEN: "A".repeat(43),
  NEXTAUTH_URL: "http://localhost:3000",
  DATABASE_URL: `postgresql://test:test@${host}/trustcore_book_a1_test?sslmode=verify-full`,
})!;

function mockMetadata(endpointHost = host) {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          branch: {
            id: target.branchId,
            name: target.branchName,
            parent_id: "br-parent",
            protected: false,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          endpoints: [
            {
              host: endpointHost,
              branch_id: target.branchId,
              project_id: target.projectId,
              type: "read_write",
            },
          ],
        }),
      }),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe("local target verification (Neon API and DB query mocked)", () => {
  it("does not read the database if branch endpoint metadata mismatches", async () => {
    mockMetadata("ep-other.c-7.us-east-2.aws.neon.tech");
    await expect(verifyLocalOutboxTarget(target)).rejects.toThrow(
      "unavailable",
    );
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("requires identity and completed initial/A1 migrations after metadata verification", async () => {
    mockMetadata();
    mocks.query
      .mockResolvedValueOnce([{ name: target.database }])
      .mockResolvedValueOnce([
        {
          migration_name: "20261018000000_initial",
          finished_at: new Date(),
          rolled_back_at: null,
        },
      ]);
    await expect(verifyLocalOutboxTarget(target)).rejects.toThrow(
      "unavailable",
    );
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });

  it("accepts the expected disposable identity and both completed migrations", async () => {
    mockMetadata();
    mocks.query
      .mockResolvedValueOnce([{ name: target.database }])
      .mockResolvedValueOnce([
        {
          migration_name: "20261018000000_initial",
          finished_at: new Date(),
          rolled_back_at: null,
        },
        {
          migration_name: "20261018010000_phase_a1_identity",
          finished_at: new Date(),
          rolled_back_at: null,
        },
      ]);
    await expect(verifyLocalOutboxTarget(target)).resolves.toBeUndefined();
  });
});
