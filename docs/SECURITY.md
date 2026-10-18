# Security foundation

## Trust boundaries

Browser IDs and schema-valid JSON are not authorization. Each protected service authenticates via requireUser/requireTenant/requirePlatformAdmin. Tenant repositories accept a server-derived branded context and filter every tenant read/write. Composite foreign keys prevent cross-business links. No middleware-only gate, client role or arbitrary businessId is trusted.

Narrow unscoped exceptions are identity credential lookup, own sessions/memberships, explicit public booking projection, provisioned platform read aggregates and operational rate/health tables. Public projections contain service menu/business display fields only. A platform role never grants implicit tenant mutation access. PostgreSQL RLS is not configured; this is application-level isolation backed by relation constraints.

## Identity and secrets

Stable Auth.js v4 Credentials uses bcrypt cost 12 (12+ character passwords, at most 72 UTF-8 bytes), encrypted JWT cookies, CSRF protection and an absolute eight-hour database session expiry/revocation record. Sign-out revokes the session. Auth callbacks redact invalid sessions; protected operations re-check revocation and membership. Recovery, email verification, MFA, OAuth and account/session UI are not implemented.

The existing RefreshSession model is a revocation record, not a browser refresh-token API. Adding an Auth.js PrismaAdapter/OAuth provider requires a reviewed Account/Session schema. No default admin or public bootstrap exists. A trusted operator provisions platformAdmin explicitly.

DATABASE_URL, DIRECT_URL and NEXTAUTH_SECRET are server-only. The local environment is ignored by Git with restrictive permissions. `.env.example` contains placeholders only. Never log environment objects or serialize ORM users. Next.js server-function argument logging is disabled; auth logs include safe codes only. Production requires HTTPS, and database TLS should verify certificates and hostnames.

## Abuse and errors

Atomic PostgreSQL counters provide global public mutation/booking/readiness and per-account login limits across server instances; database failures do not fail open. Global quotas are a foundation and require deliberate production tuning plus edge/per-IP protections. Do not trust arbitrary forwarded headers. Operational maintenance must prune expired rate/session records.

Versioned API errors use safe codes, no-store and request IDs; no raw stack traces, connection strings, SQL or provider payloads reach clients. Legacy server actions preserve generic errors. Planned operations have no implementation and cannot report success. Public health returns only readiness, not database identity or credentials.

## Booking and providers

There is no real booking operation. A future booking transaction must re-check tenant ownership, staff/service assignment, schedule exceptions, current pricing, policy and idempotency, then rely on the PostgreSQL exclusion constraint. A check-then-insert without the constraint is insufficient. Handle exclusion violation 23P01 as a conflict.

Provider secrets, webhook verification and replay-safe events belong on the server. Payment amount/currency are authoritative from stored invoice data; never collect raw card data. Reminders need an outbox/retry policy before messages are sent. These are planned acceptance requirements, not configured integrations.

## Review and testing

Both developers review shared schema/auth/membership/booking changes. Boundary checks and server-only imports run in CI; they supplement human review. Tests cover invalid/revoked sessions, member writes, cross-tenant access, negative contract inputs, empty unimplemented UI and database overlap races on a disposable test database. Integration tests refuse non-`_test` database names and never read production credentials implicitly.

Production deployment, destructive migrations and production data seeding are not part of Phase 0. Report discovered issues privately to the project maintainers; a public security contact has not yet been provided.
