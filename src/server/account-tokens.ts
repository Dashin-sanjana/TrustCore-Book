import "server-only";
import { createHash, randomBytes } from "node:crypto";

export type AccountTokenPurpose = "VERIFY_EMAIL" | "RESET_PASSWORD";

export function digestAccountToken(
  purpose: AccountTokenPurpose,
  token: string,
) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return createHash("sha256").update(`${purpose}:${token}`).digest("hex");
}

export function issueAccountToken(
  purpose: AccountTokenPurpose,
  lifetimeMinutes: number,
  now = new Date(),
) {
  if (
    !Number.isInteger(lifetimeMinutes) ||
    lifetimeMinutes < 1 ||
    lifetimeMinutes > 60
  )
    throw new RangeError("Invalid token lifetime");
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    digest: digestAccountToken(purpose, token)!,
    expiresAt: new Date(now.getTime() + lifetimeMinutes * 60_000),
  };
}
