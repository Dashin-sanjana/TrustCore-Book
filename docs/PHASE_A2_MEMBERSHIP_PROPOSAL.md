# Phase A2 membership proposal

**Status: DEVELOPER A PROVISIONALLY AUTHORIZED IMPLEMENTATION - NOT JOINTLY APPROVED OR APPLIED.** The owner authorized Developer A to prepare the additive schema, migrations, and feature-gated implementation. Developer B has not approved the shared contract or migrations. `A2_MEMBERSHIP_ENABLED` defaults off; do not enable it until both A2 migrations are reviewed, applied, and verified with PostgreSQL race tests on the intended target.

The prepared invitation artifact is `prisma/migrations/20261019010000_phase_a2_invitations/migration.sql`. A second prepared, unapplied artifact, `prisma/migrations/20261019020000_phase_a2_final_owner_guard/migration.sql`, adds a row-level trigger intended to reject removal of a surviving business's final OWNER, including through the existing `User` cascade. Neither migration has touched a database. The trigger's interaction with cascade ordering, concurrent deletes, business deletion, and mixed-version traffic requires disposable-PostgreSQL verification and Developer B review before either migration is approved for deployment. Account deletion remains disabled; there is no application command for it. Unit tests with mocked transactions do not prove database locking or rollback.

## Existing boundary

- `BusinessMember` has `(businessId, userId)` uniqueness and an OWNER/ADMIN/MEMBER role, but no invitation, status, or join timestamp (`prisma/schema.prisma`, `BusinessMember`). Membership is checked from the database by `requireTenant` (`src/server/authorization.ts`).
- `src/shared/policies/permissions.ts` grants `members.manage` to OWNER and ADMIN, but `docs/ROLES_PERMISSIONS.md` and C7/AR-07 in `docs/SHARED_ARCHITECTURE_REVIEW.md` explicitly leave member administration and final-owner policy pending.
- The proposed `changeMemberRole` interface accepts ADMIN/MEMBER but has no target-role or owner invariant (`src/features/permissions/contracts.ts`). It is not a runtime endpoint.
- The email adapter now has a provisionally implemented invitation kind (`src/server/account-email.ts`), but delivery remains unverified without a configured provider.

## Proposed shared schema - requires joint approval

Add a tenant-owned invitation record with a unique digest of a cryptographically random 32-byte token, normalized invited email, intended ADMIN/MEMBER role, inviter user ID, expiry (proposed seven days), and mutually exclusive accepted/declined/revoked timestamps. Record the accepting user ID and enforce `(businessId, invitedEmail)` pending-invitation behavior through a reviewed partial unique index or explicit transaction policy. Index business/expiry and email/expiry lookups. Do not store raw tokens. Keep `Staff` scheduling profiles separate from login identities.

An invitation must be bound to a verified signed-in User whose normalized email matches the invitation. Acceptance or rejection atomically claims a pending, unexpired invitation once. Acceptance creates at most one `(businessId, userId)` membership; replay, expiry, revoked invitations, and mismatched identities fail without revealing another tenant's state. Sending requires a configured trusted transactional email provider; no success response may imply delivery when the provider is unavailable. Public request responses must not reveal whether an email is registered.

The current `User` -> `BusinessMember` cascading delete can remove the final owner. Account deletion must be prohibited or coordinated with ownership transfer before it is enabled; a database invariant/trigger option needs review.

## Proposed role and concurrency policy - requires joint approval

- OWNER may invite ADMIN or MEMBER and change/remove non-owner members. ADMIN may invite MEMBER and manage MEMBER only; ADMIN cannot grant ADMIN or target an OWNER. MEMBER cannot administer membership. Platform admin has no implicit tenant membership.
- An OWNER cannot be demoted or removed through an ordinary member command. A separate owner-only transfer must promote a verified recipient and change the former owner's role atomically, preserving at least one OWNER.
- Mutations resolve actor and target under the same business ID, recheck the actor's current role inside the transaction, and serialize owner-affecting changes by locking the business row before membership rows. Deny stale or foreign IDs without disclosing foreign membership. Audit every committed change. A current membership lookup on each protected request removes tenant access immediately after removal; global session revocation on role change remains a joint decision.
- Invitation acceptance must recheck inviter/tenant policy at redemption if the inviter has lost permission, or explicitly adopt a reviewed policy that invitations survive inviter departure. This remains open.

## Implementable before approval

A manager-only, tenant-filtered member directory can use the existing schema and existing `members.manage` permission. It is read-only, bounded, and exposes only member name, email, and role. It must not advertise invitation, role-change, or removal controls as functional. No Developer B feature module or shared contract needs modification for that view.

The read-only directory is implemented at `src/app/app/[businessId]/members/page.tsx`, backed by `src/server/member-management.ts` and `src/server/repositories/membership.ts`. It is not a member-administration mutation or an invitation workflow.

## Approval and release gates

Developer A proposes the invitation schema, delivery contract, transaction design, and negative tests; Developer B reviews role impacts, tenant UI integration, and final-owner/booking consequences. Record both approvals before schema edits or member mutations. Rehearse any forward migration only on a verified disposable database. Required tests include cross-tenant IDs, ADMIN escalation attempts, MEMBER denial, mismatched invite email, expiry/replay/concurrent redemption, final-owner races, transfer rollback, membership removal on the next protected request, and provider failure. Database-backed tests remain mandatory before release.
