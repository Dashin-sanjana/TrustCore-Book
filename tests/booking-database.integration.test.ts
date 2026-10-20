import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { approvedDevelopmentDatabase } from "./development-database-target";

const holder = vi.hoisted(() => ({ client: null as PrismaClient | null }));
vi.mock("@/lib/db", () => ({
  db: () => {
    if (!holder.client)
      throw new Error("Disposable booking database unavailable");
    return holder.client;
  },
}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    NEXTAUTH_SECRET: "booking-test-only-secret-never-for-production",
  }),
}));
vi.mock("@/server/rate-limit", () => ({
  rateLimit: async () => {},
  RateLimitExceededError: class extends Error {},
}));
import {
  createPublicBooking as createBooking,
  getPublicSlots as loadSlots,
} from "@/server/public-booking";

const getPublicSlots = (input: Parameters<typeof loadSlots>[0]) =>
  loadSlots(input, "verified-disposable-test-client");
const createPublicBooking = (input: Parameters<typeof createBooking>[0]) =>
  createBooking(input, "verified-disposable-test-client");

const url = process.env.BOOKING_TEST_DATABASE_URL;
const approved =
  process.env.BOOKING_TEST_DATABASE_VERIFIED === "YES" &&
  !!url &&
  (() => {
    try {
      const target = new URL(url);
      return (
        ["postgres:", "postgresql:"].includes(target.protocol) &&
        ((target.hostname ===
          "ep-wild-cloud-b52apabm.c-7.us-east-2.aws.neon.tech" &&
          target.pathname === "/trustcore_book_a1_test") ||
          approvedDevelopmentDatabase(url))
      );
    } catch {
      return false;
    }
  })();
const suite = approved ? describe : describe.skip;
const suffix = randomUUID();
const slug = `booking-test-${suffix}`;
let businessId = "";
let serviceId = "";
let selectedSlot: { id: string; startsAt: string };

suite("booking persistence on externally verified disposable Neon only", () => {
  beforeAll(async () => {
    process.env.BOOKING_MVP_ENABLED = "true";
    holder.client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url!, max: 5 }),
    });
    const migrations = await holder.client.$queryRaw<
      { migration_name: string }[]
    >`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    `;
    const applied = new Set(migrations.map((row) => row.migration_name));
    for (const required of [
      "20261018000000_initial",
      "20261018010000_phase_a1_identity",
      "20261019010000_phase_a2_invitations",
      "20261019020000_phase_a2_final_owner_guard",
      "20261019030000_booking_idempotency",
    ])
      if (!applied.has(required))
        throw new Error(`Disposable-test migration missing: ${required}`);
    const business = await holder.client.business.create({
      data: {
        name: "Booking integration test",
        slug,
        country: "LK",
        currency: "LKR",
        timezone: "Asia/Colombo",
      },
    });
    businessId = business.id;
    const service = await holder.client.service.create({
      data: {
        businessId,
        name: "Test service",
        durationMinutes: 30,
        price: "25.00",
      },
    });
    serviceId = service.id;
    const staff = await holder.client.staff.create({
      data: { businessId, name: "Test staff" },
    });
    await holder.client.staffService.create({
      data: { businessId, serviceId, staffId: staff.id },
    });
    await holder.client.availabilityRule.createMany({
      data: Array.from({ length: 7 }, (_, weekday) => ({
        businessId,
        staffId: staff.id,
        weekday,
        startMinute: 0,
        endMinute: 1440,
      })),
    });
    const from = new Date(Date.now() + 2 * 86400_000);
    const to = new Date(from.getTime() + 86400_000);
    const slots = await getPublicSlots({
      slug,
      serviceId,
      from: from.toISOString(),
      to: to.toISOString(),
    });
    if (!("slots" in slots) || !slots.slots?.length)
      throw new Error("Disposable test schedule yielded no slots");
    selectedSlot = slots.slots[0]!;
  });

  afterAll(async () => {
    if (!holder.client) return;
    try {
      if (businessId) {
        await holder.client.bookingRequest.deleteMany({
          where: { businessId },
        });
        await holder.client.appointment.deleteMany({ where: { businessId } });
        await holder.client.auditLog.deleteMany({ where: { businessId } });
        await holder.client.business.deleteMany({ where: { id: businessId } });
      }
    } finally {
      await holder.client.$disconnect();
      holder.client = null;
      delete process.env.BOOKING_MVP_ENABLED;
    }
  });

  it("returns the same appointment on an identical idempotency replay and rejects changed details", async () => {
    const request = {
      slug,
      serviceId,
      slotId: selectedSlot.id,
      startsAt: selectedSlot.startsAt,
      idempotencyKey: randomUUID(),
      name: "Booking Test",
      email: `test-${suffix}@example.test`,
      phone: "",
    };
    const first = await createPublicBooking(request);
    expect(first.success).toBe("Booking confirmed.");
    const second = await createPublicBooking(request);
    expect(second.bookingId).toBe(first.bookingId);
    const changed = await createPublicBooking({
      ...request,
      name: "Different Name",
    });
    expect(changed.error).toMatch(/already used/);
    expect(
      await holder.client!.appointment.count({
        where: { businessId, id: first.bookingId },
      }),
    ).toBe(1);
  });

  it("allows only one concurrent booking for the same staff interval", async () => {
    const slots = await getPublicSlots({
      slug,
      serviceId,
      from: new Date(
        Date.parse(selectedSlot.startsAt) + 3_600_000,
      ).toISOString(),
      to: new Date(Date.parse(selectedSlot.startsAt) + 7_200_000).toISOString(),
    });
    if (!("slots" in slots) || !slots.slots?.length)
      throw new Error("No second test slot");
    const slot = slots.slots[0]!;
    const base = {
      slug,
      serviceId,
      slotId: slot.id,
      startsAt: slot.startsAt,
      name: "Concurrent Test",
      email: `race-${suffix}@example.test`,
      phone: "",
    };
    const attempts = await Promise.all([
      createPublicBooking({ ...base, idempotencyKey: randomUUID() }),
      createPublicBooking({ ...base, idempotencyKey: randomUUID() }),
    ]);
    expect(attempts.filter((result) => result.success)).toHaveLength(1);
    expect(attempts.filter((result) => result.error)).toHaveLength(1);
  });

  it("returns one booking for concurrent identical idempotency keys", async () => {
    const slots = await getPublicSlots({
      slug,
      serviceId,
      from: new Date(
        Date.parse(selectedSlot.startsAt) + 8 * 3_600_000,
      ).toISOString(),
      to: new Date(
        Date.parse(selectedSlot.startsAt) + 12 * 3_600_000,
      ).toISOString(),
    });
    if (!("slots" in slots) || !slots.slots?.length)
      throw new Error("No same-key test slot");
    const slot = slots.slots[0]!;
    const idempotencyKey = randomUUID();
    const request = {
      slug,
      serviceId,
      slotId: slot.id,
      startsAt: slot.startsAt,
      idempotencyKey,
      name: "Same Key Test",
      email: `same-key-${suffix}@example.test`,
      phone: "",
    };
    const attempts = await Promise.all([
      createPublicBooking(request),
      createPublicBooking(request),
    ]);
    expect(attempts[0].success).toBe("Booking confirmed.");
    expect(attempts[1].success).toBe("Booking confirmed.");
    expect(attempts[0].bookingId).toBe(attempts[1].bookingId);
    expect(
      await holder.client!.bookingRequest.count({
        where: { businessId, idempotencyKey },
      }),
    ).toBe(1);
  });
});
