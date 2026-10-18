import { z } from "zod";
import {
  idSchema,
  recordSchema,
  resultSchema,
} from "@/shared/contracts/result";

export const requestSchema = z.object({
  memberId: idSchema,
  role: z.enum(["ADMIN", "MEMBER"]),
});
export const responseSchema = recordSchema;
export const operation = "changeMemberRole" as const;
export type Request = z.input<typeof requestSchema>;
export type Response = z.output<typeof responseSchema>;
export const resultSchemaForFeature = resultSchema(responseSchema);
