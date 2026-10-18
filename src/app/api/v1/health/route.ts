import { GET as legacyHealth } from "@/app/api/health/route";
import { apiResponse } from "@/shared/api/response";
export const dynamic = "force-dynamic";
export async function GET() {
  const result = await legacyHealth();
  return result.ok
    ? apiResponse({ ok: true, data: { status: "ok", database: "reachable" } })
    : apiResponse({
        ok: false,
        error: {
          code: "UNAVAILABLE",
          message: "Service temporarily unavailable.",
        },
      });
}
