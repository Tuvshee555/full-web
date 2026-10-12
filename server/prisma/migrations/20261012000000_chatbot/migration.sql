-- CreateTable
CREATE TABLE "ChatSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metaOutbound" BOOLEAN NOT NULL DEFAULT false,
    "greetingMn" TEXT NOT NULL DEFAULT 'Сайн байна уу! Lorentz-ийн бүтээгдэхүүн, хүргэлт, захиалгын талаар асуугаарай.',
    "greetingEn" TEXT NOT NULL DEFAULT 'Hello! Ask about Lorentz products, delivery or your order.',
    "handoffMn" TEXT NOT NULL DEFAULT 'Таны хүсэлтийг ажилтанд хадгаллаа. Нэр, холбогдох утсаа үлдээнэ үү.',
    "handoffEn" TEXT NOT NULL DEFAULT 'Your request has been saved for our team. Please leave your name and phone number.',
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "showExactStock" BOOLEAN NOT NULL DEFAULT false,
    "extraKnowledgeMn" TEXT NOT NULL DEFAULT '',
    "extraKnowledgeEn" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'website',
    "externalId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'mn',
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "needsHuman" BOOLEAN NOT NULL DEFAULT false,
    "unread" INTEGER NOT NULL DEFAULT 0,
    "state" JSONB NOT NULL DEFAULT '{}',
    "leaseUntil" TIMESTAMP(3),
    "leaseOwner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "clientMessageId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "deliveryStatus" TEXT NOT NULL DEFAULT 'local',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatLead" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "question" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatErrorLog" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "code" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRateBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatRateBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ChatWebhookEvent" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatConversation_updatedAt_idx" ON "ChatConversation"("updatedAt");

-- CreateIndex
CREATE INDEX "ChatConversation_needsHuman_updatedAt_idx" ON "ChatConversation"("needsHuman", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatConversation_channel_externalId_key" ON "ChatConversation"("channel", "externalId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_conversationId_clientMessageId_key" ON "ChatMessage"("conversationId", "clientMessageId");

-- CreateIndex
CREATE INDEX "ChatLead_status_createdAt_idx" ON "ChatLead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ChatLead_conversationId_idx" ON "ChatLead"("conversationId");

-- CreateIndex
CREATE INDEX "ChatErrorLog_createdAt_idx" ON "ChatErrorLog"("createdAt");

-- CreateIndex
CREATE INDEX "ChatRateBucket_expiresAt_idx" ON "ChatRateBucket"("expiresAt");

-- CreateIndex
CREATE INDEX "ChatWebhookEvent_createdAt_idx" ON "ChatWebhookEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatLead" ADD CONSTRAINT "ChatLead_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatWebhookEvent" ADD CONSTRAINT "ChatWebhookEvent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
