# Two-developer workflow

Developer A owns platform/domain infrastructure. Developer B owns service-business workflows and UI. These are role labels, not invented GitHub identities. Replace CODEOWNERS example handles before enabling ownership requests.

## Ownership boundaries

| Owner               | Primary modules / files                                                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A                   | Authentication, users/sessions, businesses/onboarding, RBAC, settings, billing, payments, platform admin, audit, security; `src/server/repositories/identity.ts`, membership repository, Prisma and CI coordination. |
| B                   | Services/categories, staff, availability, customers, appointments UI, public booking, notifications, dashboard, analytics; feature UI and DTO adapters.                                                              |
| Shared: both review | `prisma/**`, auth/session infrastructure, membership and role contracts/policies, booking-engine interfaces, localization/DST rules and shared API result shapes.                                                    |

Repositories are currently grouped by domain in `src/server/repositories/`. Split workspace.ts only when real parallel changes justify it; agree the transaction interface before changing it. Do not import another feature's server internals from client components. Depend on reviewed contracts and service entrypoints, not generated Prisma types in UI.

## Shared gate before parallel feature work

1. Open a small contract/ADR PR for schema, auth, membership or booking interface changes. Mark downstream tasks blocked on that review rather than guessing.
2. Both developers explicitly review the design (the author plus the other developer); record approval in the PR. New scaffold interfaces currently carry **proposed** status.
3. Merge shared contracts first. Each developer rebases their feature branch and implements against the merged revision. No ad-hoc changes to a copied contract in another branch.
4. If the contract changes, stop dependent merges, update the contract PR and regenerate the clients/types once. Track the revised acceptance criteria in FEATURES.md.

## Daily branch and PR rules

- Start from the repository's configured default branch. Branch names: `codex/<short-topic>` for agent work, `feat/<module>-<topic>`, `fix/<topic>` or `docs/<topic>` for developer work.
- Keep one module or one shared contract change per PR. Preserve unrelated work; no force-push to shared/default branches. Rebase personal branches after coordinated migration merges.
- Required local checks: `pnpm verify`; use an isolated TEST_DATABASE_URL for integration tests. CI installs from the frozen pnpm lockfile.
- One independent approval before merge; both developers must participate for shared boundaries. CODEOWNERS requests reviewers but GitHub's default ownership approval means **any** listed owner, not all. Configure required review/branch rules in GitHub; this task only provides files and does not pretend repository settings are active.
- CI must pass lint, boundary checks, types, unit/component tests, schema validation, migrations/integration tests and production build. Playwright has a separate manual preparation workflow until E2E fixtures are reviewed.
- Screenshots for UI changes; negative authorization evidence for protected changes; migration SQL review for schema changes. Follow the PR template.

## Database collaboration

A is migration coordinator; B reviews shared schema and booking constraints. One schema PR merges at a time. Use separate Neon development/preview branches; never share production .env. No migration reset, production seeds or destructive schema change is permitted as routine setup. See DATABASE.md.

## Recommended first tasks

**A:** lead the joint schema/auth/membership/booking contract review; set real CODEOWNERS handles and branch protection; prepare isolated Neon branches and a migration rehearsal; then implement account/session management and reviewed membership invitations with last-owner safeguards.

**B:** review those shared contracts first; in parallel prepare UI components/tests that depend only on stable primitives; after contracts merge implement categories, staff/service assignments and working-hours/exception editors with tenant-negative tests. Slot computation and public booking remain blocked until the joint booking contract is approved.
