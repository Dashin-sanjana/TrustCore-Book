-- SUPERSEDED REFERENCE ONLY - DO NOT APPLY.
-- Canonical prepared migration: prisma/migrations/20261018010000_phase_a1_identity/migration.sql
-- Retained for proposal history; Developer A and Developer B approval is still required.
ALTER TABLE "User"
  ADD COLUMN "emailVerificationRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "emailVerifiedAt" TIMESTAMPTZ(3),
  ADD COLUMN "credentialVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "RefreshSession"
  ADD COLUMN "credentialVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "AccountTokenPurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

CREATE TABLE "AccountSecurityToken" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "purpose" "AccountTokenPurpose" NOT NULL,
  "digest" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "consumedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AccountSecurityToken_userId_purpose_expiresAt_idx"
  ON "AccountSecurityToken" ("userId", "purpose", "expiresAt");
