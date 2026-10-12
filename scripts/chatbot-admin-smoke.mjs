import dotenv from "dotenv";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
dotenv.config({ path: [".env.local", ".env"], quiet: true });
const { prisma } = await import("../server/utils/prisma.js");
const base = (process.env.CHATBOT_SMOKE_URL || "http://localhost:3000") + "/api/admin/chat";
const tag = randomUUID();
let admin;
let customer;
const conversations = [];
async function request(path, token, method = "GET", body) {
  const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = response.status === 204 ? null : await response.json();
  return { response, data };
}
try {
  admin = await prisma.user.create({ data: { role: "ADMIN", email: `chatbot-admin-${tag}@guest.invalid`, firstName: "Тест", lastName: "Захиалга" } });
  customer = await prisma.user.create({ data: { role: "USER", email: `chatbot-user-${tag}@guest.invalid`, firstName: "Тест", lastName: "Захиалга" } });
  const adminToken = jwt.sign({ id: admin.id, role: "ADMIN", type: "access" }, process.env.JWT_SECRET, { expiresIn: "5m" });
  const fakeAdminToken = jwt.sign({ id: customer.id, role: "ADMIN", type: "access" }, process.env.JWT_SECRET, { expiresIn: "5m" });
  assert.equal((await request("/settings")).response.status, 401);
  assert.equal((await request("/settings", fakeAdminToken)).response.status, 403, "Role must be checked in DB");
  const settings = (await request("/settings", adminToken)).data;
  assert.equal((await request("/settings", adminToken, "PATCH", { lowStockThreshold: settings.lowStockThreshold })).response.status, 200);
  assert.equal((await request("/settings", adminToken, "PATCH", { lowStockThreshold: 0 })).response.status, 400);
  assert.equal((await request("/settings", adminToken, "PATCH", { greetingEn: "100% guaranteed regrowth" })).response.status, 400);
  let result = await request("/test", adminToken, "POST", { text: "Hello", locale: "en", clientMessageId: randomUUID() });
  assert.equal(result.response.status, 200); const id = result.data.conversationId; conversations.push(id);
  result = await request("/test", adminToken, "POST", { conversationId: id, text: "What does delivery cost?", clientMessageId: randomUUID() });
  assert.equal(result.response.status, 200, "Test conversation resumes for same admin");
  const c = await prisma.chatConversation.create({ data: { channel: "website", tokenHash: tag, locale: "en" } }); conversations.push(c.id);
  assert.equal((await request(`/conversations/${c.id}`, adminToken, "PATCH", { paused: true })).response.status, 200);
  assert.ok((await prisma.chatConversation.findUnique({ where: { id: c.id } })).paused);
  const messageId = randomUUID();
  for (let n = 0; n < 2; n++) assert.equal((await request(`/conversations/${c.id}/messages`, adminToken, "POST", { text: "Test human reply", clientMessageId: messageId })).response.status, 200);
  assert.equal(await prisma.chatMessage.count({ where: { conversationId: c.id, role: "human" } }), 1);
  await prisma.chatLead.create({ data: { conversationId: c.id, name: "Test Lead", phone: "00000001", question: "Test question" } });
  const lead = (await request("/leads", adminToken)).data.rows.find((lead) => lead.conversationId === c.id);
  assert.ok(lead);
  assert.equal((await request(`/leads/${lead.id}`, adminToken, "PATCH", { status: "contacted" })).data.status, "contacted");
  assert.equal((await request(`/conversations/${c.id}`, adminToken, "PATCH", { paused: false })).response.status, 200);
  assert.equal((await prisma.chatConversation.findUnique({ where: { id: c.id } })).paused, false);
  await request(`/test/${id}`, adminToken, "DELETE");
  console.log("Admin DB-role auth, settings validation, test memory, takeover, idempotent human reply and leads: PASS");
} finally {
  await prisma.chatErrorLog.deleteMany({ where: { conversationId: { in: conversations } } });
  await prisma.chatConversation.deleteMany({ where: { id: { in: conversations } } });
  await prisma.user.deleteMany({ where: { id: { in: [admin?.id, customer?.id].filter(Boolean) } } });
  await prisma.$disconnect();
}
