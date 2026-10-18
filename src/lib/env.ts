import "server-only";
import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z
    .url()
    .refine((v) => /^postgres(ql)?:/.test(v), "Use a PostgreSQL URL"),
  NEXTAUTH_URL: z.url(),
  NEXTAUTH_SECRET: z.string().min(32),
});
export function getEnv() {
  const result = schema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  });
  if (!result.success)
    throw new Error("Server environment is incomplete. See .env.example.");
  if (
    process.env.NODE_ENV === "production" &&
    !result.data.NEXTAUTH_URL.startsWith("https://")
  )
    throw new Error("Production requires HTTPS.");
  return result.data;
}
