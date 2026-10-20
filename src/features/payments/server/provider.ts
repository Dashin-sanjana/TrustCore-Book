import "server-only";
import type { Request, Response } from "../contracts";

export type PaymentResult =
  | { available: true; intent: Response }
  | { available: false; reason: "unconfigured" | "failed" };

export interface PaymentProvider {
  readonly configured: boolean;
  createIntent(request: Request): Promise<PaymentResult>;
}

export const unavailablePayments: PaymentProvider = {
  configured: false,
  async createIntent() {
    return { available: false, reason: "unconfigured" };
  },
};
