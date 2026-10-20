-- PREPARED - NOT APPROVED OR APPLIED.
-- Phase A1 identity expansion. Developer A and Developer B must approve before rehearsal.
-- Generated from an offline Prisma schema-to-schema diff; PostgreSQL transaction added.
BEGIN;

-- CreateEnum
CREATE TYPE "AccountTokenPurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "credentialVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailVerificationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailVerifiedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "RefreshSession" ADD COLUMN     "credentialVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AccountSecurityToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "AccountTokenPurpose" NOT NULL,
    "digest" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountSecurityToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountSecurityToken_digest_key" ON "AccountSecurityToken"("digest");

-- CreateIndex
CREATE INDEX "AccountSecurityToken_userId_purpose_expiresAt_idx" ON "AccountSecurityToken"("userId", "purpose", "expiresAt");

-- AddForeignKey
ALTER TABLE "AccountSecurityToken" ADD CONSTRAINT "AccountSecurityToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
