import { z } from "zod";
import { resultSchema } from "@/shared/contracts/result";

export const requestSchema = z.object({});
export const responseSchema = z.object({
  appointments: z.number().int().nonnegative(),
  services: z.number().int().nonnegative(),
  staff: z.number().int().nonnegative(),
  customers: z.number().int().nonnegative(),
});
export const operation = "getSummary" as const;
export type Request = z.input<typeof requestSchema>;
export type Response = z.output<typeof responseSchema>;
export const resultSchemaForFeature = resultSchema(responseSchema);
