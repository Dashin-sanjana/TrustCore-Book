# ADR 0005: Shared review gate for a two-developer team

Status: required by the project brief. Owners: A and B.

Schema, authentication infrastructure, membership/RBAC and booking interfaces must be reviewed before dependent feature work. The author and other developer both participate explicitly; merge contracts first, rebase dependents afterward. CODEOWNERS is a reviewer-routing example, not proof that both-owner approval is enforced by GitHub. Configure real handles, required reviews and CI status rules outside this scaffold.
