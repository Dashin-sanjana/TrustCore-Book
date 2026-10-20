import { describe, expect, it } from "vitest";
import { digestAccountToken, issueAccountToken } from "@/server/account-tokens";
import { unconfiguredAccountEmailDelivery } from "@/server/account-email";

describe("preparatory account token primitives (no persistence or delivery)", () => {
  it("issues unique 32-byte random tokens with digest-only storage material", () => {
    const first = issueAccountToken(
      "RESET_PASSWORD",
      30,
      new Date("2026-01-01T00:00:00Z"),
    );
    const second = issueAccountToken(
      "RESET_PASSWORD",
      30,
      new Date("2026-01-01T00:00:00Z"),
    );
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.token).not.toBe(second.token);
    expect(first.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.digest).not.toContain(first.token);
    expect(first.expiresAt.toISOString()).toBe("2026-01-01T00:30:00.000Z");
  });

  it("binds digests to token purpose and rejects malformed tokens", () => {
    const { token, digest } = issueAccountToken("VERIFY_EMAIL", 60);
    expect(digestAccountToken("VERIFY_EMAIL", token)).toBe(digest);
    expect(digestAccountToken("RESET_PASSWORD", token)).not.toBe(digest);
    expect(digestAccountToken("VERIFY_EMAIL", "not-a-token")).toBeNull();
  });

  it("refuses unsupported lifetimes", () => {
    expect(() => issueAccountToken("RESET_PASSWORD", 0)).toThrow(RangeError);
    expect(() => issueAccountToken("RESET_PASSWORD", 61)).toThrow(RangeError);
  });

  it("does not claim delivery when no trusted provider is configured", async () => {
    expect(
      await unconfiguredAccountEmailDelivery.send({
        kind: "VERIFY_EMAIL",
        recipient: "user@example.com",
        link: "https://example.com/verify-email",
      }),
    ).toEqual({ delivered: false, reason: "unconfigured" });
  });
});
