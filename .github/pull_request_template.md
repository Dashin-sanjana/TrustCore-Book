## Problem and resulting behavior

Describe the concrete trigger and final behavior. Identify the module and acceptance criteria from FEATURES.md.

## Scope / ownership

- Owner: A / B / Shared
- Contract status and downstream dependencies:
- [ ] Preserves unrelated work; no fake data or unimplemented success.
- [ ] Shared schema/auth/membership/booking contracts reviewed by both developers before downstream use (or not applicable).

## Verification

- [ ] `pnpm verify` passes.
- [ ] Negative authorization tests included where applicable.
- [ ] UI screenshot/accessibility evidence where applicable.
- [ ] Migration SQL reviewed; empty/upgrade paths tested; no destructive change (or not applicable).
- [ ] No credentials, `.env`, production seeds or generated artifacts included.

## Operational notes

State migration order, environment changes and remaining verification. Production deployment requires explicit approval.
