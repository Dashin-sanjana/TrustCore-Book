import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

const cookieName = "trustcore_booking_client";

function signature(id: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`booking-client:${id}`)
    .digest("hex");
}

export function verifyBookingClient(value: string | undefined, secret: string) {
  if (!value) return null;
  const match = /^([A-Za-z0-9_-]{22})\.([a-f0-9]{64})$/.exec(value);
  const id = match?.[1];
  const digest = match?.[2];
  if (!id || !digest) return null;
  const actual = Buffer.from(digest, "hex");
  const expected = Buffer.from(signature(id, secret), "hex");
  return timingSafeEqual(actual, expected) ? id : null;
}

export function issueBookingClient(secret: string) {
  const id = randomBytes(16).toString("base64url");
  return { id, value: `${id}.${signature(id, secret)}` };
}

export async function bookingClientId() {
  const store = await cookies();
  const secret = getEnv().NEXTAUTH_SECRET;
  const current = verifyBookingClient(store.get(cookieName)?.value, secret);
  if (current) return current;
  const issued = issueBookingClient(secret);
  store.set(cookieName, issued.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 86400,
  });
  return issued.id;
}
