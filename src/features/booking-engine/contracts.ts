import { z } from "zod";
import {
  idSchema,
  utcInstantSchema,
  resultSchema,
} from "@/shared/contracts/result";
export const bookingCreationSchema = z.object({
  serviceId: idSchema,
  staffId: idSchema,
  customerId: idSchema,
  startsAt: utcInstantSchema,
  idempotencyKey: z.string().uuid(),
});
export const requestSchema = z
  .object({
    serviceId: idSchema,
    staffId: idSchema.optional(),
    from: utcInstantSchema,
    to: utcInstantSchema,
  })
  .refine(
    (v) => Date.parse(v.to) > Date.parse(v.from),
    "End must follow start",
  );
export const responseSchema = z.object({
  slots: z.array(
    z.object({
      staffId: idSchema,
      startsAt: utcInstantSchema,
      endsAt: utcInstantSchema,
    }),
  ),
});
export const operation = "getAvailability" as const;
export type Request = z.input<typeof requestSchema>;
export type Response = z.output<typeof responseSchema>;
export const resultSchemaForFeature = resultSchema(responseSchema);
