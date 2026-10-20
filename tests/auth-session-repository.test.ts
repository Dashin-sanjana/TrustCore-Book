import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: () => ({
    refreshSession: {
      findFirst: mocks.findFirst,
      updateMany: mocks.updateMany,
    },
  }),
}));

import {
  findActiveSession,
  revokeSession,
} from "@/server/repositories/identity";

beforeEach(() => vi.resetAllMocks());

describe("CURRENT database session query shape (Prisma mocked; no DB connection)", () => {
  it("requires both session and user IDs, non-revocation and future expiry", async () => {
    const record = {
      id: "s1",
      credentialVersion: 0,
      user: {
        credentialVersion: 0,
        emailVerificationRequired: false,
        emailVerifiedAt: null,
      },
    };
    mocks.findFirst.mockResolvedValue(record);
    expect(await findActiveSession("s1", "u1")).toEqual(record);
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "s1",
          userId: "u1",
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
      }),
    );
    expect(
      mocks.findFirst.mock.calls[0]?.[0].include.user.select,
    ).not.toHaveProperty("passwordHash");
  });

  it("returns no active session when the repository finds none", async () => {
    mocks.findFirst.mockResolvedValue(null);
    expect(await findActiveSession("revoked-or-expired", "u1")).toBeNull();
  });
  it("rejects a session created with credentials invalidated by a concurrent password change", async () => {
    mocks.findFirst.mockResolvedValue({
      credentialVersion: 0,
      user: {
        credentialVersion: 1,
        emailVerificationRequired: false,
        emailVerifiedAt: null,
      },
    });
    expect(await findActiveSession("s1", "u1")).toBeNull();
  });

  it("makes trusted sign-out revocation idempotent", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    await revokeSession("s1");
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "s1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("does not change a missing or already-revoked session", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    expect(await revokeSession("missing")).toEqual({ count: 0 });
    expect(await revokeSession("revoked")).toEqual({ count: 0 });
    expect(mocks.updateMany).toHaveBeenCalledTimes(2);
  });

  it("uses one conditional update for concurrent attempts", async () => {
    let active = true;
    mocks.updateMany.mockImplementation(async () => {
      if (!active) return { count: 0 };
      active = false;
      return { count: 1 };
    });
    const outcomes = await Promise.all([
      revokeSession("s1"),
      revokeSession("s1"),
    ]);
    expect(outcomes.map((outcome) => outcome.count).sort()).toEqual([0, 1]);
    for (const [query] of mocks.updateMany.mock.calls) {
      expect(query.where).toEqual({ id: "s1", revokedAt: null });
    }
  });
});
