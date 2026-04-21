CREATE TABLE "AgentChannel" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "activeAgentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentChannel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentChannel_key_key" ON "AgentChannel"("key");

CREATE TABLE "AgentMessage" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "authorId" TEXT,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentMessage_channelId_createdAt_idx" ON "AgentMessage"("channelId", "createdAt");

ALTER TABLE "AgentMessage"
  ADD CONSTRAINT "AgentMessage_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "AgentChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentMessage"
  ADD CONSTRAINT "AgentMessage_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
