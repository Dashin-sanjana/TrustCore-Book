import { hasPermission } from "@/shared/policies/permissions";
import { z } from "zod";
export const loginSchema = z.object({
  email: z.email().max(254).trim().toLowerCase(),
  password: z.string().min(1).max(72),
});
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2).max(100),
  password: z
    .string()
    .min(12)
    .max(72)
    .refine(
      (v) => new TextEncoder().encode(v).length <= 72,
      "Use at most 72 UTF-8 bytes",
    ),
});
export const markets = {
  LK: { name: "Sri Lanka", currency: "LKR", timezone: "Asia/Colombo" },
  MV: { name: "Maldives", currency: "MVR", timezone: "Indian/Maldives" },
  AE: { name: "United Arab Emirates", currency: "AED", timezone: "Asia/Dubai" },
  AU: { name: "Australia", currency: "AUD", timezone: "Australia/Sydney" },
} as const;
export const businessSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .min(3)
    .max(60)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and single hyphens",
    ),
  country: z.enum(["LK", "MV", "AE", "AU"]),
  timezone: z
    .string()
    .max(100)
    .refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return v.includes("/");
      } catch {
        return false;
      }
    }, "Use an IANA timezone"),
});
export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  durationMinutes: z.coerce.number().int().min(5).max(720),
  price: z
    .string()
    .regex(
      /^\d{1,8}(\.\d{1,2})?$/,
      "Enter a nonnegative amount, up to two decimals",
    ),
});
export const staffSchema = z.object({
  name: z.string().trim().min(2).max(100),
});
export const customerSchema = staffSchema.extend({
  email: z.union([z.email().max(254), z.literal("")]),
  phone: z
    .string()
    .max(30)
    .refine(
      (v) => !v || /^\+?[0-9 ()-]{6,30}$/.test(v),
      "Enter a valid phone number",
    ),
});
export function canManage(role: string) {
  return (
    (role === "OWNER" || role === "ADMIN") &&
    hasPermission(role, "records.manage")
  );
}
