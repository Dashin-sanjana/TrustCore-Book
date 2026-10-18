# Database foundation and migration ownership

## Current configuration

Prisma 7.10.1 uses `prisma.config.ts`: CLI migrations read `DIRECT_URL`. Runtime `PrismaPg` reads pooled `DATABASE_URL`, with a small connection pool and timeout. Neon URLs must use TLS; prefer explicit `sslmode=verify-full`. Secrets remain in ignored `.env`, never documentation or workflow arguments. `.env.example` contains placeholders only.

The initial migration was already applied to the supplied Neon database before this Phase 0 pass. **This pass changes no schema or migration and performs no reset, destructive migration or production seed.** Use separate Neon branches per developer and preview environment. Do not point integration tests at Neon production.

## Model ownership

| Models                   | Ownership / invariants                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| User, RefreshSession     | Identity/account scope; bcrypt hash and absolute revocation/expiry records. No OAuth Account model yet. |
| Business, BusinessMember | Business root and unique `(businessId,userId)` membership. Roles are OWNER, ADMIN, MEMBER.              |
| Staff, Service, Customer | Tenant-owned; compound `(businessId,id)` keys support safe relations. Prices use decimal values.        |
| StaffService             | Both referenced staff and service share `businessId`.                                                   |
| AvailabilityRule         | Tenant/staff recurring local weekday and wall-clock minutes, validated by SQL CHECK.                    |
| ScheduleException        | Tenant/staff UTC interval; CHECK enforces positive length.                                              |
| Appointment              | Tenant/staff/service/customer compound foreign keys, UTC interval and price/currency snapshot.          |
| AuditLog                 | Tenant-owned append-only application events; actors can be null after account deletion.                 |
| RateLimit                | Operational, global or hashed-account buckets; expiry cleanup is an operational task.                   |

Indexes support membership lookup, tenant appointment start ranges, customer email lookup, staff availability and tenant audit chronology. Full-text search and reporting indexes are not guessed before query requirements exist.

## Booking integrity

`appointment_staff_no_overlap` excludes overlapping `[startsAt,endsAt)` ranges for equal business/staff while status is non-CANCELLED. `btree_gist` is required. Adjacent intervals and cancelled overlaps are allowed. CHECK constraints enforce interval, duration, weekday and price validity. These SQL features are not fully represented by Prisma schema syntax; preserve them explicitly in subsequent migrations.

Existing appointment statuses: PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW. They do not imply implemented transition APIs. Categories, notifications/outbox, subscriptions, payment events and booking idempotency records are **planned models**, not silently added schema. Their contracts require both developers' review before migration.

## Migration protocol

1. Developer A coordinates schema changes; B is mandatory reviewer for shared model changes and booking constraints. Agree on the contract first.
2. Rebase on the current integration branch, generate a uniquely named migration on an isolated development branch (`pnpm db:migrate --name <change>`), inspect SQL, then test from empty and from the previous committed schema.
3. Never edit a migration that has been applied/shared. Correct it with a new forward migration. Only the migration coordinator merges one schema PR at a time.
4. CI uses disposable PostgreSQL 16, `db:deploy`, schema validation and integration tests. Local database tests require an explicit TEST_DATABASE_URL ending `_test` and `psql`.
5. Apply release migrations once in a controlled release step with DIRECT_URL, then deploy the app. Preview builds never migrate production. Destructive/data-movement SQL requires a separate approved plan, backup/restore validation and human execution approval.

Do not use `db push` or `migrate reset` on shared/production databases. No command in CI uses production credentials. Keep customer retention and rate/session cleanup operational policies separate from migrations.
