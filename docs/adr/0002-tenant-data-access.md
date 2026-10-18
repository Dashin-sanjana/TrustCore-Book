# ADR 0002: Tenant-scoped repositories

Status: implemented foundation; both-developer review required before new dependent features. Owner: shared.

Derive a branded TenantContext only after current session and membership checks. Tenant repositories use that context in filters and transactional audit writes. Keep identity/public/platform/operational exceptions narrow and documented. Composite foreign keys reinforce tenant integrity. RLS is not enabled; services and repository discipline are the isolation boundary. Boundary checks supplement review.
