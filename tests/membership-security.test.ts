import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lock: vi.fn(),
  inviteFind: vi.fn(),
  inviteUpdate: vi.fn(),
  memberFind: vi.fn(),
  memberTarget: vi.fn(),
  memberCreate: vi.fn(),
  memberUpdate: vi.fn(),
  memberDelete: vi.fn(),
  userFind: vi.fn(),
  auditCreate: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: () => ({
    $transaction: (callback: (tx: unknown) => unknown) =>
      callback({
        $queryRaw: mocks.lock,
        businessInvitation: {
          findUnique: mocks.inviteFind,
          update: mocks.inviteUpdate,
        },
        businessMember: {
          findUnique: mocks.memberFind,
          findFirst: mocks.memberTarget,
          create: mocks.memberCreate,
          update: mocks.memberUpdate,
          delete: mocks.memberDelete,
        },
        user: { findUnique: mocks.userFind },
        auditLog: { create: mocks.auditCreate },
      }),
  }),
}));

import {
  canAdminister,
  changeMembership,
  redeemInvitation,
  transferOwnership,
} from "@/server/repositories/invitations";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.lock.mockResolvedValue([{ id: "b1" }]);
  mocks.memberFind.mockResolvedValue({ id: "actor", role: "OWNER" });
  mocks.memberTarget.mockResolvedValue({
    id: "target",
    role: "MEMBER",
    user: { emailVerifiedAt: new Date() },
  });
  mocks.inviteFind
    .mockResolvedValueOnce({ businessId: "b1" })
    .mockResolvedValueOnce({
      id: "i1",
      businessId: "b1",
      invitedEmail: "user@example.test",
      invitedById: "inviter",
      role: "MEMBER",
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
      declinedAt: null,
      revokedAt: null,
    });
  mocks.userFind.mockResolvedValue({
    email: "USER@example.test",
    emailVerifiedAt: new Date(),
  });
});

describe("A2 policy and mocked repository transactions (not database integration)", () => {
  it("limits ADMIN to MEMBER targets and MEMBER invitations", () => {
    expect(canAdminister("OWNER", "ADMIN", "ADMIN")).toBe(true);
    expect(canAdminister("OWNER", "OWNER", "MEMBER")).toBe(false);
    expect(canAdminister("ADMIN", "MEMBER", "MEMBER")).toBe(true);
    expect(canAdminister("ADMIN", "MEMBER", "ADMIN")).toBe(false);
    expect(canAdminister("ADMIN", "ADMIN")).toBe(false);
    expect(canAdminister("MEMBER", "MEMBER")).toBe(false);
    expect(canAdminister("ADMIN", "MEMBER", "OWNER")).toBe(false);
    expect(canAdminister("OWNER", "MEMBER", "OWNER")).toBe(false);
  });

  it("rejects a foreign target before any role mutation", async () => {
    mocks.memberTarget.mockResolvedValue(null);
    await expect(
      changeMembership("b1", "owner", "foreign", "ADMIN"),
    ).rejects.toThrow();
    expect(mocks.memberTarget).toHaveBeenCalledWith({
      where: { id: "foreign", businessId: "b1" },
    });
    expect(mocks.memberUpdate).not.toHaveBeenCalled();
  });

  it("refuses ordinary owner demotion or removal", async () => {
    mocks.memberTarget.mockResolvedValue({ id: "target", role: "OWNER" });
    await expect(
      changeMembership("b1", "owner", "target", "MEMBER"),
    ).rejects.toThrow();
    await expect(changeMembership("b1", "owner", "target")).rejects.toThrow();
    expect(mocks.memberUpdate).not.toHaveBeenCalled();
    expect(mocks.memberDelete).not.toHaveBeenCalled();
  });

  it("requires matching verified email and unexpired unused token", async () => {
    mocks.userFind.mockResolvedValue({
      email: "other@example.test",
      emailVerifiedAt: new Date(),
    });
    await expect(redeemInvitation("digest", "u1", true)).rejects.toThrow();
    expect(mocks.memberCreate).not.toHaveBeenCalled();
  });

  it("refuses replayed and expired invitations without membership writes", async () => {
    mocks.inviteFind
      .mockReset()
      .mockResolvedValueOnce({ businessId: "b1" })
      .mockResolvedValueOnce({
        id: "i1",
        businessId: "b1",
        invitedEmail: "user@example.test",
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });
    await expect(redeemInvitation("digest", "u1", true)).rejects.toThrow();
    mocks.inviteFind
      .mockReset()
      .mockResolvedValueOnce({ businessId: "b1" })
      .mockResolvedValueOnce({
        id: "i1",
        businessId: "b1",
        invitedEmail: "user@example.test",
        expiresAt: new Date(Date.now() - 1),
      });
    await expect(redeemInvitation("digest", "u1", true)).rejects.toThrow();
    expect(mocks.memberCreate).not.toHaveBeenCalled();
  });

  it("rechecks inviter authority before accepting", async () => {
    mocks.memberFind.mockResolvedValue({ id: "inviter", role: "MEMBER" });
    await expect(redeemInvitation("digest", "u1", true)).rejects.toThrow();
    expect(mocks.memberCreate).not.toHaveBeenCalled();
  });

  it("locks business before promotion and demotion in a transfer", async () => {
    await transferOwnership("b1", "owner", "target");
    expect(mocks.lock).toHaveBeenCalledOnce();
    expect(mocks.memberUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: "target" },
      data: { role: "OWNER" },
    });
    expect(mocks.memberUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "actor" },
      data: { role: "ADMIN" },
    });
    expect(mocks.lock.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.memberUpdate.mock.invocationCallOrder[0]!,
    );
  });

  it("propagates a failed demotion without an audit write (database rollback unverified)", async () => {
    mocks.memberUpdate
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("write failed"));
    await expect(transferOwnership("b1", "owner", "target")).rejects.toThrow(
      "write failed",
    );
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
