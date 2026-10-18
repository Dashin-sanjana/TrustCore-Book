import "server-only";
import type { PublicServiceContext } from "@/shared/contracts/context";
import type { Request, Response } from "../contracts";
import type { ServiceResult } from "@/shared/contracts/result";
/** Proposed boundary. Interface only: not a runtime implementation. See module README. */
export interface FeatureService {
  signIn(
    context: PublicServiceContext,
    input: Request,
  ): Promise<ServiceResult<Response>>;
}
