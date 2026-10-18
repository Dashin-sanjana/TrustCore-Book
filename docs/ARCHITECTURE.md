# TrustCore Book architecture

TrustCore Labs maintains one Next.js App Router application, using strict TypeScript and server rendering. Phase 0 adds team boundaries around the pre-existing Phase 1 workflows. Existing functionality is preserved, not presented as newly delivered Phase 0 features. No new booking operation or deployment is included.

## Layers

```text
app routes / server actions / route handlers
            ↓
server-only application services (authentication + policy checks + validation)
            ↓
server-only repositories (Prisma queries + transactional writes)
            ↓
Prisma 7 → Neon PostgreSQL

Client components → UI / browser hooks / transport-safe contracts
Client mutations → server actions; no Prisma or secret imports
```

- `src/app/`: composition, navigation and HTTP adaptation. The existing `/app` route subtree is the authenticated workspace, not a second React app. `/admin` has a separate platform permission check. Every tenant page/service checks current membership; layouts are supplementary.
- `src/components/ui/`: owned shadcn-style Radix primitives. `components.json` configures additions. Shared shells, forms and tables live in `src/components/`.
- `src/hooks/`: browser-only shared hooks. Feature hooks belong in `src/features/<module>/hooks/` when implemented; do not create placeholder hooks that claim successful mutations.
- `src/features/<module>/contracts.ts`: Zod requests/responses and DTO types. `server/service.ts` defines the proposed server interface. Each module README defines owner, dependencies and acceptance.
- `src/server/actions.ts`: thin Next.js transport wrappers. `services.ts` and `queries.ts` preserve the existing application workflows. Feature interfaces are extension targets, not a claim that the legacy functions conform to the new envelope.
- `src/server/repositories/`: all Prisma access. Tenant operations require a branded `TenantContext` created inside `requireTenant`, not an object deserialized from a client. Identity, public projections, platform aggregates and operational health/rate limits have explicit narrow exceptions documented in SECURITY.md.
- `src/shared/contracts/`: transport-safe primitives/results; `shared/policies/`: pure role decisions; `shared/api/`: versioned HTTP result adapter.

## Data and cache ownership

RSC services own canonical reads; TanStack Query is available for real client data flows and is not used to duplicate RSC caches. TanStack Table owns client-side sorting/filtering/pagination over bounded directory snapshots. Customer and appointment reads currently cap at 100 records. Server pagination is future work. React Hook Form and Zod handle auth/onboarding forms; every mutation also validates on the server.

No domain data is held in module globals. The Prisma client is reused per process. No browser DTO includes password hashes, connection URLs or session secrets. The theme provider persists only a local appearance preference and supports light, dark and system settings.

## Cross-cutting decisions

Auth.js v4 Credentials uses encrypted JWT cookies plus absolute eight-hour database revocation records. It does not use an OAuth database adapter: the custom user schema is a credentials schema. Adding OAuth/accounts requires a separately reviewed schema and adapter decision; do not attach a PrismaAdapter expecting nonexistent Account/Session tables.

Tenant membership is the authority. Platform admin does not imply tenant mutation permission. UTC `timestamptz` instants and business IANA timezones are retained. SQL composite foreign keys and an exclusion constraint provide database integrity and overlap protection; no slot engine exists yet.

`pnpm check:boundaries` checks repository-only Prisma imports and direct client/server boundary imports in CI. It supplements Next.js `server-only` enforcement; it is not a complete transitive security analyzer or substitute for review.

## Shared review gate

Schema/migrations, authentication, membership/RBAC and booking contracts require both developers' review before downstream modules depend on changes. New module service interfaces are **proposed** until that review. Runtime scaffolding has no fake implementation. See FEATURES.md, TEAM_WORKFLOW.md and ADRs.

The former architecture notes are preserved in `docs/history/PHASE1_ARCHITECTURE.md`.

## References

- [Next.js data security](https://nextjs.org/docs/app/guides/data-security)
- [Prisma driver configuration](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)
- [Auth.js v4](https://next-auth.js.org/)
