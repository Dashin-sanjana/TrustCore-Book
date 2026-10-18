# TrustCore Book

> **Phase 0 collaboration foundation:** The existing Phase 1 workflows are preserved. This pass adds 22 module contracts, repository boundaries, explicit planned-feature pages, themes, testing preparation and CI. It does not implement the remaining modules or booking operations. Start with [FEATURES](docs/FEATURES.md), [TEAM_WORKFLOW](docs/TEAM_WORKFLOW.md), [CONTRIBUTING](CONTRIBUTING.md) and [Phase 0 verification](docs/PHASE0_VALIDATION.md).

Multi-tenant appointment and business management foundation by TrustCore Labs. One Next.js App Router application, deployed to Vercel. Initial markets: Sri Lanka, Maldives, UAE and Australia.

## Requirements and setup

- Node.js 22.18+ (or a compatible current LTS), pnpm 10.30.3.
- A Neon PostgreSQL project with pooled and direct connection strings.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Set DATABASE_URL, DIRECT_URL, NEXTAUTH_URL and a randomly generated NEXTAUTH_SECRET.
# Generate the secret with: openssl rand -base64 48
pnpm db:generate
pnpm db:validate
pnpm db:deploy
pnpm dev
```

Open http://localhost:3000. Register an account, sign in, create a business, then add services, staff and customers. Nothing is seeded or fabricated. With no database configuration the landing and authentication forms render; data operations fail safely until configured.

## Configuration

| Variable          | Purpose                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `DATABASE_URL`    | Neon pooled endpoint for runtime PrismaPg adapter connections.                           |
| `DIRECT_URL`      | Direct PostgreSQL endpoint for Prisma 7 migration CLI, configured in `prisma.config.ts`. |
| `NEXTAUTH_URL`    | Canonical origin; HTTPS is mandatory in production.                                      |
| `NEXTAUTH_SECRET` | Random secret of at least 32 characters; keep stable across instances.                   |

Use `.env` locally. Environment files are ignored except `.env.example`. None of these variables uses a `NEXT_PUBLIC_` prefix. `prisma.config.ts` supplies a noncredential localhost fallback solely so generation/build can run before provisioning. Migration commands require a real `DIRECT_URL`.

## Commands

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
pnpm db:migrate --name describe_change
pnpm db:deploy
```

`db:migrate` is for local development databases, `db:deploy` applies committed migrations in deployment. Do not run migration development commands against production. The initial migration contains hand-maintained SQL checks and an exclusion constraint that Prisma cannot represent. Preserve this SQL in future migrations. `btree_gist` must be available (supported by Neon).

Integration tests can run against a **dedicated disposable migrated test database**:

```sh
TEST_DATABASE_URL=postgresql://USER@127.0.0.1:55439/trustcore_phase1_test pnpm test
```

They require `psql` on PATH, write isolated test records, verify cross-tenant foreign keys and overlapping bookings, and clean up. They skip explicitly when the variable is absent. Never point them at a customer database.

## Routes

| Route                                                | Behavior                                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| `/`                                                  | Product landing page                                                   |
| `/login`, `/register`                                | Credentials authentication and account registration                    |
| `/onboarding`                                        | Authenticated transactional business and owner creation                |
| `/app`                                               | Redirects to an authorized business or onboarding                      |
| `/app/[businessId]`                                  | Real database counts and setup checklist                               |
| `/app/[businessId]/appointments`                     | Read-only appointment directory                                        |
| `/app/[businessId]/services`, `/staff`, `/customers` | Tenant directories, search/sort/pagination, owner/admin creation forms |
| `/app/[businessId]/settings`                         | Business profile, public address and IANA timezone                     |
| `/admin`                                             | Read-only platform overview, explicitly provisioned admins only        |
| `/book/[slug]`                                       | Public service menu; scheduling explicitly unavailable                 |
| `/api/health`                                        | Database readiness; redacted `503` on failure, no-store                |

All directory suffixes above are under `/app/[businessId]`. Customers and appointments currently load up to 100 most recent rows; server pagination is future work.

## Architecture and security

- `src/server/`: server-only queries, authorization, rate limiting and server actions. Mutations validate untrusted input with Zod and re-check tenant roles. Layout authorization is additional protection, never the only protection.
- `src/lib/auth.ts`: stable Auth.js v4 / next-auth 4.24.15 with Credentials and encrypted JWT sessions. Bcrypt cost 12, minimum 12 characters and maximum 72 UTF-8 bytes. Auth.js handles CSRF and secure HTTP-only cookies. Server actions retain Next.js origin checks. Production requires HTTPS.
- `RefreshSession` is an absolute eight-hour session revocation record; it is not an exposed refresh-token API. Every protected operation verifies expiry/revocation and reads current database membership. Sign-out revokes the current session. Revoke all sessions for an account by setting their `revokedAt` in an authorized operational database workflow.
- Owners/admins may create records and update profiles; members can read. Platform admin status never bypasses tenant membership. Registration cannot set roles or platform privileges.
- A trusted database operator provisions the first platform admin after account creation, using a parameterized update to `User.platformAdmin`. There is deliberately no public bootstrap route or default admin password.
- Composite tenant foreign keys prohibit linking staff/services/customers across businesses. Business-local audit events are written transactionally with changes. No application-wide unscoped CRUD endpoints exist. Tenant isolation is enforced in the service layer and relational constraints; PostgreSQL row-level security is not configured.
- Public authentication mutations, registration and public pages use atomic PostgreSQL rate-limit counters shared across Vercel instances. Login also has per-account limits. Global limits deliberately work without trusting spoofable forwarded IP headers. Configure WAF/per-IP throttling in Vercel for production traffic volumes; adjust global quotas deliberately. Rate limit failures do not fail open.
- Operational cleanup: periodically delete expired `RateLimit` rows and expired/revoked `RefreshSession` records with a trusted database maintenance job. This release does not schedule one automatically.
- Health responses and client errors never include database URLs, SQL or password hashes. Authentication logs include error codes only.

## Booking foundation

Appointment and exception timestamps use PostgreSQL `timestamptz`, representing UTC instants. Businesses store IANA timezones, and recurring availability stores local weekday/minutes. Render appointments in the business timezone. Future slot generation must resolve daylight-saving gaps and ambiguous local times explicitly.

The SQL exclusion constraint uses `(businessId, staffId, tstzrange(startsAt, endsAt, '[)'))` for all non-cancelled appointments. Concurrent conflicting inserts cannot both commit; back-to-back slots are allowed. CHECK constraints enforce positive intervals, durations and prices. A future booking service must also validate availability, exceptions, staff/service assignment, currency and idempotency within a transaction and translate PostgreSQL `23P01` into an unavailable-slot result. No booking mutation is exposed in Phase 1.

## Vercel deployment

1. Import this repository as a Next.js project; use pnpm and a supported Node LTS.
2. Configure all four environment variables separately for Preview and Production. Use separate Neon branches for preview environments.
3. Apply `pnpm db:deploy` against the intended branch in a controlled release step, then build with `pnpm build`. Do not apply migrations from concurrent preview builds to production.
4. Verify `/api/health`, registration, sign-in, onboarding, logout, manager/member authorization and a second tenant after deployment.

The build generates Prisma Client and does not connect to the database or auto-apply migrations. The PostgreSQL adapter connects to Neon’s pooled endpoint over TLS. Live Neon/Vercel verification requires your provisioned project and secrets.

## Phase 1 limits

Online booking, availability editing, staff/service assignment UI, customer self-service, payments, notifications, email verification, password recovery, invitations, edit/delete flows for directory records and timezone changes with existing schedule data require subsequent work. Avoid changing a business timezone after scheduling is enabled until a migration policy is defined. No Phase 2 work or automatic deployment is included.

Original source README is preserved as `README.original.md`.
