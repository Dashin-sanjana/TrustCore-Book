import { z } from "zod";
import { moneySchema, resultSchema } from "@/shared/contracts/result";

export const requestSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(60),
});
export const responseSchema = z.object({
  businessName: z.string(),
  timezone: z.string(),
  services: z.array(
    z.object({
      name: z.string(),
      durationMinutes: z.number().int(),
      price: moneySchema,
    }),
  ),
});
export const operation = "getPublicMenu" as const;
export type Request = z.input<typeof requestSchema>;
export type Response = z.output<typeof responseSchema>;
export const resultSchemaForFeature = resultSchema(responseSchema);
