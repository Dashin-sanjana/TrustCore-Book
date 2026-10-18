import "server-only";
import type { TenantContext } from "@/server/authorization";
import type { Request, Response } from "../contracts";
import type { ServiceResult } from "@/shared/contracts/result";
/** Proposed boundary. Interface only: not a runtime implementation. See module README. */
export interface FeatureService {
  getAvailability(
    context: TenantContext,
    input: Request,
  ): Promise<ServiceResult<Response>>;
}
