-- PREPARED - PROVISIONALLY AUTHORIZED BY DEVELOPER A; NOT JOINTLY APPROVED OR APPLIED.
-- Additive invitation storage. Apply only after coordinated review and rehearsal.
BEGIN;

CREATE TABLE "BusinessInvitation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "tokenDigest" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "declinedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessInvitation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BusinessInvitation_terminal_state_check" CHECK (
      (CASE WHEN "acceptedAt" IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN "declinedAt" IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN "revokedAt" IS NOT NULL THEN 1 ELSE 0 END) <= 1
    ),
    CONSTRAINT "BusinessInvitation_role_check" CHECK ("role" IN ('ADMIN', 'MEMBER'))
);

CREATE UNIQUE INDEX "BusinessInvitation_tokenDigest_key" ON "BusinessInvitation"("tokenDigest");
CREATE INDEX "BusinessInvitation_businessId_expiresAt_idx" ON "BusinessInvitation"("businessId", "expiresAt");
CREATE INDEX "BusinessInvitation_businessId_invitedEmail_expiresAt_idx" ON "BusinessInvitation"("businessId", "invitedEmail", "expiresAt");
CREATE INDEX "BusinessInvitation_invitedById_idx" ON "BusinessInvitation"("invitedById");
CREATE INDEX "BusinessInvitation_acceptedById_idx" ON "BusinessInvitation"("acceptedById");
CREATE UNIQUE INDEX "BusinessInvitation_pending_email_key" ON "BusinessInvitation"("businessId", "invitedEmail")
  WHERE "acceptedAt" IS NULL AND "declinedAt" IS NULL AND "revokedAt" IS NULL;

ALTER TABLE "BusinessInvitation" ADD CONSTRAINT "BusinessInvitation_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessInvitation" ADD CONSTRAINT "BusinessInvitation_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessInvitation" ADD CONSTRAINT "BusinessInvitation_acceptedById_fkey"
  FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
