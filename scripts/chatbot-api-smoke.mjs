import dotenv from "dotenv";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
dotenv.config({ path: [".env.local", ".env"], quiet: true });
const { prisma } = await import("../server/utils/prisma.js");
const base = process.env.CHATBOT_SMOKE_URL || "http://localhost:3000";
let session;
try {
  for (const path of ["/mn", "/en", "/api/food"]) assert.equal((await fetch(base + path)).status, 200, path);
  let response = await fetch(base + "/api/chat/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: "en" }) });
  assert.equal(response.status, 201); session = await response.json();
  const url = `${base}/api/chat/conversations/${session.conversationId}`;
  assert.equal((await fetch(url)).status, 404, "Transcript requires capability token");
  const headers = { "Content-Type": "application/json", "X-Chat-Token": session.token };
  const id = randomUUID();
  for (let i = 0; i < 2; i++) {
    response = await fetch(url + "/messages", { method: "POST", headers, body: JSON.stringify({ text: "What products do you sell?", clientMessageId: id, locale: "en" }) });
    assert.equal(response.status, 200);
  }
  assert.equal(await prisma.chatMessage.count({ where: { conversationId: session.conversationId, role: "customer" } }), 1, "Duplicate POST is idempotent");
  await prisma.chatConversation.update({ where: { id: session.conversationId }, data: { paused: true } });
  await prisma.chatMessage.create({ data: { conversationId: session.conversationId, role: "human", text: "Test human reply" } });
  response = await fetch(url, { headers });
  const polled = await response.json();
  assert.ok(polled.paused);
  assert.ok(polled.messages.some((m) => m.role === "human" && m.text === "Test human reply"));
  response = await fetch(url + "/messages", { method: "POST", headers, body: JSON.stringify({ text: "Thanks", clientMessageId: randomUUID() }) });
  const paused = await response.json();
  assert.equal(paused.messages.filter((m) => m.role === "assistant").length, polled.messages.filter((m) => m.role === "assistant").length, "Takeover stops automated replies");
  console.log("HTTP storefront, capability privacy, idempotency, human polling and takeover: PASS");
} finally {
  if (session) {
    await prisma.chatErrorLog.deleteMany({ where: { conversationId: session.conversationId } });
    await prisma.chatConversation.delete({ where: { id: session.conversationId } });
  }
  await prisma.$disconnect();
}
