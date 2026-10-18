import { z } from "zod";
import {
  idSchema,
  utcInstantSchema,
  resultSchema,
} from "@/shared/contracts/result";

export const requestSchema = z.object({});
export const responseSchema = z.object({
  planId: idSchema,
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED"]),
  renewsAt: utcInstantSchema.nullable(),
});
export const operation = "getSubscription" as const;
export type Request = z.input<typeof requestSchema>;
export type Response = z.output<typeof responseSchema>;
export const resultSchemaForFeature = resultSchema(responseSchema);
