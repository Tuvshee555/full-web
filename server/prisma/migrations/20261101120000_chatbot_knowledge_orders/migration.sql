-- Product facts shared by the product page and the chat assistant (all optional; existing rows unchanged).
ALTER TABLE "Product" ADD COLUMN "volume" TEXT,
ADD COLUMN "howToUse" TEXT,
ADD COLUMN "ingredientList" TEXT,
ADD COLUMN "safetyNotes" TEXT,
ADD COLUMN "faq" JSONB NOT NULL DEFAULT '[]';

-- Assistant settings: chat orders, automatic hand-back, model choice and a daily spend budget.
ALTER TABLE "ChatSettings" ADD COLUMN "chatOrdersEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "handoverAutoResumeHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN "aiModel" TEXT NOT NULL DEFAULT '',
ADD COLUMN "aiDailyBudgetUsd" DOUBLE PRECISION NOT NULL DEFAULT 5;

-- Who the customer is, why staff were asked, staff notes, and hand-over timestamps.
ALTER TABLE "ChatConversation" ADD COLUMN "customerName" TEXT,
ADD COLUMN "customerPhone" TEXT,
ADD COLUMN "notes" TEXT NOT NULL DEFAULT '',
ADD COLUMN "handoffReason" TEXT,
ADD COLUMN "handoffAt" TIMESTAMP(3),
ADD COLUMN "lastHumanAt" TIMESTAMP(3),
ADD COLUMN "botReleasedAt" TIMESTAMP(3);
CREATE INDEX "ChatConversation_customerPhone_idx" ON "ChatConversation"("customerPhone");

ALTER TABLE "ChatLead" ADD COLUMN "reason" TEXT NOT NULL DEFAULT 'customer_request',
ADD COLUMN "context" TEXT NOT NULL DEFAULT '';

CREATE TABLE "ChatFaq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL DEFAULT '',
    "answerEn" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatFaq_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChatFaq_enabled_sortOrder_idx" ON "ChatFaq"("enabled", "sortOrder");

CREATE TABLE "ChatAiUsage" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "model" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "estCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatAiUsage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChatAiUsage_day_environment_model_source_key" ON "ChatAiUsage"("day", "environment", "model", "source");
