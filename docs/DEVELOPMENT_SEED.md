# Disposable development seed

For the separate `trustcore-book-dev` project, use the guarded procedure in
`docs/SEPARATE_DEV_PROJECT.md`. The older branch-specific command below is
not valid for that project's default `production` branch or `neondb` database.

`pnpm seed:dev` creates one verified credentials user, an OWNER membership,
and a Development Studio with a Consultation service, Sample Staff, and
Monday-Friday 09:00-17:00 Asia/Colombo hours. It does not create appointments
or customers. No credential is stored in this repository or printed.

The seed is deliberately unavailable on an unverified database. It requires
`SEED_ALLOW_DEVELOPMENT=YES`, `SEED_TARGET_APPROVED=YES`,
`SEED_DEV_DISPOSABLE_CONFIRMED=YES`, `NODE_ENV=development`, and an isolated
environment with `DOTENV_CONFIG_PATH=/dev/null`. It refuses inherited
`DATABASE_URL`/`DIRECT_URL`, non-Neon or pooled hosts, non-`_dev`/`_test`
databases, weak TLS settings, default/protected branches, mismatched live Neon
project/branch/endpoint metadata, and incomplete or failed migration history.
The exact separate `trustcore-book-dev` project/branch pair is the sole
exception to the database-name and default-branch rules; live metadata and
all other gates remain mandatory.
All five initial, A1, A2, and booking migrations must already be
applied. **This command never migrates.**

The following is an example for the previously identified disposable test
branch. Independently confirm its current project, branch ID/name, endpoint,
database, expiration/disposability, and database role in Neon before setting
the approval flags. A branch that has expired or changed endpoints must not be
used. The code verifies current metadata again. The direct credential file
must be outside the repository, owned by you, mode 600, and contain a URL with
`sslmode=verify-full`. Use a separate disposable development branch if you do
not want the persistent fixture in the migration-test branch.

```zsh
cd "/Users/dashinsanjana/Desktop/company website/TrustCore-Book"
(
  set +x
  set -euo pipefail
  credential_file="$HOME/.trustcore-a1-test-direct-url"
  [[ -f "$credential_file" && ! -L "$credential_file" &&
     "$(stat -f %Lp "$credential_file")" == "600" &&
     "$(stat -f %Su "$credential_file")" == "$USER" ]]
  IFS= read -r SEED_DEV_DATABASE_URL < "$credential_file"
  read -r "SEED_DEV_EMAIL?Development login email: "
  read -rs "SEED_DEV_PASSWORD?Development login password: "; echo
  read -rs "SEED_NEON_API_KEY?Neon API key: "; echo
  env -i PATH="$PATH" HOME="$HOME" DOTENV_CONFIG_PATH=/dev/null \
    NODE_ENV=development SEED_ALLOW_DEVELOPMENT=YES \
    SEED_TARGET_APPROVED=YES SEED_DEV_DISPOSABLE_CONFIRMED=YES \
    SEED_DEV_EMAIL="$SEED_DEV_EMAIL" SEED_DEV_PASSWORD="$SEED_DEV_PASSWORD" \
    SEED_DEV_DATABASE_URL="$SEED_DEV_DATABASE_URL" \
    SEED_NEON_API_KEY="$SEED_NEON_API_KEY" \
    SEED_NEON_PROJECT_ID=quiet-mouse-55892784 \
    SEED_NEON_BRANCH_ID=br-late-sunset-b5k5go82 \
    SEED_NEON_BRANCH_NAME=trustcore-book-a1-test \
    SEED_EXPECTED_ENDPOINT=ep-wild-cloud-b52apabm.c-7.us-east-2.aws.neon.tech \
    SEED_EXPECTED_DATABASE=trustcore_book_a1_test \
    pnpm seed:dev
)
```

The supplied password must meet the registration rule: 12-72 characters and
at most 72 UTF-8 bytes. The account's password is bcrypt-hashed with the same
cost as normal registration. A repeat with the same email/password checks the
seed marker and complete fixture and makes no changes. A different password,
an unrelated account with the same email, or a damaged/modified seed fixture
causes a refusal; the seed never overwrites real accounts or roles.

After success, run the app against **that same verified database** and visit
`/login` (normally `http://localhost:3000/login`). The seeded email is verified
only in this disposable database; no email provider is needed for this seed.
`A2_MEMBERSHIP_ENABLED` and `BOOKING_MVP_ENABLED` remain off until their
separate database/browser release gates pass. Never copy this fixture into
production or run the seed against a shared database.
