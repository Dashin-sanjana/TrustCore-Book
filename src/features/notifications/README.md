# Notifications and reminders

Owner: **B**. Priority: MVP. Status: **Not implemented — scaffold only**.

Provider and delivery contracts only. No messages are sent.

- UI route: `/app/[businessId]/notifications`.
- Proposed operation: `queueReminder` in `contracts.ts`; request and response Zod schemas are transport-safe.
- Server interface: `server/service.ts`; no fake implementation is supplied.
- Dependencies: appointments,localization.
- Acceptance: Provider configured explicitly; retries deduplicate; secrets and customer details are redacted.
- Data access: use `src/server/repositories/` through an authorized service; client hooks go in the module's `hooks/` directory only when a real client flow exists. Do not create empty caches or placeholder mutations.
- Existing workflows remain in `src/server/services.ts`, `queries.ts`, and `lib/auth.ts`; this contract does not claim they already implement the proposed interface or versioned API envelope.
- Review gate: schema, auth, membership or booking interface changes require both developers. These extension interfaces are **proposed**, not approved for downstream runtime dependencies.
