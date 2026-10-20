-- PREPARED ONLY. Apply after all earlier migrations on an independently verified test branch.
CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingRequest_businessId_idempotencyKey_key" ON "BookingRequest"("businessId", "idempotencyKey");
CREATE INDEX "BookingRequest_businessId_createdAt_idx" ON "BookingRequest"("businessId", "createdAt");

ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_businessId_appointmentId_fkey"
    FOREIGN KEY ("businessId", "appointmentId") REFERENCES "Appointment"("businessId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
