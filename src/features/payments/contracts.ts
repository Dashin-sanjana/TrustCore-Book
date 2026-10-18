import { z } from "zod";
import { idSchema, resultSchema } from "@/shared/contracts/result";

export const requestSchema = z.object({
  invoiceId: idSchema,
  idempotencyKey: z.string().uuid(),
});
export const responseSchema = z.object({
  providerReference: z.string(),
  redirectUrl: z.url(),
});
export const operation = "createPaymentIntent" as const;
export type Request = z.input<typeof requestSchema>;
export type Response = z.output<typeof responseSchema>;
export const resultSchemaForFeature = resultSchema(responseSchema);
