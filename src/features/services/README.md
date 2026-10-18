# Services and categories

Owner: **B**. Priority: MVP. Status: **existing foundation + proposed extension contracts**.

Service listing and creation exist; categories and edit/archive workflows pending.

- UI route: `/app/[businessId]/services`.
- Proposed operation: `createService` in `contracts.ts`; request and response Zod schemas are transport-safe.
- Server interface: `server/service.ts`; no fake implementation is supplied.
- Dependencies: businesses,permissions.
- Acceptance: Managers maintain tenant services; duration and money validate; categories remain explicit stubs.
- Data access: use `src/server/repositories/` through an authorized service; client hooks go in the module's `hooks/` directory only when a real client flow exists. Do not create empty caches or placeholder mutations.
- Existing workflows remain in `src/server/services.ts`, `queries.ts`, and `lib/auth.ts`; this contract does not claim they already implement the proposed interface or versioned API envelope.
- Review gate: schema, auth, membership or booking interface changes require both developers. These extension interfaces are **proposed**, not approved for downstream runtime dependencies.
