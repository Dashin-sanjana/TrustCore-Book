# Phase 1 architecture decisions

- One Next.js application. RSC handles protected reads; server actions handle mutations. Browser forms never access Prisma or secrets.
- Auth.js v4 is pinned because it is the stable next-auth release; its Next 16 route adapter awaits dynamic route parameters.
- Prisma 7 is pinned to a stable release. `DIRECT_URL` is CLI-only; PrismaPg uses pooled `DATABASE_URL` in the server runtime.
- All business-owned joins include the business ID. Denied tenant reads return not found. Authorization checks current membership after session revocation validation on each operation.
- No implicit tenant cookie or untrusted client role. Business IDs in route/action arguments are authorized before access.
- Only explicitly projected public service fields leave the server. Decimal values serialize as formatted strings.
- PostgreSQL constraints are the final concurrency boundary. Future booking services must treat exclusion violations as conflicts and must not use check-then-insert without a constraint.
- Distributed rate limiting uses a dedicated extra table rather than per-process memory. Global limits are intentionally conservative and should be paired with production edge throttling.
- TanStack Query is provided for future client data flows; current canonical reads use RSC, avoiding duplicated caches. TanStack Table provides real search, sort and local pagination. Auth and onboarding forms use React Hook Form/Zod. Primitives follow shadcn/ui patterns and are owned in `src/components/ui`.
- No placeholder bookings, fabricated reports or seed customer data. Setup counts are queried directly from PostgreSQL.

## References

- [Prisma 7 configuration](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)
- [Prisma PostgreSQL driver adapters](https://docs.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers)
- [Stable Auth.js v4 documentation](https://next-auth.js.org/)
