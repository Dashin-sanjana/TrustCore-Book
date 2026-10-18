import { z } from "zod";
import { resultSchema } from "@/shared/contracts/result";

export const requestSchema = z.object({
  timezone: z.string().refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return value.includes("/");
    } catch {
      return false;
    }
  }, "Use an IANA timezone"),
});
export const responseSchema = z.object({ timezone: z.string() });
export const operation = "validateTimezone" as const;
export type Request = z.input<typeof requestSchema>;
export type Response = z.output<typeof responseSchema>;
export const resultSchemaForFeature = resultSchema(responseSchema);
