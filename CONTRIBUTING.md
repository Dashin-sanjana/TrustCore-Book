# Contributing to TrustCore Book

Read [architecture](docs/ARCHITECTURE.md), [module ownership](docs/TEAM_WORKFLOW.md), [feature acceptance](docs/FEATURES.md) and [security](docs/SECURITY.md) before editing.

```sh
pnpm install --frozen-lockfile
cp .env.example .env # only if no local environment exists
# Fill local-only secrets and use your own isolated Neon development branch.
pnpm dev
pnpm verify
```

Do not overwrite an existing .env. Use supported Node 22.18+; pnpm is pinned in package.json. Prisma Client generates after installation. The live project already has its initial migration; coordinate all future schema work.

Small PRs should include a concrete problem, behavior, acceptance evidence and tests. Use the PR template and ownership rules. Both developers must review shared schema/auth/membership/booking contracts **before** dependent features use them. New service interfaces are proposed; do not silently implement against an unreviewed contract.

Add real feature hooks only when needed. Route handlers/actions adapt transport; services own business rules; repositories own Prisma. Never put Prisma in browser code, fake success in a stub, production secrets in Git, or generated/seed customer data in UI examples.

`pnpm format` formats sources; `pnpm format:check` verifies formatting; `pnpm test:watch` runs local units/components. Playwright preparation: `pnpm exec playwright install chromium`, then `pnpm test:e2e`. Authenticated E2E mutations require reviewed isolated fixtures; public smoke tests are read-only. See DATABASE.md for integration setup and migration rules.
