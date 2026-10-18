import { z } from "zod";
import {
  idSchema,
  recordSchema,
  resultSchema,
} from "@/shared/contracts/result";
export const appointmentStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);
export const cancellationPolicySchema = z.object({
  minimumNoticeMinutes: z.number().int().min(0),
  allowCustomerCancellation: z.boolean(),
});
export const requestSchema = z.object({
  appointmentId: idSchema,
  status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
});
export const responseSchema = recordSchema;
export const operation = "changeStatus" as const;
export type Request = z.input<typeof requestSchema>;
export type Response = z.output<typeof responseSchema>;
export const resultSchemaForFeature = resultSchema(responseSchema);
