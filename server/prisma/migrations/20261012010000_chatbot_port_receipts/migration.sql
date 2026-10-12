ALTER TABLE "ChatWebhookEvent" ADD COLUMN "leaseOwner" TEXT,
ADD COLUMN "leaseUntil" TIMESTAMP(3),
ADD COLUMN "payload" JSONB NOT NULL DEFAULT '{}';
CREATE INDEX "ChatWebhookEvent_completed_createdAt_idx" ON "ChatWebhookEvent"("completed", "createdAt");
ALTER TABLE "ChatErrorLog" ADD COLUMN "level" TEXT NOT NULL DEFAULT 'error',
ADD COLUMN "details" JSONB NOT NULL DEFAULT '{}';
