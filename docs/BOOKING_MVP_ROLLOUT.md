# Booking MVP rollout (prepared, not applied)

For the new separate `trustcore-book-dev` project, the consolidated procedure
in `docs/SEPARATE_DEV_PROJECT.md` supersedes the older disposable-branch
commands below. Do not run the old branch-specific script against `neondb`.

The current code includes tenant-scoped service/staff editing, weekly staff hours,
one-off time off, appointment transitions, public slot selection and transactional booking. `BOOKING_MVP_ENABLED` must remain
unset or `false` until the following gates are complete. The public page then
continues to show its unavailable state rather than accepting a booking.

## Migration order

1. Review the already prepared A1 and A2 migrations and their own approval gates.
2. Review `prisma/migrations/20261019030000_booking_idempotency/migration.sql`.
   It only creates `BookingRequest`, its unique/indexes and two foreign keys.
   It does not change existing appointment, customer, service or staff records.
3. On an independently verified disposable Neon branch, apply the ordered
   migrations with Prisma Migrate. Never use `db push` or `migrate reset`.
4. Verify the `BookingRequest` table, unique `(businessId,idempotencyKey)`,
   composite appointment foreign key, and existing appointment exclusion
   constraint. Run `tests/booking-database.integration.test.ts` only with the
   exact disposable endpoint/database guard enabled. Verify clean fixture
   cleanup and concurrent conflict behavior.
5. Deploy the migrated schema before deploying the generated client and server
   code. Enable `BOOKING_MVP_ENABLED=true` only after the application build and
   full booking journey pass against the target environment. Do not run the
   generated client against the old schema with the feature enabled.

The new table makes a request idempotent within one business. Its payload digest
is keyed; only the booking result ID and digest are stored. PostgreSQL's existing
`appointment_staff_no_overlap` constraint is the final concurrent-booking guard.
Staff/service references and the booked price are derived server-side. A replay
with changed details is rejected. Slot tokens are opaque keyed digests and are
rechecked against current hours, assignments, exceptions and appointments.

## Remaining release checks

- Confirm the live email provider and decide whether customer confirmations are
  required before public launch. The current booking action does not send them.
- Add a trusted edge/client identifier and abuse controls for anonymous slot
  search and booking. Signed browser cookies add per-browser slot/booking
  budgets alongside the existing shared global/per-email limits, but a caller
  can rotate cookies. A deployment-verified edge identifier and edge abuse
  controls are still required before public launch; never trust forwarded
  client headers without a verified proxy contract.
- Exercise booking, cancellation, time zones/DST, role changes, and a stale slot
  in browser E2E tests on a verified disposable database. No such live test has
  been run in this workspace.
- Define a safe forward-repair plan before rollout. Once appointments exist,
  dropping the table or reverting the schema is not a safe rollback. Disable
  `BOOKING_MVP_ENABLED`, diagnose, and repair forward while retaining data.

No database migration or database integration test was executed while preparing
this package.

## Consolidated disposable-Neon rehearsal

Run the following in Mac Terminal from the repository root only after reviewing
the three pending migration files. It requires `NEON_API_KEY` in the local shell
and `$HOME/.trustcore-a1-test-direct-url` (mode 600) containing the direct test
URL with `sslmode=verify-full`. It copies source without `.env` files, checks
live branch/endpoint metadata and the two existing migration records, then
requires an explicit confirmation before applying the three pending migrations.
Do not substitute a production URL. If any check fails, stop and investigate;
never use `db push` or `migrate reset`. The temporary copy contains no
credential file and can be removed after inspection.

```zsh
set +x
set -euo pipefail
[[ "$(git branch --show-current)" == "dashiya/new" ]]
[[ -n "${NEON_API_KEY:-}" ]] || { print -u2 "Neon API access required"; return 1; }
cred="$HOME/.trustcore-a1-test-direct-url"
[[ -f "$cred" && ! -L "$cred" && "$(stat -f %Lp "$cred")" == "600" && \
   "$(stat -f %Su "$cred")" == "$USER" ]] || { print -u2 "Credential file invalid"; return 1; }
IFS= read -r TEST_URL < "$cred"

env -i PATH="$PATH" HOME="$HOME" NEON_API_KEY="$NEON_API_KEY" TEST_URL="$TEST_URL" node <<'NODE'
const { spawnSync } = require("node:child_process");
const fail = () => { console.error("Disposable target preflight failed; no writes authorized."); process.exit(1); };
(async () => {
  const u = new URL(process.env.TEST_URL);
  if (!["postgres:", "postgresql:"].includes(u.protocol) ||
      u.hostname !== "ep-wild-cloud-b52apabm.c-7.us-east-2.aws.neon.tech" ||
      u.pathname !== "/trustcore_book_a1_test" ||
      u.searchParams.get("sslmode") !== "verify-full") fail();
  const base = "https://console.neon.tech/api/v2/projects/quiet-mouse-55892784";
  const headers = { Authorization: `Bearer ${process.env.NEON_API_KEY}` };
  const [br, ep] = await Promise.all([
    fetch(`${base}/branches/br-late-sunset-b5k5go82`, { headers }),
    fetch(`${base}/endpoints`, { headers })
  ]);
  if (!br.ok || !ep.ok) fail();
  const b = (await br.json()).branch;
  const endpoints = (await ep.json()).endpoints;
  if (b?.id !== "br-late-sunset-b5k5go82" ||
      b.name !== "trustcore-book-a1-test" || !b.parent_id || b.protected ||
      !b.expires_at || Date.parse(b.expires_at) <= Date.now() + 3600000 ||
      !endpoints?.some(e => e.host === u.hostname &&
        e.branch_id === b.id && e.type === "read_write")) fail();
  const pg = {
    PATH: process.env.PATH, PGHOST: u.hostname, PGPORT: u.port || "5432",
    PGUSER: decodeURIComponent(u.username), PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: u.pathname.slice(1), PGSSLMODE: "verify-full",
    PGCONNECT_TIMEOUT: "5", PGOPTIONS: "-c default_transaction_read_only=on"
  };
  function query(sql) {
    const r = spawnSync("psql", ["-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql],
      { env: pg, encoding: "utf8" });
    if (r.status !== 0) fail();
    return r.stdout.trim();
  }
  if (query("SELECT current_database()") !== "trustcore_book_a1_test") fail();
  if (query("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'") !== "15") fail();
  if (query('SELECT migration_name FROM "_prisma_migrations" ORDER BY started_at').split("\n").join("|") !==
      "20261018000000_initial|20261018010000_phase_a1_identity") fail();
  if (query('SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL') !== "0") fail();
  console.log("Disposable Neon target and A1 history verified.");
})().catch(fail);
NODE

tmp="$(mktemp -d /private/tmp/trustcore-rehearsal.XXXXXX)"
rsync -a --exclude='.env*' --exclude='.git' --exclude='node_modules' \
  --exclude='.next' ./ "$tmp/"
ln -s "$PWD/node_modules" "$tmp/node_modules"
cd "$tmp"
env -i PATH="$PATH" HOME="$HOME" DOTENV_CONFIG_PATH=/dev/null \
  DATABASE_URL="$TEST_URL" DIRECT_URL="$TEST_URL" pnpm exec prisma migrate status
read -r "approval?Type APPLY THREE TEST MIGRATIONS to continue: "
[[ "$approval" == "APPLY THREE TEST MIGRATIONS" ]] || { print -u2 "Stopped"; return 1; }
env -i PATH="$PATH" HOME="$HOME" DOTENV_CONFIG_PATH=/dev/null \
  DATABASE_URL="$TEST_URL" DIRECT_URL="$TEST_URL" pnpm exec prisma migrate deploy
env -i PATH="$PATH" HOME="$HOME" DOTENV_CONFIG_PATH=/dev/null \
  DATABASE_URL="$TEST_URL" DIRECT_URL="$TEST_URL" pnpm exec prisma migrate status
env -i PATH="$PATH" HOME="$HOME" DOTENV_CONFIG_PATH=/dev/null \
  DATABASE_URL="$TEST_URL" DIRECT_URL="$TEST_URL" \
  TEST_DATABASE_URL="$TEST_URL" \
  A1_TEST_DATABASE_URL="$TEST_URL" A1_TEST_DATABASE_VERIFIED=YES \
  A2_TEST_DATABASE_URL="$TEST_URL" A2_TEST_DATABASE_VERIFIED=YES \
  BOOKING_TEST_DATABASE_URL="$TEST_URL" BOOKING_TEST_DATABASE_VERIFIED=YES \
  A2_MEMBERSHIP_ENABLED=false BOOKING_MVP_ENABLED=false \
  pnpm exec vitest run tests/database.test.ts \
    tests/account-database.integration.test.ts \
    tests/membership-database.integration.test.ts \
    tests/booking-database.integration.test.ts \
    --no-file-parallelism --maxWorkers=1

test_secret="$(openssl rand -hex 32)"
env -i PATH="$PATH" HOME="$HOME" DOTENV_CONFIG_PATH=/dev/null CI=1 \
  DATABASE_URL="$TEST_URL" DIRECT_URL="$TEST_URL" \
  BOOKING_E2E_DATABASE_URL="$TEST_URL" BOOKING_E2E_DATABASE_VERIFIED=YES \
  NEXTAUTH_SECRET="$test_secret" NEXTAUTH_URL=http://127.0.0.1:3100 \
  A2_MEMBERSHIP_ENABLED=false BOOKING_MVP_ENABLED=true \
  pnpm exec playwright test tests/e2e/public-booking.spec.ts \
    --project=chromium --workers=1
```

The browser test enables booking only in its isolated process. Keep both
feature flags off in every persistent environment until the database and
browser tests pass and the remaining release checks above are resolved.
