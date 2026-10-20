# Phase A1 identity migration proposal (not approved or applied)

**Status: PREPARED - NOT APPROVED OR APPLIED.** Developer A and Developer B must each approve the shared schema, SQL and rollout before an isolated rehearsal. The canonical prepared SQL is `prisma/migrations/20261018010000_phase_a1_identity/migration.sql`. Its presence under `prisma/migrations` means a future `prisma migrate deploy` would pick it up; do not run that command against any shared or production database. The initial migration remains untouched.

## Proposed additive Prisma shape

Add to `User`:

```prisma
emailVerificationRequired Boolean @default(false)
emailVerifiedAt DateTime? @db.Timestamptz(3)
credentialVersion Int @default(0)
securityTokens AccountSecurityToken[]
```

Add a purpose-bound token table:

```prisma
enum AccountTokenPurpose {
  VERIFY_EMAIL
  RESET_PASSWORD
}

model AccountSecurityToken {
  id String @id @default(cuid())
  userId String
  purpose AccountTokenPurpose
  digest String @unique
  expiresAt DateTime @db.Timestamptz(3)
  consumedAt DateTime? @db.Timestamptz(3)
  createdAt DateTime @default(now()) @db.Timestamptz(3)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, purpose, expiresAt])
}
```

Add `credentialVersion Int @default(0)` to `RefreshSession`. A password change or reset increments `User.credentialVersion` in the same transaction that changes the hash and revokes sessions. Session creation must conditionally verify the version observed during credential checking; protected reads must require the session and user versions to match. This closes the race where an old-password login passes verification before a password change but inserts a new session after revoke-all. Auth.js and repository changes are prepared, but remain unapproved and need isolated concurrency verification.

The digest is SHA-256 of a 32-byte cryptographically random token. No raw token, password, session cookie or email address is stored in this table. The email provider and sender domain are not selected; no delivery should be claimed until a trusted provider is configured and its failure behavior tested.

## Canonical forward migration

The migration at `prisma/migrations/20261018010000_phase_a1_identity/migration.sql` was compared with a **database-free** Prisma diff from the committed schema to the proposed schema. It adds only the token enum, three `User` columns, one `RefreshSession` column, the token table, its unique digest index, its lookup index and its user foreign key. The foreign key explicitly uses `ON DELETE CASCADE ON UPDATE CASCADE`, matching Prisma and the initial migration's relation convention. The migration wraps PostgreSQL DDL in `BEGIN`/`COMMIT` to avoid a partially applied schema if a statement fails. No `DROP`, `TRUNCATE`, data backfill, destructive `ALTER`, booking change or new uniqueness assumption over existing rows is present. The older `prisma/proposals/phase_a1_identity.sql` is a superseded, non-authoritative reference and must not be executed.

`digest` is `TEXT NOT NULL` with a global unique index; the database does not enforce its SHA-256 hex format. `expiresAt` and `consumedAt` are stored timestamps; validity and single-use are enforced by conditional transactional repository updates, not a database TTL. Index size, token cleanup and retention need an operational review.

## Rollout and compatibility gate

1. Developer A and Developer B each record explicit approval of the policy, additive schema, exact canonical SQL, mixed-version traffic control, and test plan. Neither approval is recorded here. Rotate any previously shared database credentials. Verify a disposable Neon branch and dedicated `_test` database by project, branch, endpoint and role; a URL suffix or existing `DATABASE_URL` alone is not proof of isolation.
2. Rehearse from the previous committed migration history and synthetic legacy users on that isolated branch. Review migration status and confirm the initial custom booking constraints remain present. Apply the canonical migration only after approval; never run `migrate dev`, `db push` or `migrate reset` on shared databases. Compare pre/post row counts, legacy defaults, foreign-key actions, indexes and migration history, then run the six gated PostgreSQL tests.
3. Existing users retain `emailVerificationRequired=false` and `emailVerifiedAt=NULL`. This is a temporary **legacy exemption**, not evidence of verified ownership. They continue to sign in and operate existing businesses. A separately approved campaign must verify their addresses before removing the exemption.
4. New registrations set `emailVerificationRequired=true` and remain unable to sign in or onboard until a single-use verification token is consumed. An unconfigured or failed delivery path must not report a sent message. Resend uses generic public responses and separate limits.
5. Verification consumption must atomically require matching digest, purpose, `consumedAt=NULL`, and `expiresAt>now`, then mark the user verified. Reset consumption must atomically enforce the same conditions, replace the bcrypt hash, revoke all user sessions, and consume competing reset tokens. Concurrent redemption should yield one winner.
6. Request links must use a fixed trusted origin, `Referrer-Policy: no-referrer`, no third-party assets on token pages, no open redirect, and no token logging. Use separate request/redeem quotas and a trusted client identifier only after the deployment edge is approved.
7. Add disposable-database concurrency, replay, expiry, failed-delivery and rollback tests before enabling the workflows. Keep the legacy login path until its owners are verified by an approved transition.

## Schema-first release and failure control

1. Gate registration and authentication writes before the migration window, and drain old application instances before enabling new-account flows. The old application tolerates additive columns, but it does not enforce email verification. If old and new versions overlap, old registration can create new users with the database default `emailVerificationRequired=false`, and old login can accept a pending user's credentials. No release should rely on a mixed-version auth window.
2. Confirm both migration `DIRECT_URL` and runtime `DATABASE_URL` resolve to the intended environment, without printing their values. Apply the approved schema first. Only then deploy and start the new Prisma client: `findCredentialsUser` reads the new `User` fields, and session lookup reads `credentialVersion`; the new client is incompatible with the old schema. Keep auth traffic gated until all new instances are healthy and old ones are drained.
3. Re-enable flows only after catalog checks, disposable-database tests, legacy sign-in checks, and configured delivery checks pass. Existing users remain `emailVerificationRequired=false`, `emailVerifiedAt=NULL`, and `credentialVersion=0`; that is a temporary exemption, **not** proof of ownership. Existing session rows receive version `0`. New registration explicitly sets `emailVerificationRequired=true`.
4. A failed rehearsal must stop before deployment. Inspect the actual schema and `_prisma_migrations`; do not re-run blindly or edit an applied migration. Use an approved forward repair or restore the disposable branch to its pre-rehearsal point. Once new pending users exist, reverting to the old app is unsafe because it ignores their verification state. Keep auth traffic gated and use a reviewed forward fix rather than a simple binary or destructive schema rollback.

## Approval record (all pending)

- [ ] Developer A: confirm canonical SQL, initial-migration compatibility, transactional failure behavior, isolated branch identity and rehearsed test evidence.
- [ ] Developer B: review shared `prisma/**` changes, legacy-user and mixed-version effects, and absence of changes to booking constraints or Developer B models.
- [ ] Both developers: approve the traffic gate, schema-first deployment order, recovery plan and decision to enable account-email delivery.
- [ ] Release coordinator: record disposable-branch results before authorizing any non-disposable migration. No sign-off is implied by this document or by passing offline checks.

**Unresolved:** delivery provider, trusted client identifier, legacy verification campaign, token retention, and whether membership changes revoke sessions. Developer B has not approved these decisions. Runtime use remains blocked until this gate and infrastructure are resolved.

**Implementation status:** The proposed Prisma shape and canonical forward migration are prepared but unapplied. Account flows are wired but inoperable without the schema and configured delivery. `ACCOUNT_EMAIL_GATEWAY_URL` must be a trusted HTTPS transactional gateway accepting private JSON `{ kind, recipient, link }`; `ACCOUNT_EMAIL_GATEWAY_TOKEN` is server-only. No gateway is configured by default. A durable outbox/retry contract remains a joint operational decision. Unit/mock tests cover query shape, not database guarantees; the opt-in PostgreSQL suite remains skipped until an explicitly verified disposable `_test` database is migrated. No end-to-end or successful-delivery claim is made.
