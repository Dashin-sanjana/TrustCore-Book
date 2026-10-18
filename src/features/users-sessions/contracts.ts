import { z } from "zod";
import { idSchema, resultSchema } from "@/shared/contracts/result";

export const requestSchema = z.object({ sessionId: idSchema });
export const responseSchema = z.object({ revoked: z.boolean() });
export const operation = "revokeSession" as const;
export type Request = z.input<typeof requestSchema>;
export type Response = z.output<typeof responseSchema>;
export const resultSchemaForFeature = resultSchema(responseSchema);
