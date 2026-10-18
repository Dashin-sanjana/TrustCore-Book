import { z } from "zod";
import {
  idSchema,
  recordSchema,
  resultSchema,
} from "@/shared/contracts/result";

export const requestSchema = z
  .object({
    staffId: idSchema,
    weekday: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0),
    endMinute: z.number().int().max(1440),
  })
  .refine((v) => v.endMinute > v.startMinute, "End must follow start");
export const responseSchema = recordSchema;
export const operation = "saveRule" as const;
export type Request = z.input<typeof requestSchema>;
export type Response = z.output<typeof responseSchema>;
export const resultSchemaForFeature = resultSchema(responseSchema);
