# Phase A1.2 authentication architecture decision contract

> Runtime policy update (2026-10-20): New password registrations no longer
> require email delivery or verification before sign-in and onboarding.
> `emailVerificationRequired` is `false` and `emailVerifiedAt` remains `null`;
> the address must not be treated as verified. Previously created accounts with
> `emailVerificationRequired=true` still need verification. Invitation
> acceptance and ownership transfer continue to require a verified address.
> Older proposed verified-only statements below are historical, not the
> current registration policy. Recovery and invitations still need a configured
> email provider; this update does not authorize disabling those safeguards.

**Status:** Proposal for Developer A and Developer B review. This document records decisions for approval; it does not approve or change shared contracts, runtime behavior, or schema. The 16 entries below each carry one status: `EXISTING`, `PROPOSED`, `REQUIRES JOINT APPROVAL`, or `OPEN QUESTION`. A proposal is not an implemented safeguard.

**Scope:** Next.js App Router, Auth.js v4 Credentials, Prisma, and Neon PostgreSQL in the existing single application. Auth.js retains `/api/auth/*`; application account operations may use server actions or later reviewed `/api/v1` routes. Existing API contracts remain intact. See `docs/API_CONTRACTS.md:3-5,38-48` and `docs/SHARED_ARCHITECTURE_REVIEW.md:7-13`.

## Decision register

### 1. Current implementation boundary - EXISTING

Credentials registration, sign-in and sign-out exist. Registration writes a bcrypt cost-12 password hash; Auth.js creates a JWT-linked database revocation record. Onboarding transactionally creates a business, OWNER membership and audit event. Verification, recovery, account/session management, invitations, role changes and ownership transfer have no runtime implementation. Feature service interfaces are proposals, not substitutes for the current actions or Auth.js transport. Evidence: `src/server/services.ts:20-42,43-61`, `src/server/repositories/workspace.ts:13-31`, `src/lib/auth.ts:17-85`, `src/features/authentication/server/service.ts:5-11`, `src/features/users-sessions/server/service.ts:5-11`, `src/features/permissions/server/service.ts:5-11`.

### 2. Session ownership and authoritative expiry - REQUIRES JOINT APPROVAL

Keep Auth.js v4 JWT cookies as the browser session transport and `RefreshSession` as the server-side revocation/expiry record, not a browser refresh-token service. Preserve an absolute eight-hour limit from sign-in: protected access requires a valid JWT with `sid` and `sub` plus an unrevoked row matching both session ID and user ID with `expiresAt > now`. JWT renewal must not extend the database deadline. For future account/session DTOs, expose the database `expiresAt` as the authoritative expiry; define invalid/revoked/expired as unauthenticated, with no session ID disclosed to another user. The current callback returns a redacted session object and leaves the active `session.expires` supplied by Auth.js, so client semantics need review. Evidence: `src/lib/auth.ts:14-21,45-72`, `src/server/repositories/identity.ts:13-30`, `src/server/authorization.ts:15-20`, `prisma/schema.prisma:142-151` (AR-06).

### 3. Email verification and unverified users - REQUIRES JOINT APPROVAL

Require proof of email ownership before an account may sign in, create a business, or acquire tenant membership. Registration should create a pending identity and send an expiring, single-use verification link; resend requests return a generic response and are throttled. Verification must not assign a platform role or tenant membership by itself. The current code creates a usable User immediately and has no verification state or delivery flow. Define a reviewed transition for accounts already present before this policy is enabled; do not silently mark them verified. Evidence: `src/server/services.ts:20-35`, `src/lib/auth.ts:31-41`, `prisma/schema.prisma:20-30`, `docs/FEATURES.md:7`.

### 4. Registration response and enumeration - REQUIRES JOINT APPROVAL

For syntactically valid submissions, return the same public message and response shape whether the normalized email is new or already registered; do not reveal account existence through duplicate-key errors, resend behavior, or materially different handling. Invalid input may receive field validation errors without echoing secrets. Keep email normalization and uniqueness, and bound expensive bcrypt work under abuse controls. The current new-account success and duplicate-account failure are distinguishable, and hashing precedes the unique insert. Evidence: `src/lib/validation.ts:3-17`, `src/server/services.ts:23-40`, `prisma/schema.prisma:22`, `src/components/auth-form.tsx:26-32`.

### 5. Password recovery - REQUIRES JOINT APPROVAL

Propose a generic recovery-request response, even for unknown emails. Issue a cryptographically random, single-use token with a 30-minute expiry; store only a token digest, bind it to a user and purpose, and consume it atomically with a new bcrypt password hash. Validate the same 12-character and 72-UTF-8-byte password policy as registration. On successful reset, revoke all of that user's active session rows before reporting success; require a new sign-in. Throttle request and redemption paths separately, avoid logging tokens, and reject replay and expired tokens. Recovery and token storage are not implemented. Evidence: `src/lib/validation.ts:7-17`, `src/server/repositories/identity.ts:6-14,32-36`, `prisma/schema.prisma:20-30,142-151`, `docs/FEATURES.md:7`.

### 6. Login, logout and client throttling - REQUIRES JOINT APPROVAL

Replace the global Auth.js POST bucket with operation-specific limits. Proposed starting thresholds: sign-in 10 attempts per normalized account per 15 minutes plus 20 per trusted client per 15 minutes; registration and recovery get distinct client/account buckets and explicit monitoring. Treat quota exhaustion as rate limiting and rate-store failure as unavailability. Preserve Auth.js CSRF checks and a usable logout path: logout must not consume a public global login quota, and its JWT-linked session should still be revoked. Derive client identity only from an authenticated/trusted deployment edge or proxy configuration; do not trust an arbitrary forwarded header from the browser. Until that trust boundary is configured and tested, do not claim per-IP controls exist. Current code uses a global 200/minute Auth.js POST bucket and per-email login bucket. Evidence: `src/app/api/auth/[...nextauth]/route.ts:4-19`, `src/lib/auth.ts:31-34,82-85`, `src/server/services.ts:27-28`, `src/server/rate-limit.ts:5-20`, `src/server/repositories/security.ts:3-8` (AR-08).

### 7. User-owned sessions - REQUIRES JOINT APPROVAL

List only the authenticated user's session metadata, including current-session marker, created time, authoritative expiry and revocation state; never expose JWTs or another user's rows. Revoke-one must filter by both session ID and authenticated user ID. Revoke-all must filter by authenticated user ID, include the current session, and make subsequent protected requests fail; the UI should clear its local Auth.js cookie for the current session. An already revoked or absent own ID may be idempotent, but a foreign ID must not reveal another user's session. Current sign-out calls `revokeSession(id)` with a trusted JWT `sid`; the proposed account operation accepts an arbitrary `sessionId`, so it must not reuse that unscoped repository method. Evidence: `src/server/repositories/identity.ts:16-36`, `src/lib/auth.ts:82-85`, `src/features/users-sessions/contracts.ts:4-9`, `src/features/users-sessions/server/service.ts:5-11` (AR-06).

### 8. Tenant and platform roles - EXISTING

`User` is the global identity; `BusinessMember` assigns one of OWNER, ADMIN or MEMBER per business. OWNER and ADMIN can manage current records/settings; MEMBER can read workspace data but cannot perform manager writes. Platform administration uses a separate explicitly provisioned `User.platformAdmin` flag and does not grant tenant write access without membership. Membership and platform privilege are read from the database during protected requests, not trusted from client input or cached JWT role claims. Member administration and ownership transfer are only proposed. Evidence: `prisma/schema.prisma:8-12,20-30,46-55`, `src/shared/policies/permissions.ts:1-14`, `src/server/authorization.ts:22-41`, `docs/ROLES_PERMISSIONS.md:5-19`.

### 9. Server-side permission and tenant writes - REQUIRES JOINT APPROVAL

Every protected service must authenticate, resolve the requested business against current membership, and assert the operation-specific permission on the server, even when a layout already checked access. For future writes, adopt a guarded permission-bearing write scope (or an equivalently explicit mandatory assertion) so a read-only `TenantContext` cannot authorize repository mutation. Resolve target records with `businessId` and enforce cross-tenant references through scoped queries and compound foreign keys. Sensitive membership/ownership changes must recheck permissions inside their transaction. Never accept a serialized context, role, actor ID or platform privilege as authorization. Current write callers call `requireTenant(businessId, true)`, but `insertRecord` and `updateProfile` accept the same context type as readers. Evidence: `src/server/services.ts:63-68,94-98`, `src/server/authorization.ts:8-35`, `src/server/repositories/workspace.ts:33-49,64-112`, `docs/API_CONTRACTS.md:40-44` (AR-05).

### 10. Final owner, transfer and concurrency - REQUIRES JOINT APPROVAL

Only an OWNER may initiate ownership transfer; ADMIN may manage eligible non-owner memberships but may not promote to or demote an OWNER. A business must retain at least one active OWNER across demotion, removal, transfer and future account deletion. Transfer should atomically promote the recipient, apply the former owner's chosen role, and write an audit event. Serialize competing owner changes with a locked business row or an equivalent serializable transaction and retry policy; enforce the invariant again inside that transaction. Cross-tenant member IDs and stale role requests must fail without disclosing foreign membership. These operations are absent; the draft `changeMemberRole` target/role schema alone is insufficient. Evidence: `src/features/permissions/contracts.ts:8-13`, `prisma/schema.prisma:46-55`, `prisma/schema.prisma:20-30`, `src/shared/policies/permissions.ts:9-12` (AR-07).

### 11. Auth.js transport and application contracts - REQUIRES JOINT APPROVAL

Keep `/api/auth/*` under Auth.js v4 protocol, cookies and CSRF handling; do not make a parallel public `signIn` REST endpoint merely to satisfy the proposed feature interface. Application-owned registration, verification, recovery and own-session operations should have explicit validated inputs and safe result DTOs; future external JSON routes follow `/api/v1` conventions and no-store/error mappings. Existing server actions retain their current `{success?, error?}` compatibility shape until a separately reviewed adapter change. The proposed `signIn` response `{userId}` is not the implemented Auth.js response and must not be advertised as such. Align login password validation with the registration bcrypt byte limit. Evidence: `docs/API_CONTRACTS.md:3-5,28-48`, `src/features/authentication/contracts.ts:3-10`, `src/server/actions.ts:12-35`, `src/lib/validation.ts:3-17`, `src/lib/auth.ts:17-44` (AR-06, AR-11).

### 12. Staff profiles versus login identities - PROPOSED

Keep `Staff` as a tenant-owned scheduling profile, distinct from `User` and `BusinessMember`. A staff record must not imply login access, membership, or a platform role. If staff sign-in becomes a requirement, jointly review an optional tenant-scoped linkage and its invitation, unlinking and cross-tenant lifecycle before modifying the model. The current Staff model has no User or membership relation. Evidence: `prisma/schema.prisma:20-30,46-67`, `docs/SHARED_ARCHITECTURE_REVIEW.md:111-117` (AR-10).

### 13. Tenant isolation and RLS - OPEN QUESTION

Current isolation is application-level: protected services resolve membership, repositories filter by business, and several relations use compound tenant keys. PostgreSQL row-level security is not configured. Decide jointly whether this is sufficient for the commercial threat model or whether a future RLS design is required, including connection pooling, transaction-scoped tenant context, public/platform exceptions and migration/test cost. RLS must not be described as an existing control. Evidence: `src/server/authorization.ts:22-35`, `src/server/repositories/workspace.ts:33-57`, `prisma/schema.prisma:66,78,98,135-140`, `docs/SECURITY.md:5-7`.

### 14. Developer ownership and review gate - EXISTING

Developer A owns identity, sessions, onboarding, RBAC, security and migration coordination. Developer B owns staff and service-business workflows/UI and reviews client session behavior and adversarial tenant cases. Both explicitly review auth/session infrastructure, membership/role policies and `prisma/**` before dependent implementation; the author and other developer record approval on the shared contract review. A coordinates central `src/server/services.ts` and repository changes during transition so B does not concurrently rewrite those files. Evidence: `docs/TEAM_WORKFLOW.md:7-20,31-39`, `docs/SHARED_ARCHITECTURE_REVIEW.md:167-179`.

### 15. Security acceptance tests - PROPOSED

Before treating Phase A1 as implemented, require: generic registration/recovery responses for existing and unknown emails; verified-only sign-in/onboarding; malformed, expired, replayed and concurrent token use; bcrypt UTF-8 byte boundaries; session absolute expiry, sign-out, revoke-one ownership and revoke-all including current session; membership removal and demotion reflected on the next protected request; MEMBER write denial; platform-admin-without-membership tenant denial; foreign business/member/session IDs denied; concurrent last-owner changes; independent login/logout limits and trusted-client-header spoofing; rate-store failure classification; and no secret/token exposure in DTOs or logs. Use isolated database fixtures for integration/HTTP tests. Current unit tests mock authorization, while prepared E2E smoke covers public navigation and an unauthenticated redirect, not these cases. Evidence: `tests/authorization.test.ts:35-84`, `tests/rate-limit.test.ts:10-22`, `tests/validation.test.ts:8-22`, `tests/e2e/foundation.spec.ts:1-15`, `docs/TEAM_WORKFLOW.md:26-29`.

### 16. Future Prisma changes and migration ownership - REQUIRES JOINT APPROVAL

Propose a forward migration for email verification state on `User`; a purpose-bound, digest-only, expiring, consumed-at token model for verification/recovery; and supporting indexes/cleanup policy. Keep `RefreshSession` as the revocation table, adding indexes or metadata only if approved session listing actually requires them. Invitation and ownership-transfer data belong in a separate focused proposal; do not add a Staff-to-User relation without a staff-login decision. Developer A coordinates one shared schema PR at a time, Developer B reviews it, and migration SQL plus existing-account transition are reviewed before applying to isolated development/preview databases. Do not edit the applied initial migration or add an Auth.js PrismaAdapter without reviewing its required models. Evidence: `prisma/schema.prisma:20-55,142-151`, `docs/DATABASE.md:29-39`, `docs/TEAM_WORKFLOW.md:31-33`, `docs/SHARED_ARCHITECTURE_REVIEW.md:77-93`.

## Approval questions

- `OPEN QUESTION`: What transition proves ownership of already registered emails without silently treating them as verified?
- `OPEN QUESTION`: Which email delivery provider, sender domain and operational queue will support verification and recovery?
- `OPEN QUESTION`: Which trusted deployment edge supplies a canonical client identifier, and what is the behavior when it is unavailable?
- `OPEN QUESTION`: Is a staff login identity needed in Phase A1, or can Staff remain scheduling-only?
- `OPEN QUESTION`: Does the approved threat model require PostgreSQL RLS in addition to application-level tenant isolation?
- `OPEN QUESTION`: Should membership/role changes revoke all sessions, or is immediate database membership rechecking sufficient? Password recovery is proposed to revoke all sessions regardless.

**Approval gate:** Developer A and Developer B must record explicit approval or revisions for entries marked `REQUIRES JOINT APPROVAL` and resolve relevant `OPEN QUESTION` entries before those dependent workflows or schema changes are implemented. `PROPOSED` entries remain proposals until accepted through the same shared review process.
