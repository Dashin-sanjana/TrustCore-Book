import { it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: () => ({ rateLimit: { upsert: mocks.upsert } }),
}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ NEXTAUTH_SECRET: "test-secret-only-for-unit-tests-0000" }),
}));
import { rateLimit } from "@/server/rate-limit";
it("rejects exhausted quotas without storing plaintext identities", async () => {
  mocks.upsert.mockResolvedValue({ count: 11 });
  await expect(rateLimit("login:private@example.com", 10)).rejects.toThrow(
    "Too many attempts",
  );
  const input = mocks.upsert.mock.calls[0]?.[0];
  expect(input.where.key).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(input)).not.toContain("private@example.com");
});
it("fails closed when distributed rate-limit storage is unavailable", async () => {
  mocks.upsert.mockRejectedValue(new Error("unavailable"));
  await expect(rateLimit("login:test")).rejects.toThrow("unavailable");
});
