# Recommended development order

This pass is **Phase 0 only**. Earlier bounded Phase 1 functionality is preserved. The phase labels below describe future work and do not authorize implementing it now.

1. **Review gate:** A leads and B reviews schema/migrations, identity/session, membership/RBAC and booking/DST/idempotency contracts. Confirm priorities and ADR status. Enable real repository review rules; provision isolated development branches.
2. **Independent foundations:** A prepares user/session management, invitations and role guardrails. B prepares category UI, service editing and staff/service assignment. Both use the merged contracts and existing tenant repositories; neither implements booking yet.
3. **Scheduling prerequisites:** B implements recurring availability and schedule exceptions. A reviews persistence/invariants. Define bounded date windows, local business-day rules and explicit DST policies with tests.
4. **Booking engine:** joint reviewed implementation of read-only slots, then transactional/idempotent booking creation and state transitions. Race tests must prove one winner, replay equivalence, cross-tenant rejection and no unavailable-slot commits.
5. **Public portal and notifications:** B builds real selection/confirmation flow against the reviewed booking service; add abuse controls and an outbox before external reminder delivery. No fake confirmation screens.
6. **Operations and reporting:** audit viewer, account cleanup/retention, monitored errors and real tenant analytics. Verify backups and restore procedures.
7. **Commercial integrations:** A chooses payment/subscription providers per supported market only after requirements review. Verify signatures, idempotency, authoritative amount/currency and entitlement enforcement before connecting checkout.
8. **Release gate:** end-to-end tests on isolated Neon preview branch, accessibility/responsive verification, production environment validation and explicit approval before production deployment.

MVP priority includes identity, tenants/permissions, catalog/staff/customers, schedules/booking, public portal, essential reminders, dashboard, admin/security/audit and localization. Analytics, subscriptions and payment integrations are later modules until market and commercial requirements are approved. See FEATURES.md for per-module acceptance and dependencies.
