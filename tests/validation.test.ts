import { describe, it, expect } from "vitest";
import {
  businessSchema,
  registerSchema,
  serviceSchema,
  canManage,
} from "@/lib/validation";
describe("server input boundaries", () => {
  it("normalizes email and enforces bcrypt byte limits", () => {
    const base = {
      name: "Owner",
      email: "OWNER@EXAMPLE.COM",
      password: "a secure long password",
    };
    expect(registerSchema.parse(base).email).toBe("owner@example.com");
    expect(
      registerSchema.safeParse({ ...base, password: "short" }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ ...base, password: "😀".repeat(20) }).success,
    ).toBe(false);
  });
  it("rejects invalid timezones and unsafe public addresses", () => {
    const b = {
      name: "Salon",
      slug: "my-salon",
      country: "AU",
      timezone: "Australia/Perth",
    };
    expect(businessSchema.safeParse(b).success).toBe(true);
    expect(
      businessSchema.safeParse({ ...b, timezone: "Mars/Olympus" }).success,
    ).toBe(false);
    expect(businessSchema.safeParse({ ...b, slug: "../admin" }).success).toBe(
      false,
    );
  });
  it("validates duration and decimal money without float coercion", () => {
    expect(
      serviceSchema.safeParse({
        name: "Haircut",
        durationMinutes: "30",
        price: "1500.00",
      }).success,
    ).toBe(true);
    for (const price of ["-1", "NaN", "1.001"])
      expect(
        serviceSchema.safeParse({ name: "Haircut", durationMinutes: 30, price })
          .success,
      ).toBe(false);
    expect(
      serviceSchema.safeParse({
        name: "Haircut",
        durationMinutes: 0,
        price: "1",
      }).success,
    ).toBe(false);
  });
  it("restricts writes to tenant managers", () => {
    expect(canManage("OWNER")).toBe(true);
    expect(canManage("ADMIN")).toBe(true);
    expect(canManage("MEMBER")).toBe(false);
    expect(canManage("PLATFORM_ADMIN")).toBe(false);
  });
});
