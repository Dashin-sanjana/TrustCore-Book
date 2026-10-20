import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  findBusiness: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  RateLimitExceededError: class RateLimitExceededError extends Error {},
}));
vi.mock("@/lib/db", () => ({
  db: () => ({ business: { findUnique: mocks.findBusiness } }),
}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ NEXTAUTH_SECRET: "test-only-booking-secret" }),
}));

import {
  createPublicBooking,
  getPublicSlots,
} from "@/server/repositories/booking";

describe("public booking rate-limit buckets", () => {
  beforeEach(() => {
    process.env.BOOKING_MVP_ENABLED = "true";
    mocks.rateLimit.mockReset();
    mocks.findBusiness.mockReset().mockResolvedValue(null);
  });

  it("budgets slot searches per signed browser as well as globally", async () => {
    const from = new Date(Date.now() + 2 * 86400_000);
    await getPublicSlots(
      {
        slug: "test-business",
        serviceId: "cm0qwerty0000abc123456789",
        from: from.toISOString(),
        to: new Date(from.getTime() + 86400_000).toISOString(),
      },
      "verified-browser-id",
    );
    expect(mocks.rateLimit).toHaveBeenCalledWith(
      "booking-slots:global",
      600,
      60,
    );
    expect(mocks.rateLimit).toHaveBeenCalledWith(
      "booking-slots:client:verified-browser-id",
      30,
      60,
    );
  });

  it("budgets creation by browser and email while retaining the global ceiling", async () => {
    await createPublicBooking(
      {
        slug: "test-business",
        serviceId: "cm0qwerty0000abc123456789",
        slotId: "a".repeat(64),
        startsAt: new Date(Date.now() + 2 * 86400_000).toISOString(),
        idempotencyKey: "00000000-0000-4000-8000-000000000001",
        name: "Test Customer",
        email: "customer@example.test",
        phone: "",
      },
      "verified-browser-id",
    );
    expect(mocks.rateLimit).toHaveBeenCalledWith(
      "public-booking-create:global",
      300,
      60,
    );
    expect(mocks.rateLimit).toHaveBeenCalledWith(
      "public-booking-create:client:verified-browser-id",
      6,
      60,
    );
    expect(mocks.rateLimit).toHaveBeenCalledWith(
      "public-booking-create:customer@example.test",
      5,
      3600,
    );
  });
});
