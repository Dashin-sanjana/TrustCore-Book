# Phase 1 validation — 18 October 2026

## Verified locally

- Prisma 7.10.1 schema validation and client generation.
- Initial SQL migration applied to an isolated PostgreSQL 16 database, with no schema drift.
- Database-level cross-tenant foreign keys, interval checks, concurrent overlap prevention, adjacent slots and cancelled slots.
- 16 passing Vitest tests, including 4 PostgreSQL integration tests. Default runs explicitly skip those 4 unless TEST_DATABASE_URL is supplied.
- ESLint, strict TypeScript and optimized Next.js production build.
- Browser: registration, credentials login, onboarding redirect, transactional business creation, services/staff/customers creation, service search with no-result state, business settings save, public service listing, sign-out and protected-route redirect after sign-out.
- Database health endpoint returned HTTP 200 with `status: ok` and `database: reachable`.
- Mobile landing at 390px had equal viewport and document widths (no horizontal overflow). Desktop sidebar and tables checked at 1440px. Screenshots are in `docs/screenshots/`; they reflect the test machine's automatic dark theme.
- No database environment variable names, authentication secrets or password hash fields found in generated browser JavaScript.
- Server-function argument logging explicitly disabled after observing the installed Next.js development default. Only disposable test credentials were used.

## Neon verification — 18 October 2026

- Connected to the supplied pooled Neon endpoint and its corresponding direct endpoint.
- Confirmed the target database was empty before applying the initial migration.
- Applied `20261018000000_initial`, including the booking exclusion constraint and tenant foreign keys.
- Migration status is current. Verified the real pooled runtime driver by executing the app health handler: HTTP 200, database reachable.
- Local runtime and direct migration URLs are stored only in private, Git-ignored `.env`, with explicit TLS certificate and hostname verification. A random local Auth.js secret was generated. Credentials are omitted from this report.

## Deployment verification outstanding

Nothing was deployed to Vercel. Production HTTPS cookies and deployment must be smoke-tested once the production origin and environment are configured. Platform administration and manager/member denial paths have authorization unit coverage; no separate platform-admin browser account was provisioned.

The temporary database contains only disposable test accounts and business records; it is outside the repository, is never a production data source and is stopped after verification. Browser account data is not seeded into the application.
