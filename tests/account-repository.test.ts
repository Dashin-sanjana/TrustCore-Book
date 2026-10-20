import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userCreate: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
  userUpdateMany: vi.fn(),
  sessionUpdateMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: () => ({
    user: { create: mocks.userCreate },
    refreshSession: {
      findMany: mocks.findMany,
      updateMany: mocks.updateMany,
    },
    $transaction: (callback: (tx: unknown) => unknown) =>
      callback({
        user: { updateMany: mocks.userUpdateMany },
        refreshSession: { updateMany: mocks.sessionUpdateMany },
      }),
  }),
}));

import {
  createCredentialsUser,
  listOwnSessions,
  replaceOwnPasswordAndRevokeSessions,
  revokeAllOwnSessions,
  revokeOwnSession,
} from "@/server/repositories/identity";

beforeEach(() => vi.resetAllMocks());

describe("account repository ownership and invalidation (Prisma mocked)", () => {
  it("creates a password account without claiming email ownership", async () => {
    mocks.userCreate.mockResolvedValue({ id: "u1" });
    await createCredentialsUser({
      name: "Owner",
      email: "owner@example.com",
      passwordHash: "bcrypt-hash",
    });
    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: {
        name: "Owner",
        email: "owner@example.com",
        passwordHash: "bcrypt-hash",
        emailVerificationRequired: false,
      },
      select: { id: true },
    });
  });
  it("lists only one user's bounded session metadata", async () => {
    mocks.findMany.mockResolvedValue([]);
    await listOwnSessions("u1", 1);
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        userId: "u1",
        credentialVersion: 1,
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  it("requires both owner and session ID for revoke-one", async () => {
    await revokeOwnSession("u1", "s1");
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "s1", userId: "u1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("scopes revoke-all to the authenticated user", async () => {
    await revokeAllOwnSessions("u1");
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("changes the password and revokes sessions in the same transaction", async () => {
    mocks.userUpdateMany.mockResolvedValue({ count: 1 });
    expect(await replaceOwnPasswordAndRevokeSessions("u1", "old", "new")).toBe(
      true,
    );
    expect(mocks.userUpdateMany).toHaveBeenCalledWith({
      where: { id: "u1", passwordHash: "old" },
      data: { passwordHash: "new", credentialVersion: { increment: 1 } },
    });
    expect(mocks.sessionUpdateMany).toHaveBeenCalledWith({
      where: { userId: "u1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("does not revoke sessions when a concurrent password update wins", async () => {
    mocks.userUpdateMany.mockResolvedValue({ count: 0 });
    expect(await replaceOwnPasswordAndRevokeSessions("u1", "old", "new")).toBe(
      false,
    );
    expect(mocks.sessionUpdateMany).not.toHaveBeenCalled();
  });
});
