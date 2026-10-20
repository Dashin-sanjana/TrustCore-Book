import "server-only";
import type { AccountEmailMessage } from "@/shared/contracts/local-outbox";
import { writeLocalOutbox } from "./local-outbox";
import {
  localOutboxTarget,
  verifyLocalOutboxTarget,
} from "./local-outbox-target";

export type {
  AccountEmailKind,
  AccountEmailMessage,
} from "@/shared/contracts/local-outbox";
export type DeliveryResult =
  { delivered: true } | { delivered: false; reason: "unconfigured" | "failed" };

export interface AccountEmailDelivery {
  readonly configured: boolean;
  preflight?(): Promise<boolean>;
  send(message: AccountEmailMessage): Promise<DeliveryResult>;
}

export const unconfiguredAccountEmailDelivery: AccountEmailDelivery = {
  configured: false,
  async send() {
    return { delivered: false, reason: "unconfigured" };
  },
};

function secureLink(link: string) {
  try {
    const url = new URL(link);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function localDelivery(): AccountEmailDelivery {
  const target = localOutboxTarget(process.env);
  if (!target) return unconfiguredAccountEmailDelivery;
  const preflight = async () => {
    try {
      await verifyLocalOutboxTarget(target);
      return true;
    } catch {
      return false;
    }
  };
  return {
    configured: true,
    preflight,
    async send(message) {
      try {
        const link = new URL(message.link);
        const expectedPath = {
          VERIFY_EMAIL: "/verify-email",
          RESET_PASSWORD: "/reset-password",
          INVITATION: "/invitations",
        }[message.kind];
        if (
          link.origin !== target.origin ||
          link.pathname !== expectedPath ||
          link.search ||
          !/^#token=[A-Za-z0-9_-]{43}$/.test(link.hash) ||
          !(await preflight())
        )
          return { delivered: false, reason: "failed" };
        await writeLocalOutbox(target, message);
        return { delivered: true };
      } catch {
        return { delivered: false, reason: "failed" };
      }
    },
  };
}

function resendDelivery(): AccountEmailDelivery {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ACCOUNT_EMAIL_FROM;
  if (!key || !from || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from))
    return unconfiguredAccountEmailDelivery;
  return {
    configured: true,
    async send(message) {
      if (!secureLink(message.link))
        return { delivered: false, reason: "failed" };
      const isVerification = message.kind === "VERIFY_EMAIL";
      const isInvitation = message.kind === "INVITATION";
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            authorization: `Bearer ${key}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [message.recipient],
            subject: isVerification
              ? "Verify your TrustCore Book email"
              : isInvitation
                ? "Join a TrustCore Book business"
                : "Reset your TrustCore Book password",
            text: isVerification
              ? `Verify your email using this link (valid for 60 minutes):\n${message.link}\n\nIf you did not create this account, ignore this email.`
              : isInvitation
                ? `You have been invited to join a business. Sign in with this email address and use this link within 7 days:\n${message.link}\n\nIf you did not expect this invitation, ignore this email.`
                : `Reset your password using this link (valid for 30 minutes):\n${message.link}\n\nIf you did not request this, ignore this email.`,
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        });
        return response.ok
          ? { delivered: true }
          : { delivered: false, reason: "failed" };
      } catch {
        return { delivered: false, reason: "failed" };
      }
    },
  };
}

// A trusted transactional-email gateway must accept this private JSON contract.
export function accountEmailDelivery(): AccountEmailDelivery {
  if (process.env.ACCOUNT_EMAIL_PROVIDER === "local") return localDelivery();
  if (process.env.ACCOUNT_EMAIL_PROVIDER === "resend") return resendDelivery();
  if (
    process.env.ACCOUNT_EMAIL_PROVIDER &&
    process.env.ACCOUNT_EMAIL_PROVIDER !== "gateway"
  )
    return unconfiguredAccountEmailDelivery;
  const endpoint = process.env.ACCOUNT_EMAIL_GATEWAY_URL;
  const bearer = process.env.ACCOUNT_EMAIL_GATEWAY_TOKEN;
  if (!endpoint || !bearer) return unconfiguredAccountEmailDelivery;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return unconfiguredAccountEmailDelivery;
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    return unconfiguredAccountEmailDelivery;
  return {
    configured: true,
    async send(message) {
      if (!secureLink(message.link))
        return { delivered: false, reason: "failed" };
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${bearer}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(message),
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        });
        return response.ok
          ? { delivered: true }
          : { delivered: false, reason: "failed" };
      } catch {
        return { delivered: false, reason: "failed" };
      }
    },
  };
}
