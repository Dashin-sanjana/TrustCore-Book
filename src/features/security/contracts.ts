import { z } from "zod";
import { resultSchema } from "@/shared/contracts/result";

export const requestSchema = z.object({});
export const responseSchema = z.object({
  status: z.enum(["ok", "unavailable"]),
});
export const operation = "getHealth" as const;
export type Request = z.input<typeof requestSchema>;
export type Response = z.output<typeof responseSchema>;
export const resultSchemaForFeature = resultSchema(responseSchema);
