# Security and monitoring

Owner: **A**. Priority: MVP. Status: **existing foundation + proposed extension contracts**.

Validation, rate limits and database health exist; monitoring integrations pending.

- UI route: `/app/[businessId]/security`.
- Proposed operation: `getHealth` in `contracts.ts`; request and response Zod schemas are transport-safe.
- Server interface: `server/service.ts`; no fake implementation is supplied.
- Dependencies: authentication,permissions,audit.
- Acceptance: Health errors are redacted, distributed limits fail closed and private secrets never reach clients.
- Data access: use `src/server/repositories/` through an authorized service; client hooks go in the module's `hooks/` directory only when a real client flow exists. Do not create empty caches or placeholder mutations.
- Existing workflows remain in `src/server/services.ts`, `queries.ts`, and `lib/auth.ts`; this contract does not claim they already implement the proposed interface or versioned API envelope.
- Review gate: schema, auth, membership or booking interface changes require both developers. These extension interfaces are **proposed**, not approved for downstream runtime dependencies.
