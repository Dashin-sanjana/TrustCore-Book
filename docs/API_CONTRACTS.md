# API and feature contracts

## Transport conventions

Existing RSC/server-action workflows remain available. Do not invent REST endpoints just to mirror every function. Future external/mobile integrations use `/api/v1/<resource>`; a breaking public contract requires `/api/v2`, while additive compatible fields may stay v1. Auth.js keeps its reserved `/api/auth/*` routes; `/api/health` remains a compatibility readiness endpoint.

The new `/api/v1/health` wraps the actual database check with a consistent result. It is implemented, rate-limited and redacted, not a synthetic success endpoint.

```json
{
  "ok": true,
  "data": { "status": "ok", "database": "reachable" },
  "requestId": "server-generated-id"
}
```

```json
{
  "ok": false,
  "error": {
    "code": "NOT_IMPLEMENTED",
    "message": "Not implemented",
    "requestId": "server-generated-id"
  }
}
```

| Error code                   | HTTP      | Rule                                                                         |
| ---------------------------- | --------- | ---------------------------------------------------------------------------- |
| UNAUTHENTICATED              | 401       | No valid session on a future JSON API; existing pages redirect to login.     |
| FORBIDDEN / NOT_FOUND        | 403 / 404 | Deny unauthorized scope; tenant pages use 404 to conceal resource existence. |
| VALIDATION_ERROR             | 422       | Zod rejects input; never echo passwords or raw payloads.                     |
| CONFLICT                     | 409       | Slot conflict, version conflict or mismatched idempotency payload.           |
| RATE_LIMITED                 | 429       | No automatic unbounded retries.                                              |
| NOT_IMPLEMENTED              | 501       | Planned operation unavailable; never return fake success.                    |
| UNAVAILABLE / INTERNAL_ERROR | 503 / 500 | Safe client message; internal logs retain only redacted diagnostics.         |

All versioned responses use no-store and a server-generated request ID. `src/shared/api/response.ts` maps errors; error strings must be deliberately safe and must never be raw database exception messages. The existing server actions retain their legacy `{success?,error?}` result until a reviewed migration; the auth route retains the Auth.js protocol.

## Authorization and ownership

Tenant services take a business reference only to resolve `requireTenant` again. Never deserialize a trusted TenantContext, role, owner ID or platform privilege from JSON. Protected repositories accept the branded server-derived tenant context. Identity account operations derive actorId from requireUser; platform operations requirePlatformAdmin; public routes use a separate PublicServiceContext and explicit public projections.

Every request and response is validated at its transport boundary when implemented. Prisma DateTime/Decimal values must become UTC ISO strings and decimal strings/currency DTOs. Cursor reads are tenant-scoped and bounded to 100 rows. Full DTOs never contain hashes, session record IDs for other accounts or credentials.

## Proposed module operation inventory

These schemas/interfaces are **not endpoint implementations** and are not approved downstream contracts until both developers review shared boundaries. No booking mutation endpoint has been exposed.

| Module                         | Contract file                                   | Server boundary                                      |
| ------------------------------ | ----------------------------------------------- | ---------------------------------------------------- |
| Authentication                 | `src/features/authentication/contracts.ts`      | `src/features/authentication/server/service.ts`      |
| User and session management    | `src/features/users-sessions/contracts.ts`      | `src/features/users-sessions/server/service.ts`      |
| Business onboarding            | `src/features/business-onboarding/contracts.ts` | `src/features/business-onboarding/server/service.ts` |
| Business management            | `src/features/businesses/contracts.ts`          | `src/features/businesses/server/service.ts`          |
| Role-based permissions         | `src/features/permissions/contracts.ts`         | `src/features/permissions/server/service.ts`         |
| Services and categories        | `src/features/services/contracts.ts`            | `src/features/services/server/service.ts`            |
| Staff management               | `src/features/staff/contracts.ts`               | `src/features/staff/server/service.ts`               |
| Working hours and availability | `src/features/availability/contracts.ts`        | `src/features/availability/server/service.ts`        |
| Customer management            | `src/features/customers/contracts.ts`           | `src/features/customers/server/service.ts`           |
| Appointment management         | `src/features/appointments/contracts.ts`        | `src/features/appointments/server/service.ts`        |
| Booking availability engine    | `src/features/booking-engine/contracts.ts`      | `src/features/booking-engine/server/service.ts`      |
| Public booking portal          | `src/features/public-booking/contracts.ts`      | `src/features/public-booking/server/service.ts`      |
| Notifications and reminders    | `src/features/notifications/contracts.ts`       | `src/features/notifications/server/service.ts`       |
| Business dashboard             | `src/features/dashboard/contracts.ts`           | `src/features/dashboard/server/service.ts`           |
| Analytics and reports          | `src/features/analytics/contracts.ts`           | `src/features/analytics/server/service.ts`           |
| Subscription plans and billing | `src/features/billing/contracts.ts`             | `src/features/billing/server/service.ts`             |
| Payment integrations           | `src/features/payments/contracts.ts`            | `src/features/payments/server/service.ts`            |
| Platform super admin           | `src/features/platform-admin/contracts.ts`      | `src/features/platform-admin/server/service.ts`      |
| Business settings              | `src/features/business-settings/contracts.ts`   | `src/features/business-settings/server/service.ts`   |
| Localization and timezones     | `src/features/localization/contracts.ts`        | `src/features/localization/server/service.ts`        |
| Audit logs                     | `src/features/audit/contracts.ts`               | `src/features/audit/server/service.ts`               |
| Security and monitoring        | `src/features/security/contracts.ts`            | `src/features/security/server/service.ts`            |

## Booking contract preparation

The availability request carries service/staff references and ordered UTC range bounds; the server derives timezone, business and eligibility. It must bound the request interval and resolve DST before computation. The proposed creation request includes a UUID idempotency key, service/staff/customer references and a UTC start. Client-supplied price, duration or currency is never authoritative.

The future service must persist `(businessId,idempotencyKey,payloadHash,result)` transactionally with the booking. A replay with the same payload returns the original result; a changed payload returns 409. The schema/model for this record is pending joint review; no in-memory deduplication or pretend success is implemented.

Notification dispatch, payment intent creation and role changes are interface-only. Provider errors require explicit retry/terminal classification. Do not register public mutation routes until their service is authorized, validated and implemented.
