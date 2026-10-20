import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireTenant: vi.fn(),
  requireUser: vi.fn(),
  createInvitation: vi.fn(),
  listPending: vi.fn(),
  revokeUndelivered: vi.fn(),
  rateLimit: vi.fn(),
  send: vi.fn(),
  preflight: vi.fn(),
}));
vi.mock("@/server/authorization", () => ({
  requireTenant: mocks.requireTenant,
  requireUser: mocks.requireUser,
}));
vi.mock("@/server/repositories/invitations", () => ({
  createInvitation: mocks.createInvitation,
  revokeUndeliveredInvitation: mocks.revokeUndelivered,
  listPendingInvitations: mocks.listPending,
  redeemInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
  changeMembership: vi.fn(),
  transferOwnership: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  RateLimitExceededError: class extends Error {},
}));
vi.mock("@/server/account-email", () => ({
  accountEmailDelivery: () => ({
    configured: true,
    preflight: mocks.preflight,
    send: mocks.send,
  }),
}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ NEXTAUTH_URL: "https://book.example.test" }),
}));

import {
  digestInvitationToken,
  inviteMember,
  pendingInvitations,
} from "@/server/membership";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("A2_MEMBERSHIP_ENABLED", "true");
  mocks.requireTenant.mockResolvedValue({
    user: { id: "owner" },
    member: { role: "OWNER" },
  });
  mocks.createInvitation.mockResolvedValue("i1");
  mocks.preflight.mockResolvedValue(true);
});
afterEach(() => vi.unstubAllEnvs());

describe("A2 invitation service (dependencies mocked)", () => {
  it("limits ADMIN invitation listing to MEMBER invitations", async () => {
    mocks.requireTenant.mockResolvedValue({
      user: { id: "admin" },
      member: { role: "ADMIN" },
    });
    mocks.listPending.mockResolvedValue([]);
    await pendingInvitations("b1");
    expect(mocks.listPending).toHaveBeenCalledWith("b1", "ADMIN");
  });
  it("keeps the new table unreachable while disabled", async () => {
    vi.stubEnv("A2_MEMBERSHIP_ENABLED", "false");
    expect(
      await inviteMember("b1", { email: "u@example.test", role: "MEMBER" }),
    ).toEqual({ error: "Member management is not available yet." });
    expect(mocks.requireTenant).not.toHaveBeenCalled();
    expect(mocks.createInvitation).not.toHaveBeenCalled();
  });

  it("does not create an invitation when local delivery preflight fails", async () => {
    mocks.preflight.mockResolvedValue(false);
    expect(
      await inviteMember("b1", { email: "u@example.test", role: "MEMBER" }),
    ).toEqual({
      error: "Invitation email delivery is unavailable.",
    });
    expect(mocks.createInvitation).not.toHaveBeenCalled();
  });

  it("persists a digest only and revokes when delivery fails", async () => {
    mocks.send.mockResolvedValue({ delivered: false, reason: "failed" });
    expect(
      await inviteMember("b1", { email: "U@Example.Test", role: "MEMBER" }),
    ).toEqual({ error: "Invitation delivery failed. Please retry." });
    const persisted = mocks.createInvitation.mock.calls[0]![0];
    expect(persisted.email).toBe("u@example.test");
    expect(persisted.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(persisted)).not.toContain("#token=");
    expect(mocks.revokeUndelivered).toHaveBeenCalledWith("i1");
    const link = mocks.send.mock.calls[0]![0].link as string;
    expect(digestInvitationToken(new URL(link).hash.slice(7))).toBe(
      persisted.digest,
    );
  });

  it("reports delivery only after the adapter confirms it", async () => {
    mocks.send.mockResolvedValue({ delivered: true });
    expect(
      await inviteMember("b1", { email: "u@example.test", role: "ADMIN" }),
    ).toEqual({ success: "Invitation sent." });
    expect(mocks.revokeUndelivered).not.toHaveBeenCalled();
  });
});
