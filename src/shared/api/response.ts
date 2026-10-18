import { randomUUID } from "node:crypto";
import type { ErrorCode, ServiceResult } from "@/shared/contracts/result";
export const statusForError: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  NOT_IMPLEMENTED: 501,
  UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};
/** Never pass raw exceptions or database records to this adapter. */
export function apiResponse<T>(
  result: ServiceResult<T>,
  requestId: string = randomUUID(),
) {
  return Response.json(
    result.ok
      ? { ...result, requestId }
      : { ...result, error: { ...result.error, requestId } },
    {
      status: result.ok ? 200 : statusForError[result.error.code],
      headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
    },
  );
}
