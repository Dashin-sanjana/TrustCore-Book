# Membership

Owner: Developer A. The UI components here serve `/app/[businessId]/members` and `/invitations` without defining routes. The live, feature-gated service and transaction repository remain in `src/server/membership.ts`, `src/server/member-management.ts`, and `src/server/repositories/invitations.ts`; authorization also uses the shared membership repository. Move those boundaries only in a separately reviewed change.

The A2 invitation schema and both A2 migrations (invitations and final-owner guard) are prepared but not applied. Keep `A2_MEMBERSHIP_ENABLED` off until the target database is migrated and PostgreSQL race tests pass. `src/features/permissions` contains proposed interfaces, not an alternative membership implementation.
