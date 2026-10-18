import { z } from "zod";
import { recordSchema, resultSchema } from "@/shared/contracts/result";
export { serviceSchema } from "@/lib/validation";
import { serviceSchema } from "@/lib/validation";
export const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
});
export const requestSchema = serviceSchema;
export const responseSchema = recordSchema;
export const operation = "createService" as const;
export type Request = z.input<typeof requestSchema>;
export type Response = z.output<typeof responseSchema>;
export const resultSchemaForFeature = resultSchema(responseSchema);
