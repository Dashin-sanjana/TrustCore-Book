import { beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: () => ({ rateLimit: { upsert: mocks.upsert } }),
}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ NEXTAUTH_SECRET: "test-secret-only-for-unit-tests-0000" }),
}));
import { rateLimit, RateLimitExceededError } from "@/server/rate-limit";
beforeEach(() => vi.resetAllMocks());
it("rejects exhausted quotas without storing plaintext identities", async () => {
  mocks.upsert.mockResolvedValue({ count: 11 });
  await expect(
    rateLimit("login:private@example.com", 10),
  ).rejects.toBeInstanceOf(RateLimitExceededError);
  const input = mocks.upsert.mock.calls[0]?.[0];
  expect(input.where.key).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(input)).not.toContain("private@example.com");
});
it("fails closed when distributed rate-limit storage is unavailable", async () => {
  mocks.upsert.mockRejectedValue(new Error("unavailable"));
  await expect(rateLimit("login:test")).rejects.toThrow("unavailable");
});
it("uses different opaque keys for independent action identities", async () => {
  mocks.upsert.mockResolvedValue({ count: 1 });
  await rateLimit("auth-post:signout:session:s1", 30, 60);
  await rateLimit("auth-post:signout:session:s2", 30, 60);
  await rateLimit("auth-post:callback", 200, 60);
  const keys = mocks.upsert.mock.calls.map(([query]) => query.where.key);
  expect(new Set(keys).size).toBe(3);
  expect(keys.every((key) => /^[a-f0-9]{64}$/.test(key))).toBe(true);
});
