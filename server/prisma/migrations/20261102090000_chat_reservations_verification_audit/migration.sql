-- Approved default model (held-out comparison, docs/chatbot/MODEL_EVAL.md): the stored choice names it explicitly.
ALTER TABLE "ChatSettings" ALTER COLUMN "aiModel" SET DEFAULT 'gpt-4.1-mini';
UPDATE "ChatSettings" SET "aiModel" = 'gpt-4.1-mini' WHERE "aiModel" = '';

-- Chat order reservation policy (owner-configurable; defaults approved on 2026-11-02).
ALTER TABLE "ChatSettings" ADD COLUMN "chatReservationMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN "chatMaxActiveReservationsPerPhone" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "chatMaxQuantityPerItem" INTEGER NOT NULL DEFAULT 5;

-- Per-order payment deadline and expiry record; existing rows keep NULL (their payment method's default window applies).
ALTER TABLE "Order" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'web',
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "expiredAt" TIMESTAMP(3);
CREATE INDEX "Order_status_expiresAt_idx" ON "Order"("status", "expiresAt");
CREATE INDEX "Order_phone_status_idx" ON "Order"("phone", "status");
-- Orders the assistant created so far carry the note it wrote; mark them so the limits and the admin recognise them.
UPDATE "Order" SET "source" = 'chat' WHERE "notes" IN ('Чатаар захиалсан', 'Ordered in the website chat');

-- Product facts: storage, usage frequency and the owner's verification map (all optional; existing rows unchanged).
ALTER TABLE "Product" ADD COLUMN "storage" TEXT,
ADD COLUMN "usageFrequency" TEXT,
ADD COLUMN "verifiedFacts" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "ChatAuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChatAuditLog_createdAt_idx" ON "ChatAuditLog"("createdAt");
CREATE INDEX "ChatAuditLog_action_createdAt_idx" ON "ChatAuditLog"("action", "createdAt");

CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'request',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "JobRun_name_startedAt_idx" ON "JobRun"("name", "startedAt");
