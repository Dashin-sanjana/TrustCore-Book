import { timingSafeEqual } from "node:crypto";
import {
  localOutboxTarget,
  verifyLocalOutboxTarget,
} from "@/server/local-outbox-target";
import { readLocalOutbox } from "@/server/local-outbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = {
  "Cache-Control": "no-store, private",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: Request) {
  const target = localOutboxTarget(process.env);
  if (!target) return new Response(null, { status: 404, headers });
  const origin = new URL(target.origin);
  if (
    request.headers.get("host") !== origin.host ||
    new URL(request.url).origin !== target.origin
  )
    return new Response(null, { status: 404, headers });
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer "))
    return new Response(null, { status: 404, headers });
  const supplied = authorization.slice(7);
  const expected = Buffer.from(target.accessToken);
  const actual = Buffer.from(supplied);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return new Response(null, { status: 404, headers });
  try {
    await verifyLocalOutboxTarget(target);
    return Response.json(
      { messages: await readLocalOutbox(target) },
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Development outbox is unavailable." },
      { status: 503, headers },
    );
  }
}
