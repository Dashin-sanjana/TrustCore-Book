import { describe, expect, it } from "vitest";
import { unavailableBookingNotifications } from "@/features/notifications/server/provider";
import { unavailablePayments } from "@/features/payments/server/provider";

describe("optional integration defaults", () => {
  it("never claims a booking notification was delivered without a provider", async () => {
    expect(unavailableBookingNotifications.configured).toBe(false);
    expect(
      await unavailableBookingNotifications.send({
        businessId: "b1",
        bookingId: "booking1",
        recipient: "guest@example.test",
        kind: "BOOKING_CONFIRMED",
      }),
    ).toEqual({ delivered: false, reason: "unconfigured" });
  });

  it("never creates a payment intent without a provider", async () => {
    expect(unavailablePayments.configured).toBe(false);
    expect(
      await unavailablePayments.createIntent({
        invoiceId: "invoice1",
        idempotencyKey: "8d788084-55cf-467a-a0ea-113a610ba17d",
      }),
    ).toEqual({ available: false, reason: "unconfigured" });
  });
});
