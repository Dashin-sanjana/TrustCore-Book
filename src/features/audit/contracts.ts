import { z } from "zod";
import {
  idSchema,
  listRequestSchema,
  utcInstantSchema,
  resultSchema,
} from "@/shared/contracts/result";

export const requestSchema = listRequestSchema;
export const responseSchema = z.object({
  items: z.array(
    z.object({ id: idSchema, action: z.string(), createdAt: utcInstantSchema }),
  ),
  nextCursor: idSchema.nullable(),
});
export const operation = "listEvents" as const;
export type Request = z.input<typeof requestSchema>;
export type Response = z.output<typeof responseSchema>;
export const resultSchemaForFeature = resultSchema(responseSchema);
