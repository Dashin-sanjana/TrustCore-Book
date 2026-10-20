# Separate Neon development project rehearsal

Prepared, not executed. This guide targets **only** Neon project
`fragrant-hat-50630079` (`trustcore-book-dev`), branch
`br-dark-brook-b4vdolwu` (named `production` inside that separate project),
database `neondb`. It does not authorize touching the original project
`quiet-mouse-55892784`. The endpoint hostname and empty schema have **not**
yet been independently verified. Rotate the previously shared original-project
credential; never reuse it here.

Prisma CLI now requires an explicit `DIRECT_URL`; it does not load repository
`.env` or fall back to localhost. The app still uses `DATABASE_URL`. For the
local outbox both URLs must be the same verified direct endpoint with
`sslmode=verify-full`. Keep `A2_MEMBERSHIP_ENABLED=false` and
`BOOKING_MVP_ENABLED=false` until the database and browser tests pass.

For a **read-only first check**, run `pnpm dev:check` in Mac Terminal. It
prompts privately for a fresh direct URL and Neon metadata API key, rejects a
pooled or wrong-project endpoint, and reports whether `neondb` is empty,
partially migrated, or has all five migrations. It does not use `.env`, print
credentials, apply migrations, or create accounts. Do not use the previously
shared URL; rotate that credential first. Use the full procedure below only
after this first check succeeds and you are ready to approve the migrations.

## Mac Terminal procedure

Run from the repository root in **zsh**. Install `psql` and use existing
`node_modules` first. Obtain a fresh **direct** connection URL for this exact
project/branch/database from Neon Console. The prompts hide the URL, API key,
and access token; never paste them into chat, `.env`, shell history, or logs.
The script checks Neon API project/branch/endpoint metadata before a read-only
SQL query. It requires an empty public schema and no Prisma migration table.
Any failure stops before writes. The approval phrase authorizes only the five
ordered migrations on this separately verified development target.

```zsh
set +x
set -euo pipefail
[[ "$(git branch --show-current)" == "dashiya/new" ]]
command -v psql >/dev/null
command -v node >/dev/null
command -v pnpm >/dev/null
umask 077
read -rs "DEV_URL?Paste NEW project direct Neon URL (hidden): "; echo
read -rs "NEON_API_KEY?Neon metadata API key (hidden): "; echo
read -rs "OUTBOX_TOKEN?Choose a 43-character base64url outbox access token (hidden): "; echo
[[ "$OUTBOX_TOKEN" =~ '^[A-Za-z0-9_-]{43}$' ]]

env -i PATH="$PATH" HOME="$HOME" DEV_URL="$DEV_URL" NEON_API_KEY="$NEON_API_KEY" node <<'NODE'
const { spawnSync } = require('node:child_process');
const fail = () => { console.error('Development target preflight failed. No writes authorized.'); process.exit(1); };
(async () => {
  let u;
  try { u = new URL(process.env.DEV_URL); } catch { fail(); }
  if (!['postgres:', 'postgresql:'].includes(u.protocol) || !u.username || !u.password ||
      !/^ep-[a-z0-9-]+(?:\.[a-z0-9-]+){1,3}\.aws\.neon\.tech$/.test(u.hostname) ||
      u.hostname.includes('-pooler.') || u.pathname !== '/neondb' ||
      (u.port && u.port !== '5432') || u.hash ||
      u.searchParams.get('sslmode') !== 'verify-full') fail();
  const base = 'https://console.neon.tech/api/v2/projects/fragrant-hat-50630079';
  const headers = { Authorization: `Bearer ${process.env.NEON_API_KEY}` };
  const [pr, br, ep] = await Promise.all([
    fetch(base, { headers, signal: AbortSignal.timeout(10000) }),
    fetch(`${base}/branches/br-dark-brook-b4vdolwu`, { headers, signal: AbortSignal.timeout(10000) }),
    fetch(`${base}/endpoints`, { headers, signal: AbortSignal.timeout(10000) }),
  ]);
  if (!pr.ok || !br.ok || !ep.ok) fail();
  const p = (await pr.json()).project;
  const b = (await br.json()).branch;
  const endpoints = (await ep.json()).endpoints;
  if (p?.id !== 'fragrant-hat-50630079' || p.name !== 'trustcore-book-dev' ||
      b?.id !== 'br-dark-brook-b4vdolwu' || b.name !== 'production' ||
      !Array.isArray(endpoints) ||
      !endpoints.some(e => e.host === u.hostname && e.branch_id === b.id &&
        e.project_id === p.id && e.type === 'read_write' && e.disabled !== true)) fail();
  const pg = {
    PATH: process.env.PATH, PGHOST: u.hostname, PGPORT: u.port || '5432',
    PGUSER: decodeURIComponent(u.username), PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: 'neondb', PGSSLMODE: 'verify-full', PGCONNECT_TIMEOUT: '5',
    PGOPTIONS: '-c default_transaction_read_only=on', PGSERVICEFILE: '/dev/null',
  };
  const q = sql => {
    const r = spawnSync('psql', ['-X', '-w', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql],
      { env: pg, encoding: 'utf8', timeout: 15000 });
    if (r.status !== 0) fail();
    return r.stdout.trim();
  };
  if (q('SELECT current_database()') !== 'neondb' ||
      q("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'") !== '0' ||
      q("SELECT to_regclass('public._prisma_migrations') IS NULL") !== 't') fail();
  console.log('New development project, endpoint, database and empty schema verified.');
})().catch(fail);
NODE

DEV_ENDPOINT="$(env -i PATH="$PATH" DEV_URL="$DEV_URL" node -e 'process.stdout.write(new URL(process.env.DEV_URL).hostname)')"
tmp="$(mktemp -d /private/tmp/trustcore-dev.XXXXXX)"
rsync -a --exclude='.env*' --exclude='.git' --exclude='node_modules' --exclude='.next' ./ "$tmp/"
cp -a "$PWD/node_modules" "$tmp/node_modules"
cd "$tmp"
# Empty public schema and absent _prisma_migrations were checked above.
read -r "approval?Type APPLY FIVE NEW DEV MIGRATIONS to authorize writes: "
[[ "$approval" == "APPLY FIVE NEW DEV MIGRATIONS" ]] || { print -u2 'Stopped without writes'; return 1; }
env -i PATH="$PATH" HOME="$HOME" DOTENV_CONFIG_PATH=/dev/null DIRECT_URL="$DEV_URL" \
  pnpm exec prisma migrate deploy
env -i PATH="$PATH" HOME="$HOME" DOTENV_CONFIG_PATH=/dev/null DIRECT_URL="$DEV_URL" \
  pnpm exec prisma migrate status

env -i PATH="$PATH" HOME="$HOME" DOTENV_CONFIG_PATH=/dev/null \
  DEV_NEON_TARGET_VERIFIED=YES DEV_NEON_PROJECT_ID=fragrant-hat-50630079 \
  DEV_NEON_BRANCH_ID=br-dark-brook-b4vdolwu DEV_NEON_ENDPOINT="$DEV_ENDPOINT" \
  TEST_DATABASE_URL="$DEV_URL" A1_TEST_DATABASE_URL="$DEV_URL" A1_TEST_DATABASE_VERIFIED=YES \
  A2_TEST_DATABASE_URL="$DEV_URL" A2_TEST_DATABASE_VERIFIED=YES \
  BOOKING_TEST_DATABASE_URL="$DEV_URL" BOOKING_TEST_DATABASE_VERIFIED=YES \
  A2_MEMBERSHIP_ENABLED=false BOOKING_MVP_ENABLED=false \
  pnpm exec vitest run tests/database.test.ts tests/account-database.integration.test.ts \
    tests/membership-database.integration.test.ts tests/booking-database.integration.test.ts \
    --no-file-parallelism --maxWorkers=1

test_secret="$(openssl rand -hex 32)"
env -i PATH="$PATH" HOME="$HOME" DOTENV_CONFIG_PATH=/dev/null CI=1 \
  DEV_NEON_TARGET_VERIFIED=YES DEV_NEON_PROJECT_ID=fragrant-hat-50630079 \
  DEV_NEON_BRANCH_ID=br-dark-brook-b4vdolwu DEV_NEON_ENDPOINT="$DEV_ENDPOINT" \
  DATABASE_URL="$DEV_URL" DIRECT_URL="$DEV_URL" \
  BOOKING_E2E_DATABASE_URL="$DEV_URL" BOOKING_E2E_DATABASE_VERIFIED=YES \
  NEXTAUTH_URL=http://127.0.0.1:3100 NEXTAUTH_SECRET="$test_secret" \
  A2_MEMBERSHIP_ENABLED=false BOOKING_MVP_ENABLED=true \
  pnpm exec playwright test tests/e2e/public-booking.spec.ts --project=chromium --workers=1

read -r "seed_approval?Type SEED DEV to create an optional sample owner, or press Enter to skip: "
if [[ "$seed_approval" == "SEED DEV" ]]; then
  read -r "SEED_DEV_EMAIL?Development owner email: "
  read -rs "SEED_DEV_PASSWORD?Development owner password (hidden): "; echo
  env -i PATH="$PATH" HOME="$HOME" DOTENV_CONFIG_PATH=/dev/null NODE_ENV=development \
    SEED_ALLOW_DEVELOPMENT=YES SEED_TARGET_APPROVED=YES SEED_DEV_DISPOSABLE_CONFIRMED=YES \
    SEED_DEV_EMAIL="$SEED_DEV_EMAIL" SEED_DEV_PASSWORD="$SEED_DEV_PASSWORD" \
    SEED_DEV_DATABASE_URL="$DEV_URL" SEED_NEON_API_KEY="$NEON_API_KEY" \
    SEED_NEON_PROJECT_ID=fragrant-hat-50630079 SEED_NEON_BRANCH_ID=br-dark-brook-b4vdolwu \
    SEED_NEON_BRANCH_NAME=production SEED_EXPECTED_ENDPOINT="$DEV_ENDPOINT" \
    SEED_EXPECTED_DATABASE=neondb pnpm seed:dev
fi

env -i PATH="$PATH" HOME="$HOME" DOTENV_CONFIG_PATH=/dev/null \
  DATABASE_URL="$DEV_URL" DIRECT_URL="$DEV_URL" NEXTAUTH_SECRET="$test_secret" \
  NEXTAUTH_URL=http://localhost:3000 ACCOUNT_EMAIL_PROVIDER=local \
  LOCAL_OUTBOX_ENABLED=YES LOCAL_OUTBOX_TARGET_APPROVED=YES \
  LOCAL_OUTBOX_EXPECTED_ENDPOINT="$DEV_ENDPOINT" LOCAL_OUTBOX_EXPECTED_DATABASE=neondb \
  LOCAL_OUTBOX_NEON_PROJECT_ID=fragrant-hat-50630079 \
  LOCAL_OUTBOX_NEON_BRANCH_ID=br-dark-brook-b4vdolwu LOCAL_OUTBOX_NEON_BRANCH_NAME=production \
  LOCAL_OUTBOX_NEON_API_KEY="$NEON_API_KEY" LOCAL_OUTBOX_ACCESS_TOKEN="$OUTBOX_TOKEN" \
  A2_MEMBERSHIP_ENABLED=true BOOKING_MVP_ENABLED=true \
  pnpm dev --hostname 127.0.0.1 --port 3000
```

The final `pnpm dev` runs only after migration, database, and booking browser
tests pass, from an isolated temporary copy with no repository `.env`. The
flags are enabled only in that ephemeral local process; keep them off in all
other environments until their separate release gates are reviewed. Open
`http://localhost:3000/register`. New accounts sign in immediately
and remain email-unverified by current policy; normal signup does **not** send
a verification email. `/dev/outbox` is for recovery, legacy verification, and
invitations; enter the private access token chosen above. Onboard a business
after login, then test public booking locally. The Playwright command above
exercises public booking on isolated fixtures before the local flags turn on.
If the preflight fails or public schema is not empty, stop and investigate;
never use `db push`, `migrate reset`, or an original-project URL. After stopping
the server, run `unset DEV_URL NEON_API_KEY OUTBOX_TOKEN SEED_DEV_PASSWORD
test_secret` in that Terminal session.
