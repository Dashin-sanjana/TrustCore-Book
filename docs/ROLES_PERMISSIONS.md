# Roles and permissions

Current policy primitives live in `src/shared/policies/permissions.ts`; database verification is centralized in `src/server/authorization.ts`. A pure policy function is not authentication.

| Operation                         | OWNER                      | ADMIN                            | MEMBER                     | Platform admin                       |
| --------------------------------- | -------------------------- | -------------------------------- | -------------------------- | ------------------------------------ |
| Read tenant workspace/directories | Yes                        | Yes                              | Yes                        | Only with tenant membership          |
| Create services/staff/customers   | Yes                        | Yes                              | No                         | Only with manager membership         |
| Update business settings          | Yes                        | Yes                              | No                         | Only with manager membership         |
| Member administration (planned)   | Proposed yes               | Proposed yes, cannot grant owner | No                         | No implicit bypass                   |
| Ownership transfer (planned)      | Proposed yes               | No                               | No                         | No implicit bypass                   |
| Platform overview                 | Only if platformAdmin flag | Only if platformAdmin flag       | Only if platformAdmin flag | Explicitly provisioned flag required |
| Own sessions/profile (planned UI) | Own account                | Own account                      | Own account                | Own account                          |

`requireUser` checks Auth.js session and current revocation/expiry, returning a safe user projection. `requireTenant` then looks up `(businessId,userId)` and optionally requires manager permission. It creates the branded TenantContext used by repositories. New services must call it themselves even if their route/layout already did.

Never infer tenant role from a JWT, request header, URL alone, hidden form field or middleware. Sessions contain identity, not trusted cached membership. Platform status is checked from the database and does not bypass membership on business writes. A valid ID belonging to another tenant is still unauthorized.

Member invitations, role changes, final-owner protection and ownership transfer remain **Not implemented**. The simple role policy matrix is preparation, not a completed membership workflow. Before implementation both developers must agree on last-owner constraints, invitation expiry, audit requirements and tests for role escalation and cross-tenant identifiers.
