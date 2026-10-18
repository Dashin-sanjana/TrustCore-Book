import { z } from "zod";
export const errorCodeSchema = z.enum([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "CONFLICT",
  "RATE_LIMITED",
  "NOT_IMPLEMENTED",
  "UNAVAILABLE",
  "INTERNAL_ERROR",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: ErrorCode; message: string; requestId?: string };
    };
export const idSchema = z.string().min(1).max(128);
export const tenantRequestSchema = z.object({ businessId: idSchema });
export const listRequestSchema = z.object({
  cursor: idSchema.optional(),
  limit: z.number().int().min(1).max(100).default(25),
});
export const recordSchema = z.object({ id: idSchema });
export const utcInstantSchema = z.iso.datetime();
export const moneySchema = z.object({
  amount: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
  currency: z.enum(["LKR", "MVR", "AED", "AUD"]),
});
export function resultSchema<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), data }),
    z.object({
      ok: z.literal(false),
      error: z.object({
        code: errorCodeSchema,
        message: z.string(),
        requestId: z.string().optional(),
      }),
    }),
  ]);
}
