# Local integration modes

TrustCore Book does not need an email, SMS, or payment vendor to register,
sign in, onboard a business, or exercise public booking. New accounts can sign
in with their password immediately; their email address remains unverified.
Email-based recovery, legacy verification, and invitations still need a
configured delivery provider. Production delivery fails closed when none is
configured. No migration is introduced by the local outbox.

## Disposable development mode

For the new separate development project whose default branch is named
`production` and database is `neondb`, follow
`docs/SEPARATE_DEV_PROJECT.md`. The exact project/branch pair is a narrow
exception to the ordinary disposable-child-branch naming rule; the original
production project is never accepted. The separate project's endpoint and
empty schema must still be independently checked before any migration.

1. Independently verify a disposable Neon **branch**, direct endpoint, database,
   expiration, and database role in Neon. Do not infer branch identity from a
   database name or connection-string hostname alone. Apply required migrations
   only under the separate migration approval procedure. This guide does not
   authorize migrations or database writes.
2. Run the Next.js development server bound to `127.0.0.1`. Set
   `NEXTAUTH_URL=http://localhost:3000` and browse from that same localhost
   origin. Do not expose the local outbox over a LAN or tunnel.
3. Set `DATABASE_URL` to the verified **direct** Neon endpoint with
   `sslmode=verify-full`; if `DIRECT_URL` is present it must target the same
   endpoint and database. Set `ACCOUNT_EMAIL_PROVIDER=local`,
   `LOCAL_OUTBOX_ENABLED=YES`, and `LOCAL_OUTBOX_TARGET_APPROVED=YES` only after
   verification. Supply the exact `LOCAL_OUTBOX_EXPECTED_ENDPOINT`,
   `LOCAL_OUTBOX_EXPECTED_DATABASE`, `LOCAL_OUTBOX_NEON_PROJECT_ID`,
   `LOCAL_OUTBOX_NEON_BRANCH_ID`, and `LOCAL_OUTBOX_NEON_BRANCH_NAME`.
4. Supply a Neon API key with read access to branch/endpoint metadata as
   `LOCAL_OUTBOX_NEON_API_KEY`. This is database-target verification, **not** an
   email gateway credential. Generate a fresh 32-byte random base64url value
   for `LOCAL_OUTBOX_ACCESS_TOKEN`; keep it private. Optionally set
   `LOCAL_OUTBOX_DIR` to an absolute directory outside the repository, owned by
   the current user. The default is `~/.trustcore-book/outbox`.
5. Restart the dev server. Registration at `/register` does not use the outbox
   and attempts to sign in immediately. The local adapter checks live Neon
   metadata, `current_database()`, and the initial/A1 migration history only
   when an email-based operation needs delivery. Open
   `http://localhost:3000/dev/outbox` and enter the developer access token to
   inspect recovery, legacy verification, or invitation links. Invitation
   features still require their own approved A2 migrations and feature flag.

The outbox stores encrypted messages in mode-600 local files inside a mode-700
directory. The database stores only token digests. Verification links expire
after 60 minutes, reset links after 30 minutes, and invitations after seven
days under the existing contract. Expired outbox entries are deleted when the
viewer reads them. The access token is entered into the viewer, kept only in
browser memory, and sent in an Authorization header, never a URL. Outbox
responses are private and `no-store`.

The route and provider return unavailable outside `NODE_ENV=development`,
without exact localhost origin/host, without the developer access token, or
when live branch/database verification fails. A configured local provider is
not proof of delivery: a message is marked delivered only after the encrypted
file is written. Account creation does not send email; email addresses are
never automatically marked verified.

### Account email delivery is unavailable

This message applies to email-based recovery, legacy verification, or
invitations when the provider is unconfigured or its preflight cannot verify
the target. Registration no longer requires delivery. Check the variable
names and settings in `.env.example` against steps 1-4 above without sharing
their values. `ACCOUNT_EMAIL_PROVIDER=local` does not enable the outbox by
itself: both `LOCAL_OUTBOX_*` approval gates, a direct `DATABASE_URL` with
`sslmode=verify-full`, matching endpoint/database metadata, the Neon metadata
API key, a valid access token, and `NODE_ENV=development` are required.
`NEXTAUTH_URL` must be the same exact localhost origin used in the browser.
Restart `pnpm dev` after changing local environment settings.

If all settings are present but an email-based operation still fails, confirm that the
disposable branch has not expired, the metadata key can read that project, and
the initial/A1 migrations are recorded as finished. Do not switch to a shared
database to make email delivery pass.

The public booking flow does not require a notification or payment gateway.
Booking notification and payment provider contracts default to unavailable;
they must not claim delivery or payment. Enable `BOOKING_MVP_ENABLED` only
after its separate disposable-database migration, tests, and browser gates.

## Production mode

Never set `ACCOUNT_EMAIL_PROVIDER=local` or any `LOCAL_OUTBOX_*` setting in
production. Configure the existing `resend` or `gateway` account-email adapter
with a trusted sender and HTTPS `NEXTAUTH_URL` before enabling recovery or
invitations. Registration and password sign-in work without it, but an
unverified email is not proof of address ownership. Do not replace this with
automatic verification or a success-only mock. Payments are not part of the
current booking MVP.
