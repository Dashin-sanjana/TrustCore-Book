# TrustCore Book — Phase 1

One Next.js App Router application; React Server Components read through server-only services. Browser components handle forms, navigation and tables only.

1. Inspect and preserve the source repository (initially README.md and .git only).
2. Install pinned stable dependencies; strict TypeScript, ESLint, Tailwind and shadcn-compatible primitives.
3. Prisma/Neon: pooled DATABASE_URL at runtime; direct DIRECT_URL for Prisma 7 migrations. All tenant-owned relations include businessId. UTC timestamptz and PostgreSQL exclusion constraint enforce staff booking exclusivity.
4. Stable Auth.js v4 credentials authentication, bcrypt password hashes, encrypted JWT cookies and revocable database-backed session records. Database role checks on every protected operation.
5. Registration and transactional business onboarding; authenticated tenant dashboard, appointments, services, staff, customers and settings; restricted platform administration; read-only public booking preparation.
6. Shared validation, database-backed distributed rate limiting, generic failures and redacted health check.
7. Responsive accessible design, loading/error/empty states, docs and environment examples.
8. Validate schema and migration against isolated PostgreSQL; run lint, types, security/integration tests and production build.

## Scope boundary

No appointment creation, payments, messaging, password recovery, email verification or Phase 2 booking workflow. Public booking explicitly reports that online scheduling is not enabled. No fabricated testimonials, customers, appointments or metrics.

## Verification dependencies

A real Neon project is required for deployment verification. Local PostgreSQL can verify SQL migrations and tenant/overlap constraints. Never connect to an existing database implicitly.

## Phase 0 collaboration pass

Preserve existing functionality and database. Add server-only repository boundaries, typed module contracts/interfaces and proposed shared-review gates; add all-module routing and honest unimplemented UI; support explicit light/dark/system themes; prepare RTL, Playwright, migration CI and two-developer ownership documents; run installation, lint, types, units, build and schema validation. No new business workflow, schema mutation, seed or deployment.
