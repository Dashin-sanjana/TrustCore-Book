import { afterEach, describe, expect, it, vi } from "vitest";
import { accountEmailDelivery } from "@/server/account-email";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("transactional email gateway adapter (network mocked)", () => {
  it("rejects non-HTTPS token links before contacting the gateway", async () => {
    vi.stubEnv("ACCOUNT_EMAIL_PROVIDER", "gateway");
    vi.stubEnv("ACCOUNT_EMAIL_GATEWAY_URL", "https://mail.example.test/send");
    vi.stubEnv("ACCOUNT_EMAIL_GATEWAY_TOKEN", "test-only-token");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(
      await accountEmailDelivery().send({
        kind: "RESET_PASSWORD",
        recipient: "user@example.test",
        link: "http://book.example.test/reset-password#token=opaque",
      }),
    ).toEqual({ delivered: false, reason: "failed" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("refuses absent and non-HTTPS gateway configuration", async () => {
    vi.stubEnv("ACCOUNT_EMAIL_GATEWAY_URL", "");
    vi.stubEnv("ACCOUNT_EMAIL_GATEWAY_TOKEN", "");
    expect(accountEmailDelivery().configured).toBe(false);
    vi.stubEnv("ACCOUNT_EMAIL_GATEWAY_URL", "http://mail.example.test/send");
    vi.stubEnv("ACCOUNT_EMAIL_GATEWAY_TOKEN", "test-only-token");
    expect(accountEmailDelivery().configured).toBe(false);
  });

  it("reports provider failure without exposing the bearer or link in an error", async () => {
    vi.stubEnv("ACCOUNT_EMAIL_GATEWAY_URL", "https://mail.example.test/send");
    vi.stubEnv("ACCOUNT_EMAIL_GATEWAY_TOKEN", "test-only-token");
    const fetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetch);
    const delivery = accountEmailDelivery();
    expect(delivery.configured).toBe(true);
    expect(
      await delivery.send({
        kind: "RESET_PASSWORD",
        recipient: "user@example.test",
        link: "https://book.example.test/reset-password#token=opaque",
      }),
    ).toEqual({ delivered: false, reason: "failed" });
    expect(fetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
  });
});

describe("Resend account email adapter (network mocked)", () => {
  it("uses an invitation-specific text template", async () => {
    vi.stubEnv("ACCOUNT_EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "test-only-key");
    vi.stubEnv("ACCOUNT_EMAIL_FROM", "security@example.test");
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);
    expect(
      await accountEmailDelivery().send({
        kind: "INVITATION",
        recipient: "user@example.test",
        link: "https://book.example.test/invitations#token=opaque",
      }),
    ).toEqual({ delivered: true });
    const body = JSON.parse(fetch.mock.calls[0]![1].body);
    expect(body.subject).toContain("Join");
    expect(body.text).toContain("7 days");
    expect(body.text).toContain(
      "https://book.example.test/invitations#token=opaque",
    );
  });
  it("requires explicit provider configuration and a sender", () => {
    vi.stubEnv("ACCOUNT_EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "test-only-key");
    vi.stubEnv("ACCOUNT_EMAIL_FROM", "");
    expect(accountEmailDelivery().configured).toBe(false);
    vi.stubEnv("ACCOUNT_EMAIL_FROM", "security@example.test");
    expect(accountEmailDelivery().configured).toBe(true);
  });

  it("sends a text-only, expiry-aware verification message", async () => {
    vi.stubEnv("ACCOUNT_EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "test-only-key");
    vi.stubEnv("ACCOUNT_EMAIL_FROM", "security@example.test");
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);
    expect(
      await accountEmailDelivery().send({
        kind: "VERIFY_EMAIL",
        recipient: "user@example.test",
        link: "https://book.example.test/verify-email#token=opaque",
      }),
    ).toEqual({ delivered: true });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      from: "security@example.test",
      to: ["user@example.test"],
      subject: "Verify your TrustCore Book email",
    });
    expect(body.text).toContain("60 minutes");
    expect(body).not.toHaveProperty("html");
  });

  it("refuses insecure links and treats provider rejection as failure", async () => {
    vi.stubEnv("ACCOUNT_EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "test-only-key");
    vi.stubEnv("ACCOUNT_EMAIL_FROM", "security@example.test");
    const fetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetch);
    const delivery = accountEmailDelivery();
    expect(
      await delivery.send({
        kind: "RESET_PASSWORD",
        recipient: "user@example.test",
        link: "http://book.example.test/reset-password#token=opaque",
      }),
    ).toEqual({ delivered: false, reason: "failed" });
    expect(fetch).not.toHaveBeenCalled();
    expect(
      await delivery.send({
        kind: "RESET_PASSWORD",
        recipient: "user@example.test",
        link: "https://book.example.test/reset-password#token=opaque",
      }),
    ).toEqual({ delivered: false, reason: "failed" });
  });
});
