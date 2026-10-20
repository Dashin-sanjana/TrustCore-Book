import "server-only";
import { createHmac } from "node:crypto";
import { incrementRateLimit } from "./repositories/security";
import { getEnv } from "@/lib/env";

export class RateLimitExceededError extends Error {
  constructor() {
    super("Too many attempts. Please try again later.");
    this.name = "RateLimitExceededError";
  }
}

export async function rateLimit(
  identity: string,
  limit = 10,
  windowSeconds = 900,
) {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = createHmac("sha256", getEnv().NEXTAUTH_SECRET)
    .update(`${identity}:${bucket}`)
    .digest("hex");
  // Atomic upsert, shared across Vercel instances. Never fail open on DB errors.
  const row = await incrementRateLimit(
    key,
    new Date((bucket + 1) * windowSeconds * 1000),
  );
  if (row.count > limit) throw new RateLimitExceededError();
}
