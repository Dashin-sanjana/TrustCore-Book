import { z } from "zod";
import { utcInstantSchema, resultSchema } from "@/shared/contracts/result";

export const requestSchema = z
  .object({
    from: utcInstantSchema,
    to: utcInstantSchema,
    report: z.enum(["APPOINTMENTS", "REVENUE"]),
  })
  .refine(
    (v) => Date.parse(v.to) > Date.parse(v.from),
    "End must follow start",
  );
export const responseSchema = z.object({
  rows: z.array(z.object({ period: z.string(), value: z.string() })),
});
export const operation = "getReport" as const;
export type Request = z.input<typeof requestSchema>;
export type Response = z.output<typeof responseSchema>;
export const resultSchemaForFeature = resultSchema(responseSchema);
