# Phase 0 shared architecture review

**Project:** TrustCore Book · TrustCore Labs

**Review date:** 18 October 2026 (Asia/Colombo)

**Status:** Review complete; proposed changes below require Developer A and Developer B approval. No shared contract changes are approved by this report.

## Review decision

The existing single-app foundation is viable and passes its local static/build checks. **Do not treat the proposed interfaces as approved for booking, session-management or membership implementation yet.** Resolve the affected approval decisions first; independent UI work can continue against existing stable primitives.

No cross-tenant access bypass was demonstrated through the current protected service entrypoints. Several findings are **future integration risks in unimplemented interfaces**, not claims of an exploitable existing booking API. The current application deliberately exposes no booking creation operation.

Scope inspected: FEATURES.md, TEAM_WORKFLOW.md, DATABASE.md, API_CONTRACTS.md, ROLES_PERMISSIONS.md, SECURITY.md; all 22 feature contracts and server interfaces; Prisma schema and initial SQL migration; authorization, authentication, repositories, service/action adapters, rate limits, tests, import-boundary script and CI/Playwright configurations.

## Existing safeguards confirmed

- Protected workflows resolve the current session and database membership server-side. Manager writes explicitly call `requireTenant(businessId, true)`. Platform administration has its own guard and does not imply tenant-write permission.
- Staff, services and customers have compound tenant keys. Appointment and StaffService foreign keys include businessId. Availability and exceptions inherit valid tenant ownership through their compound Staff relation; their lack of a second direct Business relation is **not** an isolation defect.
- Neon metadata was inspected inside an explicit `BEGIN READ ONLY` transaction, then rolled back. The initial migration is finished, btree_gist is installed, and the inspected appointment/assignment foreign keys, interval/price CHECKs and staff-overlap exclusion constraint are present and validated. No customer data was read.
- UTC timestamptz instants, IANA business timezones, decimal pricing snapshots, bcrypt hashes, encrypted Auth.js JWT cookies and absolute eight-hour database revocation records are established.
- Unfinished workflows are identified explicitly and have no fake successful implementation. OAuth adapters and provider integrations are correctly described as unimplemented.

## Findings

**Priority:** P1 means resolve before the affected Phase 1 workflow or public release; P2 means a coordinated design/assurance improvement. A P1 future-contract finding does not imply that the unimplemented endpoint is currently exploitable.

### AR-01 · P1 · Public booking cannot compose with the proposed engine contract

**Evidence:** `src/features/public-booking/contracts.ts:11`, `src/features/public-booking/server/service.ts:7`, `src/features/booking-engine/contracts.ts:7`, `src/features/booking-engine/server/service.ts:7`, `docs/API_CONTRACTS.md`.

The public menu returns names/durations/prices but no stable selectable service reference. Availability needs serviceId and the engine interface requires TenantContext, which is obtained from authenticated tenant membership. An anonymous visitor cannot legitimately supply that context. Creation also requires an existing customerId, while the only current customer-creation flow is manager-authorized.

**Impact:** Developer B cannot wire a real anonymous booking flow without inventing identifiers, manufacturing a membership context or exposing an inappropriate customer operation. Service names and array positions are unsuitable identifiers.

**Approval required:** define public service/slot references, a server-resolved public business scope distinct from a membership scope, and a public customer-resolution/consent boundary. Keep internal staff IDs private or explicitly approve a safe public reference. Decide whether staff selection is supported. Preserve the existing read-only menu until this is agreed. **Owners: B drafts public DTOs; A reviews identity/scope; both approve engine boundary.**

### AR-02 · P1 · Creation, lifecycle and rescheduling responsibilities are incomplete

**Evidence:** `src/features/booking-engine/contracts.ts:7`, `src/features/booking-engine/server/service.ts:6`, `src/features/appointments/contracts.ts:18`, `docs/adr/0004-booking-engine-contract.md`.

A booking creation request schema exists, but the engine interface only defines getAvailability: there is no createBooking method or creation response. Appointment changeStatus accepts any listed target without an expected current state/version; no cancellation/rescheduling command contract exists. The ADR describes terminal states and transitions, but they are not an implemented or fully specified command policy.

**Impact:** Independent appointment and engine implementations could each own booking writes or overwrite transitions, violating invariants while satisfying their local types.

**Approval required:** nominate one booking-write service for creation/rescheduling, define results/conflicts and optimistic-concurrency expectations, and specify cancellation/terminal-state policy. The appointment UI calls that service rather than writing schedule rows independently. **A leads write/persistence contracts; B leads availability/UI requirements; both approve.**

### AR-03 · P1 · Idempotency, temporary holds and cancellation policy have no persistence boundary

**Evidence:** `prisma/schema.prisma:122`, `src/features/booking-engine/contracts.ts:12`, `src/features/appointments/contracts.ts:14`, `docs/adr/0004-booking-engine-contract.md`.

The request requires a UUID idempotency key, but no business-scoped idempotency record/unique constraint, canonical payload definition or stored result exists. PENDING blocks staff ranges under the current non-CANCELLED exclusion constraint, but there is no hold expiry. Cancellation policy has a schema but no business-owned persistence/default/version or approved cutoff semantics.

**Impact:** A key in a request alone does not make retries idempotent; unfinished holds could block capacity indefinitely. Different clients could interpret cancellation notice differently.

**Approval required:** review a forward schema proposal for `(businessId,key,payloadHash,result/state)` and atomic ownership/replay semantics; decide expiry/recovery and same-key/different-payload conflict handling. Either forbid PENDING holds initially or approve a hold-expiry design. Set cancellation rules and scope before enabling cancellation. **A is migration coordinator; both approve. No migration is supplied or run by this review.**

### AR-04 · P1 · Schedule/timezone semantics and availability bounds are not ready for an engine

**Evidence:** `src/features/booking-engine/contracts.ts:14`, `src/features/booking-engine/contracts.ts:25`, `src/features/availability/contracts.ts:8`, `prisma/schema.prisma:101`, `src/server/services.ts:94`, `src/server/repositories/workspace.ts:100`.

The availability request checks only ordered UTC bounds; it permits a ten-year query. The response accepts a slot whose end precedes its start. Both were confirmed with read-only schema probes. Recurring-rule save semantics (create/update/replace), exceptions including unavailable=false, override precedence, overlapping rules, overnight hours, effective dates and slot granularity remain unspecified. The business settings flow permits arbitrary valid timezone changes without checking existing rules or appointments. DST behavior is still a proposed ADR.

**Impact:** A public engine could perform unbounded computation; two implementations could disagree on valid slots. Changing timezone can reinterpret recurring local hours and appointment display without a coordinated schedule policy.

**Approval required:** choose a bounded horizon, UTC millisecond normalization, positive-slot validation, stable slot ordering, local-hour/exception precedence and DST gap/fold policy. Lock timezone once scheduling data exists or define an explicit reviewed conversion/versioning workflow. Country defaults need not restrict legitimate Australian timezone choices. **B drafts schedule rules; A reviews storage and settings guard; both approve timezone/DST semantics.**

### AR-05 · P1 · Tenant membership proof does not prove write permission

**Evidence:** `src/server/authorization.ts:8`, `src/server/authorization.ts:28`, `src/server/repositories/workspace.ts:64`, `src/server/repositories/workspace.ts:100`, `src/server/repositories/platform.ts:4`, `scripts/check-boundaries.mjs:20`.

The same branded TenantContext is produced for a MEMBER read and a manager write. insertRecord/updateProfile accept that context without a permission requirement. The platform repository relies on a caller comment and has no guarded platform context. The current service callers do perform the right checks; this is a reuse hazard for new parallel modules. Branding is a compile-time convention, not authorization of arbitrary runtime objects.

**Approval required:** decide between permission-bearing scopes and explicit write-policy assertions at the service/repository boundary. Expose guarded service entrypoints, keep repositories internal to them, and add service-level negative tests. The current boundary script does not prohibit all server-component repository imports or relative-path bypasses, so do not describe it as complete authorization enforcement. **A owns policy/context design; B reviews realistic module integration cases.**

### AR-06 · P1 · Account session management needs an owner-scoped revocation operation

**Evidence:** `src/server/repositories/identity.ts:32`, `src/features/users-sessions/contracts.ts:4`, `src/lib/auth.ts:56`, `src/lib/validation.ts:3`.

revokeSession currently filters by session ID alone. Its present caller uses the trusted JWT sid during sign-out, so no current cross-account revocation endpoint is demonstrated. The proposed account-management operation accepts a sessionId from the caller, however; reusing this repository method without `(id,userId)` would violate the documented own-account rule. UserServiceContext and PlatformAdminContext are plain shapes and still need a defined trusted construction boundary.

Additional consistency gaps: registration enforces the bcrypt 72-byte limit while login only limits string length; the active session response retains Auth.js's expiry rather than explicitly reporting the database record's absolute expiresAt; expired sessions are represented as redacted session objects rather than a documented authenticated/unauthenticated DTO. Database enforcement still prevents expired protected access.

**Approval required:** define own-session list/revoke/revoke-all contracts and owner-filtered repository operations; align password-byte validation and authoritative session expiry/invalid-session semantics. Decide account recovery/verification requirements before public rollout. No OAuth PrismaAdapter should be added without its required reviewed models. **A owns; B reviews client session behavior.**

### AR-07 · P1 · Membership administration has no last-owner or target-role guardrails

**Evidence:** `src/features/permissions/contracts.ts:8`, `src/shared/policies/permissions.ts:9`, `prisma/schema.prisma:46`, `prisma/schema.prisma:20`, `docs/ROLES_PERMISSIONS.md`.

The future request can identify any member and assign ADMIN/MEMBER. A role enum excluding OWNER does not stop an admin from targeting an existing owner for demotion. There is no last-owner invariant, invitation contract/model or transfer command. Cascading User deletion removes memberships; a future delete flow must not orphan a business's ownership. These mutations are not currently implemented.

**Approval required:** define actor/target role rules, cross-tenant member lookup, self-demotion, last-owner concurrency, ownership transfer and account deletion semantics. Protect the invariant transactionally; do not assume a simple unique OWNER constraint expresses “at least one owner.” **A leads; both approve membership and schema changes.**

### AR-08 · P1 · Global authentication throttling can prevent legitimate sign-out

**Evidence:** `src/app/api/auth/[...nextauth]/route.ts:8`, `src/server/rate-limit.ts:5`, `src/app/api/health/route.ts:5`, `src/server/services.ts:27`.

Every Auth.js POST, including sign-out and invalid requests, consumes the same 200/minute global bucket before Auth.js validation. Anyone exhausting it can deny sign-in/sign-out to unrelated users. Registration and public-menu quotas are also shared globally. This is an availability risk in implemented behavior, not an account-takeover finding. Auth storage failures are reported as 429; health quota failures are reported as 503 even if the database is healthy.

**Approval required:** define endpoint-specific/account/client/edge limits using trusted identity sources, maintain CSRF protection, and preserve a safe logout path. Separate quota exhaustion from unavailable storage with typed errors/retry guidance. Document cleanup and monitoring ownership rather than silently failing open. **A owns security/rate/error boundaries; B reviews public portal behavior.**

### AR-09 · P2 · Currency limits and creation invariants need one approved definition

**Evidence:** `src/shared/contracts/result.ts:28`, `src/lib/validation.ts:47`, `prisma/schema.prisma:73`, `prisma/schema.prisma:132`, initial migration business_market_valid CHECK.

Shared money accepts ten integer digits, Prisma Decimal(12,2) supports ten, and service creation accepts eight. A read-only probe confirmed the mismatch. Business country/currency combinations are checked in SQL, but Appointment.currency is free text and is not tied to the business currency. A booking creation contract correctly omits client-authoritative price/currency, but no creation service yet enforces the server-derived snapshot.

**Approval required:** choose one amount range and canonical decimal representation, derive currency/price at creation and define historical currency immutability. Do not add a foreign key that unintentionally rewrites historical snapshot semantics when business settings later change. Keep business-country changes explicitly controlled. **A defines shared monetary policy; B owns catalog validation/format adapters.**

### AR-10 · P2 · Planned relationships and integrity policies must precede dependent modules

**Evidence:** `prisma/schema.prisma:56`, `prisma/schema.prisma:68`, `prisma/schema.prisma:80`, `prisma/schema.prisma:122`, `prisma/schema.prisma:152`, `src/features/services/contracts.ts:5`.

Category, invitation, idempotency, outbox, subscription, invoice and provider-event relationships are absent as documented scaffolds. Staff profiles have no User/BusinessMember link; decide whether staff sign-in is needed rather than assuming profiles are accounts. Appointments reference same-tenant staff/service independently, not StaffService, so eligible assignment and active-state checks remain a booking-service obligation. Historical appointments and AuditLog use restrictive deletes; catalog/staff have active flags, while Customer has no archive/retention state. AuditLog is append-only by application convention, not a database write-permission policy.

**Approval required:** create focused model proposals only as each dependency enters scope. Define category ownership/cardinality, assignment/unassignment history, customer retention/deletion, audit retention/actor history and query-driven indexes. A StaffService foreign key on all historical appointments is not automatically the right solution; it could prevent removing future assignments. **A owns migration coordination; B owns catalog/staff/customer requirements.**

### AR-11 · P2 · Draft DTOs are not yet adapters for the current runtime

**Evidence:** `src/server/services.ts:19`, `src/server/services.ts:61`, `src/server/repositories/workspace.ts:33`, `src/features/services/contracts.ts:8`, `src/shared/contracts/result.ts:32`, `src/shared/api/response.ts:15`.

Current mutations return legacy success/error strings (or businessId), while proposed interfaces return ServiceResult with record IDs. insertRecord does not return its created ID. Proposed cursor contracts are not implemented; customer/appointment views load at most 100 records and use browser pagination, while service/staff lists and public menus are not similarly bounded. Public-menu and security DTOs differ from the actual repository/health transport shapes. Success requestId is added by the HTTP adapter but has no corresponding success HTTP-envelope schema in shared contracts.

**Approval required:** choose the compatibility/adapter path, distinguish service results from HTTP envelopes and validate actual DTOs at new transport boundaries. Define deterministic tenant cursor ordering and bounded reads before treating list interfaces as implemented. Preserve Auth.js's own protocol. **A owns shared result/versioning adapters; B owns feature DTO/pagination adapters.**

### AR-12 · P2 · Ownership and dependency descriptions need executable work boundaries

**Evidence:** `docs/FEATURES.md`, `docs/TEAM_WORKFLOW.md`, `src/server/services.ts`, `src/server/repositories/workspace.ts`, `src/features/*/server/service.ts`.

The documented dependency inventory has bootstrap cycles: authentication↔sessions/security and business↔localization, plus billing↔payments. These are planning cycles, not demonstrated JavaScript import cycles. Several A/B-owned workflows still share the central services.ts/workspace.ts files, while the feature server files are interfaces only. “Shared booking engine” does not assign its algorithm, transaction, public adapter and lifecycle integration to individual implementers.

**Approval required:** use the ownership and dependency order below. A temporarily coordinates central workflow/repository edits; B submits a separate reviewed extraction proposal rather than editing the same file concurrently. Split algorithm, persistence and adapters after their contracts are approved. **Both developers approve the division.**

### AR-13 · P2 · Prepared E2E smoke has a confirmed cold-start flake

**Evidence:** `playwright.config.ts:4`, `playwright.config.ts:15`, `tests/e2e/foundation.spec.ts:4`; ignored Playwright error context from this review.

The prepared run used four workers against the development server. Both unauthenticated redirects and mobile navigation passed; desktop landing navigation failed its 5-second heading assertion once, then passed on retry. The captured failure snapshot showed the root “Loading workspace” fallback rather than the landing heading. This is consistent with cold development-server rendering/compilation contention, but the root cause was not conclusively established.

**Impact:** A zero process exit status with retries is not a clean four-case pass. The main CI job only lists these tests; the E2E execution workflow is manual. Neither the smoke cases nor existing mocked authorization tests cover authenticated tenant HTTP access, role changes, session revocation via HTTP, idempotency or DST.

**Review action:** B owns a separate test-readiness investigation; A reviews environment/server setup. Define a reliable readiness and cold/warm execution strategy, keep retries visible as flakiness, and add isolated authenticated negative tests after the shared contracts are approved. Do not merely increase timeouts to conceal a permanent failure. No test/config changes were made here.

## Contract approval register

All decisions are **pending**, with no code amendments made here.

| Decision | Proposed scope                                                                                | Lead / required reviewer | Blocks                                               |
| -------- | --------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------- |
| C1       | Public business scope, service/slot references, anonymous customer resolution                 | B / A                    | Public availability/booking (AR-01)                  |
| C2       | Engine creation/reschedule method/results, status transitions and cancellation commands       | A + B                    | Appointment mutations (AR-02)                        |
| C3       | Idempotency/hold/cancellation persistence and transactional ownership                         | A / B                    | Safe retryable booking (AR-03)                       |
| C4       | Bounded availability, positive slots, rule/exception/DST/timezone-edit policy                 | B / A                    | Availability engine and schedule editing (AR-04)     |
| C5       | Permission-bearing write scopes and guarded platform boundary                                 | A / B                    | New protected module writes (AR-05)                  |
| C6       | Own-session revocation, expiry/invalid-session DTO and password limits                        | A / B                    | Session-management UI/API (AR-06)                    |
| C7       | Member/target-role, last-owner and account deletion invariants                                | A / B                    | Invitations, role changes and transfer (AR-07)       |
| C8       | Endpoint-specific throttling, safe logout and typed operational errors                        | A / B                    | Public authentication/booking rollout (AR-08)        |
| C9       | Amount/currency policy; focused category/assignment/history schemas; legacy/HTTP DTO adapters | A + B                    | Catalog integration and later schema work (AR-09–11) |
| C10      | File ownership/extraction plan and dependency sequence                                        | A + B                    | Collision-free parallel development (AR-12)          |
| C11      | Smoke-test readiness and required CI/E2E review policy                                        | B / A                    | Reliable release verification (AR-13)                |

## Phase 1 ownership and first tasks

This section plans work; it does not authorize or implement business features.

| Boundary                        | Developer A                                                                                                | Developer B                                                                        | Merge/review rule                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Identity, sessions and RBAC     | Implement approved auth/session/membership policies and repositories; recovery/verification decisions      | Review client/session behavior and adversarial tenant cases                        | Both review shared contracts; A coordinates                                       |
| Prisma/migrations               | Sole migration coordinator; drafts idempotency/owner/outbox constraints when approved                      | Supplies category/assignment/schedule requirements and reviews SQL                 | One forward schema PR at a time; no production migration from feature branches    |
| Catalog, staff and customers    | Review tenant/persistence invariants                                                                       | Own approved categories, service/staff assignment, customer and archive workflows  | B owns feature files; shared schema reviewed by both                              |
| Availability                    | Own persistence invariants and integration with booking transaction                                        | Own deterministic slot calculation, recurring/exception editors and DST test cases | Both approve input/output, DST and timezone policy first                          |
| Booking writes                  | Own single transactional create/reschedule/idempotency implementation                                      | Own availability algorithm and appointment/public UI adapters                      | No parallel competing booking writers; both review engine contract and race tests |
| Public portal                   | Review public scope, customer identity and abuse boundaries                                                | Own public DTO adapters and selection/confirmation UX                              | No manufactured TenantContext or fake confirmation                                |
| Notifications                   | Own approved outbox schema/security and operational boundary                                               | Own reminder scheduling/delivery adapter and UI                                    | No provider calls inside a booking transaction                                    |
| Shared transport/operations     | Own errors, rate limits, environments, CI and platform/audit infrastructure                                | Own feature DTO mapping, component/E2E coverage and reporting UI                   | Shared envelopes/policies require both reviews                                    |
| Central files during transition | Coordinate `src/server/services.ts`, `queries.ts`, repositories/workspace.ts and identity/membership files | Work in B-owned feature directories; propose extraction separately                 | Do not concurrently rewrite central files without agreed ownership                |

**First A task:** prepare C5–C8 decisions and the smallest owner/session repository contract PR; record actual reviewer approval and configure real CODEOWNERS/branch rules. No default admin/bootstrap route.

**First B task:** investigate AR-13 test readiness, co-review C1/C2/C4 and prepare category/assignment/schedule DTO and UI proposals; build independent component tests against stable primitives while the shared gates are pending. Do not implement an engine against unresolved identifiers or scope semantics.

## Dependency order

1. **Joint review first:** C1–C11 decisions and affected ADRs; approval is needed before dependent runtime implementations, not after.
2. **Independent primitives:** A owns result/error, trusted-context, monetary and security primitives; B co-defines timezone/schedule primitives. These do not depend on a business feature implementation.
3. **Identity then authorization/bootstrap:** user/session repository → authenticated identity → membership/policies → owned business creation/navigation. This removes the planning-level auth/session/security cycle.
4. **Parallel catalog/account lanes:** B implements approved categories/services/customers/staff assignments; A implements approved own-session and membership workflows. Both use the merged tenant contract.
5. **Schedules then read-only slots:** staff/service eligibility + recurring hours + exceptions + approved timezone/DST semantics → bounded availability engine. Timezone primitives precede business configuration rather than depending on it.
6. **Booking transaction then lifecycle:** approved idempotency/cancellation schema → one booking writer and concurrency/replay tests → appointment lifecycle adapters.
7. **Public portal and reminders:** safe public scope/customer resolution + engine → real public flow; committed booking event/outbox → reminders. No direct provider coupling in booking writes.
8. **Operational/release gates:** tenant E2E, audit/cleanup/retention, edge throttling and deployment verification. Analytics consumes committed appointment data. Billing/payments stay later: provider-neutral invoice/payment primitives precede billing orchestration and verified webhooks, avoiding a mutual feature dependency.

## Risks and blockers

- Booking/public portal work is blocked by C1–C4; membership/session administration by C5–C7. Current rate-limit behavior must be addressed before a broad public rollout.
- Expected missing implementations include categories, assignment workflows, exception CRUD, idempotency/holds, member invitations/transfer, recovery/verification, public customer resolution, reminder outbox/provider delivery, billing/payments, audit viewer and cleanup/monitoring. A folder/interface is not an implemented dependency.
- The test suite does not provide authenticated tenant HTTP/E2E, lifecycle/idempotency/DST or service-to-repository negative coverage. The four prepared smoke cases test only public navigation and an unauthenticated redirect.
- Boundary checks are a useful lint guard, not a transitive import/security proof. CODEOWNERS remains an example and required reviews/branch protection are not proven active. Existing feature service interfaces remain proposed.
- No blocker justifies implementing a stub, running a production migration or bypassing review automatically.

## Verification results

| Check                      | Result / scope                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing dependencies      | Present; no package or lockfile change required                                                                                                                                 |
| `pnpm verify`              | Passed boundary checks, Prisma validation, lint, TypeScript, unit/component tests and production build                                                                          |
| Unit/component tests       | **18 passed**                                                                                                                                                                   |
| Database integration tests | **4 skipped**: no isolated TEST_DATABASE_URL supplied; no fixture inserts/deletes performed in this review                                                                      |
| `pnpm format:check`        | Passed before report creation; report formatting checked separately                                                                                                             |
| Read-only contract probes  | Confirmed ten-year availability and inverted output slot accepted; confirmed shared/service money precision mismatch                                                            |
| Neon metadata              | Read-only inspection passed: finished initial migration; relevant FKs/CHECKs/exclusion constraint validated; btree_gist present                                                 |
| Playwright smoke tests     | **3 passed, 1 flaky**: desktop navigation failed once (landing heading absent/loading fallback) and passed on retry; process exit 0. Both Chromium desktop/mobile projects ran. |
| GitHub-hosted CI           | Not executed locally; a push may trigger the configured workflow, which is separate from local results                                                                          |
| Source integrity           | Baseline checksums unchanged for all inspected source/schema/contracts/tests/config files; only this review report is intentionally added during the review                     |

No production migrations, resets, wipes, production seeds, booking operations or provider calls were performed. No .env values or database credentials are included in this report.

### Verification environment and limitations

Playwright's expected browser runtime was absent initially. A temporary headless Chromium runtime was downloaded outside the repository; one network download attempt timed out and a later attempt succeeded. The test run supplied a generated ephemeral authentication secret, a local origin on port 3100, CI-style retries, and database URLs overridden to unused loopback endpoints. It did not use the Neon credentials or create accounts/bookings. The Playwright-owned preview server stopped after the run.

The report's four contract probes only parsed in-memory values; they did not write files or access databases. An initial tsx CLI attempt encountered sandbox IPC restrictions; rerunning through Node's tsx import loader succeeded without source changes. Database integration tests were deliberately not enabled because this review was restricted to non-destructive verification. Their previous results are historical, not a fresh result claimed here.

The local .env remains ignored and private. A pre-commit content scan of the intended tracked/untracked source files found no exact matches for the configured database URLs or authentication secret. Generated browser/test/build artifacts are ignored. No shared schema, contract, runtime source, test or configuration was changed to resolve findings automatically.
