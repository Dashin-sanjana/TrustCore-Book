import { it, expect } from "vitest";
import { requestSchema as availability } from "@/features/booking-engine/contracts";
import { bookingCreationSchema } from "@/features/booking-engine/contracts";
import { hasPermission } from "@/shared/policies/permissions";
import { apiResponse } from "@/shared/api/response";
it("requires ordered UTC ranges for availability", () => {
  expect(
    availability.safeParse({
      serviceId: "service",
      from: "2030-01-01T10:00:00Z",
      to: "2030-01-01T09:00:00Z",
    }).success,
  ).toBe(false);
  expect(
    availability.safeParse({
      serviceId: "service",
      from: "2030-01-01T10:00:00+05:30",
      to: "2030-01-01T11:00:00+05:30",
    }).success,
  ).toBe(false);
});
it("requires an idempotency key on the proposed booking request", () => {
  expect(
    bookingCreationSchema.safeParse({
      serviceId: "s",
      staffId: "t",
      customerId: "c",
      startsAt: "2030-01-01T10:00:00Z",
    }).success,
  ).toBe(false);
});
it("restricts ownership transfer to an owner", () => {
  expect(hasPermission("OWNER", "ownership.transfer")).toBe(true);
  expect(hasPermission("ADMIN", "ownership.transfer")).toBe(false);
  expect(hasPermission("MEMBER", "records.manage")).toBe(false);
});
it("maps unavailable workflows to real errors instead of fake success", async () => {
  const result = apiResponse(
    {
      ok: false,
      error: { code: "NOT_IMPLEMENTED", message: "Not implemented" },
    },
    "request-test",
  );
  expect(result.status).toBe(501);
  expect(await result.json()).toMatchObject({
    ok: false,
    error: { code: "NOT_IMPLEMENTED", requestId: "request-test" },
  });
  expect(result.headers.get("Cache-Control")).toBe("no-store");
});
