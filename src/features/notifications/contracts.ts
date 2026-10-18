import { z } from "zod";
import {
  idSchema,
  utcInstantSchema,
  resultSchema,
} from "@/shared/contracts/result";

export const requestSchema = z.object({
  appointmentId: idSchema,
  channel: z.enum(["EMAIL", "SMS"]),
  scheduledFor: utcInstantSchema,
  deduplicationKey: z.string().min(1).max(128),
});
export const responseSchema = z.object({ notificationId: idSchema });
export const operation = "queueReminder" as const;
export type Request = z.input<typeof requestSchema>;
export type Response = z.output<typeof responseSchema>;
export const resultSchemaForFeature = resultSchema(responseSchema);
