# ADR 0001: One Next.js application

Status: accepted by the project brief. Owner: shared.

Use one App Router application with server-only services and Prisma repositories. No separate API server or React app. RSC owns canonical reads; client hooks are reserved for actual interactive data flows. This limits duplicated authorization and deployment boundaries. Tradeoff: maintain strict imports because UI/server code share one repository.
