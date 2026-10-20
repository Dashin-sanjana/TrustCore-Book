# Phase A1 rate-limit security follow-up

**Status:** Local implementation and unresolved shared decisions. Developer B approval has not been recorded; this is not a release authorization.

## Implemented locally

- Canonical Auth.js `POST /api/auth/signout` and `POST /api/auth/session` use separate 30/minute buckets per server-verified JWT session ID. Requests without a verified session use separate 200/minute anonymous buckets. Sign-out does not consume the sign-in/callback quota. Auth.js still owns CSRF validation and cookie cleanup.
- Sign-out revocation conditionally updates only an existing unrevoked `RefreshSession` row. Replays remain requests and database queries, but do not repeatedly change the revoked row. User-facing revoke-one and revoke-all operations scope writes to the authenticated user.
- Route-level quota errors return 429; route-level rate-store failures return 503. Auth.js v4 catches errors from Credentials `authorize` and responds with its native 401 redirect. Those downstream errors are now converted to fixed safe messages before Auth.js can place them in a redirect URL. Do not advertise uniform 429/503 for all credential failures.

## Unresolved before public release

1. **Trusted client identity:** No deployment-verified client identifier is configured. Arbitrary forwarded headers are not trustworthy. Credential callbacks and initial sign-in retain global emergency ceilings, so a malicious client can exhaust a shared bucket. Removing the ceiling without an independent trusted-client control would permit unbounded account rotation and expensive bcrypt work.
2. **Targeted account lockout:** The existing normalized-email quota can be exhausted by someone who knows a victim's email. A trusted-client plus account composite policy, monitoring, and recovery path require joint review. Per-account limits alone do not establish brute-force protection without lockout risk.
3. **Sign-out resource budget:** A verified session has an independent quota, but many attacker-owned sessions can still create aggregate load. Anonymous requests share a bounded sign-out bucket. Deployment-edge request/body-size limits, capacity monitoring, and a verified-client policy remain necessary. Quota exhaustion for one signed session may delay that same session's server-side logout; the client should still clear its local cookie. An attacker cannot exhaust another user's signed-session bucket without that user's signed token, which would already constitute session compromise.
4. **Integration evidence:** Unit tests model the conditional Prisma update and exercise real Auth.js core CSRF, but no disposable PostgreSQL or running Next.js HTTP integration was used. Rehearse concurrent conditional updates, cookie clearing, rate-store failure, normalized paths, and credential redirects against isolated infrastructure before release.

No shared RBAC/API contract or Prisma schema change is proposed by this follow-up. Any trusted-edge configuration and final thresholds should be reviewed by Developer A and Developer B under `docs/TEAM_WORKFLOW.md` and `docs/PHASE_A1_AUTH_DECISIONS.md` decision 6.
