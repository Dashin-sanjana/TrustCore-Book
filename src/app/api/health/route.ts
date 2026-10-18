import { rateLimit } from "@/server/rate-limit";
import { checkDatabase } from "@/server/repositories/security";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await rateLimit("health:global", 120, 60);
    await checkDatabase();
    return Response.json(
      { status: "ok", database: "reachable" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
