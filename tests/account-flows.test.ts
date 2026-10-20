import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  send: vi.fn(),
  preflight: vi.fn(),
  configured: true,
  getEnv: vi.fn(),
  findUserForEmail: vi.fn(),
  createAccountSecurityToken: vi.fn(),
  redeemVerificationToken: vi.fn(),
  hasRedeemableResetToken: vi.fn(),
  redeemResetToken: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  RateLimitExceededError: class RateLimitExceededError extends Error {},
}));
vi.mock("@/server/account-email", () => ({
  accountEmailDelivery: () => ({
    configured: mocks.configured,
    preflight: mocks.preflight,
    send: mocks.send,
  }),
}));
vi.mock("@/lib/env", () => ({
  getEnv: mocks.getEnv,
}));
vi.mock("@/server/repositories/identity", () => ({
  findUserForEmail: mocks.findUserForEmail,
  createAccountSecurityToken: mocks.createAccountSecurityToken,
  redeemVerificationToken: mocks.redeemVerificationToken,
  hasRedeemableResetToken: mocks.hasRedeemableResetToken,
  redeemResetToken: mocks.redeemResetToken,
}));
vi.mock("@/server/repositories/workspace", () => ({
  createOwnedBusiness: vi.fn(),
  insertRecord: vi.fn(),
  updateProfile: vi.fn(),
}));
vi.mock("@/server/authorization", () => ({
  requireUser: vi.fn(),
  requireUserSession: vi.fn(),
  requireTenant: vi.fn(),
}));

import {
  requestAccountEmailService,
  resetPasswordService,
  verifyEmailService,
} from "@/server/services";
import { issueAccountToken } from "@/server/account-tokens";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.configured = true;
  mocks.send.mockResolvedValue({ delivered: true });
  mocks.preflight.mockResolvedValue(true);
  mocks.getEnv.mockReturnValue({ NEXTAUTH_URL: "https://book.example.test" });
});
afterEach(() => vi.unstubAllEnvs());

describe("public account flows (repositories and delivery mocked)", () => {
  it("returns the same recovery response for present and absent accounts", async () => {
    const input = { email: "OWNER@EXAMPLE.COM" };
    mocks.findUserForEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "u1", email: "owner@example.com" });
    const absent = await requestAccountEmailService("RESET_PASSWORD", input);
    const present = await requestAccountEmailService("RESET_PASSWORD", input);
    expect(absent).toEqual(present);
    expect(mocks.createAccountSecurityToken).toHaveBeenCalledWith({
      userId: "u1",
      purpose: "RESET_PASSWORD",
      digest: expect.stringMatching(/^[a-f0-9]{64}$/),
      expiresAt: expect.any(Date),
    });
    expect(mocks.send).toHaveBeenCalledWith({
      kind: "RESET_PASSWORD",
      recipient: "owner@example.com",
      link: expect.stringMatching(
        /^https:\/\/book\.example\.test\/reset-password#token=/,
      ),
    });
  });

  it("does not claim delivery or issue tokens when the gateway is unconfigured", async () => {
    mocks.configured = false;
    expect(
      await requestAccountEmailService("RESET_PASSWORD", {
        email: "owner@example.com",
      }),
    ).toHaveProperty(
      "error",
      "Account email delivery is unavailable. Please try again later.",
    );
    expect(mocks.findUserForEmail).not.toHaveBeenCalled();
  });

  it("gives a local-only setup hint without looking up an account", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ACCOUNT_EMAIL_PROVIDER", "");
    mocks.configured = false;
    const result = await requestAccountEmailService("VERIFY_EMAIL", {
      email: "owner@example.com",
    });
    expect(result.error).toContain("set ACCOUNT_EMAIL_PROVIDER");
    expect(mocks.findUserForEmail).not.toHaveBeenCalled();
  });

  it("does not look up accounts or issue tokens for an HTTP account-link origin", async () => {
    mocks.getEnv.mockReturnValue({ NEXTAUTH_URL: "http://192.168.1.12:3000" });
    expect(
      await requestAccountEmailService("RESET_PASSWORD", {
        email: "owner@example.com",
      }),
    ).toEqual({
      error: "Secure account links are unavailable. Please try again later.",
    });
    expect(mocks.findUserForEmail).not.toHaveBeenCalled();
    expect(mocks.createAccountSecurityToken).not.toHaveBeenCalled();
  });

  it("does not look up an account when local delivery preflight fails", async () => {
    mocks.preflight.mockResolvedValue(false);
    expect(
      await requestAccountEmailService("VERIFY_EMAIL", {
        email: "owner@example.test",
      }),
    ).toEqual({
      error: "Account email delivery is unavailable. Please try again later.",
    });
    expect(mocks.findUserForEmail).not.toHaveBeenCalled();
    expect(mocks.createAccountSecurityToken).not.toHaveBeenCalled();
  });

  it("keeps responses generic when a configured gateway reports failure", async () => {
    mocks.findUserForEmail.mockResolvedValue({
      id: "u1",
      email: "owner@example.com",
    });
    mocks.send.mockResolvedValue({ delivered: false, reason: "failed" });
    const result = await requestAccountEmailService("RESET_PASSWORD", {
      email: "owner@example.com",
    });
    expect(result).toEqual({
      success:
        "If eligible and email delivery succeeds, check your inbox for a link.",
    });
    expect(result.success).not.toMatch(/sent|delivered/i);
  });

  it("rejects replayed verification and reset tokens", async () => {
    const verification = issueAccountToken("VERIFY_EMAIL", 60);
    mocks.redeemVerificationToken.mockResolvedValue(false);
    expect(await verifyEmailService(verification.token)).toEqual({
      error: "Invalid or expired link.",
    });
    const reset = issueAccountToken("RESET_PASSWORD", 30);
    mocks.hasRedeemableResetToken.mockResolvedValue(null);
    expect(
      await resetPasswordService({
        token: reset.token,
        password: "a new sufficiently long password",
      }),
    ).toEqual({ error: "Invalid or expired link." });
    expect(mocks.redeemResetToken).not.toHaveBeenCalled();
  });
});
