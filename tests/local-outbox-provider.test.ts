import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  target: vi.fn(),
  verify: vi.fn(),
  write: vi.fn(),
}));
vi.mock("@/server/local-outbox-target", () => ({
  localOutboxTarget: mocks.target,
  verifyLocalOutboxTarget: mocks.verify,
}));
vi.mock("@/server/local-outbox", () => ({ writeLocalOutbox: mocks.write }));

import { accountEmailDelivery } from "@/server/account-email";

const target = {
  origin: "http://localhost:3000",
  accessToken: "A".repeat(43),
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ACCOUNT_EMAIL_PROVIDER", "local");
  mocks.target.mockReturnValue(target);
});

describe("local account-email adapter", () => {
  it("refuses an unverified target without storing a message", async () => {
    mocks.verify.mockRejectedValue(new Error("unavailable"));
    const delivery = accountEmailDelivery();
    expect(await delivery.preflight?.()).toBe(false);
    expect(
      await delivery.send({
        kind: "VERIFY_EMAIL",
        recipient: "owner@example.test",
        link: `http://localhost:3000/verify-email#token=${"A".repeat(43)}`,
      }),
    ).toEqual({ delivered: false, reason: "failed" });
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("writes only exact-origin, purpose-matched token links after verification", async () => {
    const delivery = accountEmailDelivery();
    const message = {
      kind: "VERIFY_EMAIL" as const,
      recipient: "owner@example.test",
      link: `http://localhost:3000/verify-email#token=${"A".repeat(43)}`,
    };
    expect(await delivery.send(message)).toEqual({ delivered: true });
    expect(mocks.write).toHaveBeenCalledWith(target, message);
    expect(
      await delivery.send({
        ...message,
        link: message.link.replace("localhost", "192.168.1.10"),
      }),
    ).toEqual({ delivered: false, reason: "failed" });
    expect(
      await delivery.send({
        ...message,
        link: message.link.replace("verify-email", "reset-password"),
      }),
    ).toEqual({ delivered: false, reason: "failed" });
    expect(mocks.write).toHaveBeenCalledTimes(1);
  });

  it("does not report delivery when local storage fails", async () => {
    mocks.write.mockRejectedValue(new Error("disk unavailable"));
    expect(
      await accountEmailDelivery().send({
        kind: "INVITATION",
        recipient: "staff@example.test",
        link: `http://localhost:3000/invitations#token=${"B".repeat(43)}`,
      }),
    ).toEqual({ delivered: false, reason: "failed" });
  });
});
