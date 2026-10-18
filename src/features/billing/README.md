# Subscription plans and billing

Owner: **A**. Priority: Later. Status: **Not implemented — scaffold only**.

Entitlement and subscription contracts only; no checkout or billing changes.

- UI route: `/app/[businessId]/billing`.
- Proposed operation: `getSubscription` in `contracts.ts`; request and response Zod schemas are transport-safe.
- Server interface: `server/service.ts`; no fake implementation is supplied.
- Dependencies: businesses,payments.
- Acceptance: Verified webhook events drive state; replay-safe entitlements enforce plan rules server-side.
- Data access: use `src/server/repositories/` through an authorized service; client hooks go in the module's `hooks/` directory only when a real client flow exists. Do not create empty caches or placeholder mutations.
- Existing workflows remain in `src/server/services.ts`, `queries.ts`, and `lib/auth.ts`; this contract does not claim they already implement the proposed interface or versioned API envelope.
- Review gate: schema, auth, membership or booking interface changes require both developers. These extension interfaces are **proposed**, not approved for downstream runtime dependencies.
