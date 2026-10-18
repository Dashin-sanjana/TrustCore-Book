# Working hours and availability

Owner: **B**. Priority: MVP. Status: **Not implemented — scaffold only**.

AvailabilityRule and ScheduleException models exist; editing is not implemented.

- UI route: `/app/[businessId]/availability`.
- Proposed operation: `saveRule` in `contracts.ts`; request and response Zod schemas are transport-safe.
- Server interface: `server/service.ts`; no fake implementation is supplied.
- Dependencies: staff,localization.
- Acceptance: Rules validate local weekday/minutes; exception intervals are positive UTC instants.
- Data access: use `src/server/repositories/` through an authorized service; client hooks go in the module's `hooks/` directory only when a real client flow exists. Do not create empty caches or placeholder mutations.
- Existing workflows remain in `src/server/services.ts`, `queries.ts`, and `lib/auth.ts`; this contract does not claim they already implement the proposed interface or versioned API envelope.
- Review gate: schema, auth, membership or booking interface changes require both developers. These extension interfaces are **proposed**, not approved for downstream runtime dependencies.
