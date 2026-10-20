import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tokenFind: vi.fn(),
  tokenUpdate: vi.fn(),
  userUpdate: vi.fn(),
  sessionUpdate: vi.fn(),
  lockUser: vi.fn(),
  sessionCreate: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: () => ({
    $transaction: (callback: (tx: unknown) => unknown) =>
      callback({
        $queryRaw: mocks.lockUser,
        accountSecurityToken: {
          findUnique: mocks.tokenFind,
          updateMany: mocks.tokenUpdate,
        },
        user: { update: mocks.userUpdate },
        refreshSession: {
          create: mocks.sessionCreate,
          updateMany: mocks.sessionUpdate,
        },
      }),
  }),
}));
import {
  createSession,
  redeemResetToken,
  redeemVerificationToken,
} from "@/server/repositories/identity";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.tokenFind.mockResolvedValue({ id: "t1", userId: "u1" });
  mocks.tokenUpdate.mockResolvedValue({ count: 1 });
  mocks.userUpdate.mockResolvedValue({ id: "u1" });
});

describe("account security repository query contracts (Prisma mocked, not DB integration)", () => {
  it("claims verification only when purpose, expiry and unused state match", async () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(await redeemVerificationToken("digest", now)).toBe(true);
    expect(mocks.tokenUpdate).toHaveBeenCalledWith({
      where: {
        id: "t1",
        purpose: "VERIFY_EMAIL",
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { emailVerifiedAt: now },
    });
  });

  it("does not mutate a user after an expired or replayed claim", async () => {
    mocks.tokenUpdate.mockResolvedValue({ count: 0 });
    expect(await redeemVerificationToken("digest")).toBe(false);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("allows only one conditional claim in a mocked concurrent replay", async () => {
    let claimed = false;
    mocks.tokenUpdate.mockImplementation(async () => {
      if (claimed) return { count: 0 };
      claimed = true;
      return { count: 1 };
    });
    expect(
      (
        await Promise.all([
          redeemVerificationToken("digest"),
          redeemVerificationToken("digest"),
        ])
      ).sort(),
    ).toEqual([false, true]);
    expect(mocks.userUpdate).toHaveBeenCalledTimes(1);
  });

  it("resets password, increments version, revokes sessions and consumes competing tokens", async () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(await redeemResetToken("digest", "new-hash", now)).toBe(true);
    expect(mocks.tokenUpdate).toHaveBeenNthCalledWith(1, {
      where: {
        id: "t1",
        purpose: "RESET_PASSWORD",
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { passwordHash: "new-hash", credentialVersion: { increment: 1 } },
    });
    expect(mocks.sessionUpdate).toHaveBeenCalledWith({
      where: { userId: "u1", revokedAt: null },
      data: { revokedAt: now },
    });
    expect(mocks.tokenUpdate).toHaveBeenNthCalledWith(2, {
      where: { userId: "u1", purpose: "RESET_PASSWORD", consumedAt: null },
      data: { consumedAt: now },
    });
  });

  it("refuses stale credential-version session creation", async () => {
    mocks.lockUser.mockResolvedValue([
      {
        credentialVersion: 1,
        emailVerificationRequired: false,
        emailVerifiedAt: null,
      },
    ]);
    expect(await createSession("u1", 0, new Date())).toBeNull();
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
  });

  it("locks the user before creating a verified current-version session", async () => {
    mocks.lockUser.mockResolvedValue([
      {
        credentialVersion: 2,
        emailVerificationRequired: true,
        emailVerifiedAt: new Date(),
      },
    ]);
    mocks.sessionCreate.mockResolvedValue({ id: "s1" });
    const expiresAt = new Date("2026-10-20T00:00:00Z");
    expect(await createSession("u1", 2, expiresAt)).toEqual({ id: "s1" });
    const [sql, parameter] = mocks.lockUser.mock.calls[0]!;
    expect(sql.join("?")).toMatch(/FROM "User" WHERE "id" = \? FOR UPDATE/);
    expect(parameter).toBe("u1");
    expect(mocks.sessionCreate).toHaveBeenCalledWith({
      data: { userId: "u1", credentialVersion: 2, expiresAt },
    });
    expect(mocks.lockUser.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.sessionCreate.mock.invocationCallOrder[0]!,
    );
  });

  it("does not create sessions for missing or unverified users", async () => {
    mocks.lockUser.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        credentialVersion: 0,
        emailVerificationRequired: true,
        emailVerifiedAt: null,
      },
    ]);
    expect(await createSession("missing", 0, new Date())).toBeNull();
    expect(await createSession("u1", 0, new Date())).toBeNull();
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
  });
});
