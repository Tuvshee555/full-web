// Opt-in integration test for the chat assistant's persistence: its OWN temporary PostgreSQL
// cluster (never the development or production database), the real handler, real SQL.
// Covers what unit tests cannot: lead reason/context columns, customer name/phone on the
// conversation, a confirmed chat order through the shared order service, automatic hand-back,
// the reservation policy (one unpaid chat order per phone, the per-item cap, concurrent
// confirmations, expiry through the secured cron endpoint, the website checkout left alone),
// fact verification, the audit trail and the daily budget.
//   npm run test:chatbot:db
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";
import { PrismaClient } from "@prisma/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.CHATBOT_DB_TEST_PORT) || 5442;
const database = "chatbot_integration";
const password = crypto.randomBytes(16).toString("hex");
const url = `postgresql://postgres:${password}@127.0.0.1:${port}/${database}?sslmode=disable&connection_limit=12`;
const directory = await mkdtemp(path.join(os.tmpdir(), "eyebrow-chatbot-"));
const pg = new EmbeddedPostgres({
  databaseDir: path.join(directory, "postgres"), port, user: "postgres", password, persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C", "--no-sync"], postgresFlags: ["-c", "listen_addresses=127.0.0.1"], onLog: () => {}, onError: () => {},
});
let prisma; let started = false; let passed = 0; let failed = false;

const ensurePortAvailable = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", () => reject(new Error(`Integration-test port ${port} is busy. Stop that test process and retry, or set CHATBOT_DB_TEST_PORT to another port.`)));
  server.listen(port, "127.0.0.1", () => server.close(resolve));
});
const applySchema = () => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [path.join(root, "node_modules/prisma/build/index.js"), "db", "push", "--skip-generate", "--schema", path.join(root, "server/prisma/schema.prisma")], {
    cwd: root, windowsHide: true, env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url }, stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  child.once("error", reject);
  child.once("close", (code) => code === 0 ? resolve() : reject(new Error(`Could not initialize isolated schema: ${output.replaceAll(password, "[redacted]")}`)));
});

try {
  await ensurePortAvailable();
  console.log("Initializing a new isolated PostgreSQL cluster for the chat assistant...");
  await pg.initialise(); await pg.start(); started = true;
  await pg.createDatabase(database);
  await applySchema();
  process.env.DATABASE_URL = url; process.env.DIRECT_URL = url;
  process.env.NODE_ENV = "test"; process.env.ERROR_LOG_DB_ENABLED = "false"; process.env.DELIVERY_FEE = "9000";
  for (const key of Object.keys(process.env)) if (/^(?:TELEGRAM_|SMTP_|EMAIL_|OPENAI_|META_|CLOUDINARY_|AI_|VERCEL)/.test(key)) delete process.env[key];
  // A fake key so the model path is exercised; every network call goes to the fake below, never to OpenAI.
  process.env.OPENAI_API_KEY = "test-key-not-real";
  process.env.OPENAI_MODEL = "gpt-4.1";
  process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
  const modelCalls = [];
  let modelMode = "fail";
  globalThis.fetch = async (input, init) => {
    const target = String(input);
    if (!target.startsWith("https://api.openai.com/")) throw new Error(`External network forbidden in chatbot integration tests: ${target}`);
    const body = JSON.parse(String(init?.body || "{}"));
    modelCalls.push({ model: body.model, json: Boolean(body.response_format) });
    if (modelMode === "fail") throw new Error("simulated provider outage");
    const content = body.response_format ? JSON.stringify({ product: null, intent: "smalltalk", topics: [], variant: null, products: [], certainty: "none", unknown_product: null }) : "Би дэлгүүрийн туслах. Бүтээгдэхүүний талаар асуугаарай.";
    return new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: "stop" }], usage: { prompt_tokens: 1000, completion_tokens: 50, total_tokens: 1050 } }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  prisma = new PrismaClient({ datasources: { db: { url } } });
  globalThis.prisma = prisma;
  const { transporter } = await import("../server/utils/mailer.js");
  transporter.sendMail = async () => ({ accepted: [] });
  const { handleCustomerMessage } = await import("../src/chatbot/handler.ts");
  const { backgroundSettled } = await import("../server/utils/background.js");

  await prisma.chatSettings.create({ data: { id: "default", chatOrdersEnabled: true, handoverAutoResumeHours: 24 } });
  const verifiedAt = new Date().toISOString();
  const product = await prisma.product.create({ data: { productName: "Тест сэрум", price: 50000, image: "/x.png", ingredients: "Тест", volume: "5 мл", howToUse: "Орой түрхэнэ.", verifiedFacts: { volume: verifiedAt, usage: verifiedAt }, sizes: { create: [{ label: "5 мл", stock: 3 }] } } });
  await prisma.chatFaq.create({ data: { question: "Ажлын цаг хэд вэ?", answer: "Тест: 10:00–18:00." } });
  const conversation = await prisma.chatConversation.create({ data: { channel: "website", tokenHash: "x", locale: "mn" } });
  const turn = async (text) => (await handleCustomerMessage({ conversationId: conversation.id, text, clientMessageId: crypto.randomUUID() })).reply?.text ?? "";

  // Published facts and the shop FAQ are read live from the database.
  assert.match(await turn("Тест сэрум яаж хэрэглэх вэ?"), /Орой түрхэнэ/);
  assert.match(await turn("Ажлын цаг хэд вэ?"), /10:00–18:00/);
  console.log("PASS product facts and the shop FAQ answer from the database"); passed += 1;

  // A hand-off writes the lead with its reason and context, and the customer's phone lands on the conversation.
  assert.match(await turn("Бүтээгдэхүүн гэмтэлтэй ирсэн"), /ажилтан/i);
  await turn("Бат 99000000");
  const lead = await prisma.chatLead.findFirstOrThrow({ where: { conversationId: conversation.id } });
  assert.equal(lead.reason, "complaint");
  assert.match(lead.context, /гэмтэлтэй/);
  const flagged = await prisma.chatConversation.findUniqueOrThrow({ where: { id: conversation.id } });
  assert.equal(flagged.needsHuman, true);
  assert.equal(flagged.handoffReason, "complaint");
  assert.equal(flagged.customerPhone, "99000000");
  assert.ok(flagged.handoffAt);
  console.log("PASS hand-off reason, context and customer phone are stored"); passed += 1;

  // A confirmed chat order goes through the shared order service: guest customer, priced server-side, stock reserved.
  assert.match(await turn("Тест сэрум 2 ширхэг авъя"), /\/buy\//);
  assert.match(await turn("энд захиалъя"), /нэр|утас/i);
  assert.match(await turn("Дорж 88000000"), /хаяг/i);
  assert.match(await turn("Баянгол дүүрэг 3-р хороо 5-р байр 12 тоот"), /109,000₮/);
  const created = await turn("тийм");
  await backgroundSettled();
  assert.match(created, /Захиалга бүртгэгдлээ/);
  const order = await prisma.order.findFirstOrThrow({ include: { orderItems: true } });
  assert.equal(order.totalPrice, 2 * 50000 + 9000);
  assert.equal(order.paymentMethod, "BANK");
  assert.equal(order.status, "WAITING_PAYMENT");
  assert.equal(order.orderItems[0].quantity, 2);
  assert.equal(order.phone, "88000000");
  assert.equal(order.district, "Баянгол");
  assert.equal(order.khoroo, "3");
  assert.match(created, new RegExp(order.orderNumber));
  assert.equal((await prisma.productSize.findFirstOrThrow({ where: { productId: product.id } })).stock, 1);
  assert.equal((await prisma.chatConversation.findUniqueOrThrow({ where: { id: conversation.id } })).customerName, "Дорж");
  assert.equal(await prisma.order.count(), 1, "a second confirmation never duplicates");
  await turn("тийм");
  assert.equal(await prisma.order.count(), 1);
  console.log("PASS a confirmed chat order is created once through the shared order service"); passed += 1;

  // A person took over and went quiet: the assistant resumes after the limit, not before.
  await prisma.chatConversation.update({ where: { id: conversation.id }, data: { paused: true, lastHumanAt: new Date(Date.now() - 2 * 3_600_000), state: { humanTakeoverAt: new Date().toISOString(), pauseReason: "manual" } } });
  const held = await handleCustomerMessage({ conversationId: conversation.id, text: "Сайн байна уу", clientMessageId: crypto.randomUUID() });
  assert.equal(held.reply, null); assert.equal(held.paused, true);
  await prisma.chatConversation.update({ where: { id: conversation.id }, data: { lastHumanAt: new Date(Date.now() - 30 * 3_600_000) } });
  const resumed = await handleCustomerMessage({ conversationId: conversation.id, text: "Сайн байна уу", clientMessageId: crypto.randomUUID() });
  assert.ok(resumed.reply?.text);
  const after = await prisma.chatConversation.findUniqueOrThrow({ where: { id: conversation.id } });
  assert.equal(after.paused, false); assert.ok(after.botReleasedAt);
  console.log("PASS a taken-over chat returns to the assistant after the owner's silence limit"); passed += 1;

  // The provider was "down" for every turn above (fetch throws): the assistant still answered every one.
  assert.ok(modelCalls.length > 0, "the model path was exercised");
  console.log(`PASS every turn was answered while the model provider failed (${modelCalls.length} failed model calls)`); passed += 1;

  // Admin edits through the real product controller reach the very next answer (no cache in between).
  const { updateProduct } = await import("../server/controller/products/update-product.js");
  const controllerRes = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await updateProduct({ params: { id: product.id }, body: { price: 55000, howToUse: "Шинэ заавар: өглөө түрхэнэ." } }, controllerRes);
  assert.equal(controllerRes.statusCode, 200);
  assert.match(await turn("Тест сэрум үнэ хэд вэ"), /55,000₮/);
  // Changed text loses its verification tick: the assistant no longer quotes it until the owner re-verifies.
  const unverified = await turn("Тест сэрум яаж хэрэглэх вэ");
  assert.match(unverified, /нийтлээгүй/);
  assert.doesNotMatch(unverified, /Шинэ заавар/);
  const reverify = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await updateProduct({ params: { id: product.id }, body: { verifiedFacts: { usage: true } } }, reverify);
  assert.equal(reverify.statusCode, 200);
  assert.ok(reverify.body.verifiedFacts.usage, "the tick is dated");
  const freshChat = await prisma.chatConversation.create({ data: { channel: "website", tokenHash: "v", locale: "mn" } });
  assert.match((await handleCustomerMessage({ conversationId: freshChat.id, text: "Тест сэрум яаж хэрэглэх вэ", clientMessageId: crypto.randomUUID() })).reply?.text ?? "", /Шинэ заавар/);
  console.log("PASS an admin price edit is in the next answer; an edited fact is quoted only once re-verified"); passed += 1;

  // Admin API: permissions, notes, search, knowledge, FAQ guard, analytics, no secrets.
  const jwt = (await import("jsonwebtoken")).default;
  const admin = await prisma.user.create({ data: { email: "admin@example.invalid", role: "ADMIN", password: "x" } });
  const shopper = await prisma.user.create({ data: { email: "shopper@example.invalid", role: "USER", password: "x" } });
  const token = (user) => jwt.sign({ id: user.id, role: user.role, type: "access" }, process.env.JWT_SECRET, { algorithm: "HS256" });
  const call = async (route, { method = "GET", query = {}, body, user } = {}) => {
    const handler = (await import(route)).default;
    const res = { statusCode: 200, headers: {}, body: undefined, headersSent: false,
      status(code) { this.statusCode = code; return this; }, setHeader(key, value) { this.headers[key.toLowerCase()] = value; return this; },
      json(payload) { this.body = payload; this.headersSent = true; return this; }, send(payload) { this.body = payload; this.headersSent = true; return this; }, end() { this.headersSent = true; return this; } };
    await handler({ method, query, body, headers: user ? { authorization: `Bearer ${token(user)}` } : {}, socket: { remoteAddress: "127.0.0.1" } }, res);
    return res;
  };
  const conversationsRoute = "../src/pages/api/chatbot/admin/conversations/[[...path]].ts";
  assert.equal((await call(conversationsRoute, { query: {} })).statusCode, 401);
  assert.equal((await call(conversationsRoute, { query: {}, user: shopper })).statusCode, 403);
  assert.equal((await call(conversationsRoute, { method: "PATCH", query: { path: [conversation.id] }, body: { notes: "Залгасан, маргааш дахин." }, user: admin })).statusCode, 200);
  assert.equal((await prisma.chatConversation.findUniqueOrThrow({ where: { id: conversation.id } })).notes, "Залгасан, маргааш дахин.");
  const found = await call(conversationsRoute, { query: { q: "Дорж" }, user: admin });
  assert.deepEqual(found.body.rows.map((row) => row.id), [conversation.id]);
  const detail = await call(conversationsRoute, { query: { path: [conversation.id] }, user: admin });
  assert.equal(detail.body.notes, "Залгасан, маргааш дахин.");
  assert.equal(detail.body.lead.reason, "complaint");
  const system = await call("../src/pages/api/chatbot/admin/system.ts", { user: admin });
  assert.equal(system.body.aiConfigured, true);
  assert.doesNotMatch(JSON.stringify(system.body), /test-key-not-real/);
  const knowledge = await call("../src/pages/api/chatbot/admin/knowledge.ts", { user: admin });
  assert.deepEqual(knowledge.body.products[0].missing, ["ingredientList"]);
  assert.equal((await call("../src/pages/api/chatbot/admin/knowledge.ts", { user: shopper })).statusCode, 403);
  const faqRoute = "../src/pages/api/chatbot/admin/faq.ts";
  assert.equal((await call(faqRoute, { method: "POST", body: { question: "Хямдрал бий юу?", answer: "20% хямдралтай." }, user: admin })).statusCode, 400);
  assert.equal((await call(faqRoute, { method: "POST", body: { question: "Очиж авч болох уу?", answer: "Тест: очиж авах боломжгүй, зөвхөн хүргэлтээр." }, user: admin })).statusCode, 201);
  assert.match(await turn("Очиж авч болох уу?"), /зөвхөн хүргэлтээр/);
  const analytics = await call("../src/pages/api/chatbot/admin/analytics.ts", { user: admin });
  assert.equal(analytics.body.period.ordersFromChat, 1);
  assert.ok(analytics.body.period.handovers >= 1);
  assert.equal(analytics.body.period.handoversByReason.complaint >= 1, true);
  assert.equal(knowledge.body.products[0].status.usage, "verified");
  assert.equal(knowledge.body.products[0].status.ingredients, "missing");
  assert.equal(knowledge.body.products[0].status.description, "unverified");
  console.log("PASS admin API: permissions, notes, search, knowledge, FAQ amount guard, analytics, no secrets"); passed += 1;

  // ── Reservation policy (defaults: 60 minutes, one unpaid chat order per phone, 5 units per option) ──
  const chatWith = async (phoneTag) => { const row = await prisma.chatConversation.create({ data: { channel: "website", tokenHash: `r-${phoneTag}-${crypto.randomUUID()}`, locale: "mn" } }); return (text) => handleCustomerMessage({ conversationId: row.id, text, clientMessageId: crypto.randomUUID() }).then((result) => result.reply?.text ?? ""); };
  const orderFlow = async (say, phone, quantity = 1) => { await say(`Тест сэрум ${quantity} ширхэг авъя`); await say("энд захиалъя"); await say(`Бат ${phone}`); await say("Баянгол дүүрэг 3-р хороо 5-р байр"); return say("тийм"); };
  const stockNow = async () => (await prisma.productSize.findFirstOrThrow({ where: { productId: product.id } })).stock;
  const firstOrder = await prisma.order.findFirstOrThrow({ where: { source: "chat" } });
  assert.ok(firstOrder.expiresAt && firstOrder.expiresAt.getTime() - firstOrder.createdAt.getTime() > 59 * 60_000 && firstOrder.expiresAt.getTime() - firstOrder.createdAt.getTime() < 61 * 60_000, "a chat order holds its stock for 60 minutes");
  // (a) The same phone cannot hold a second unpaid chat order; the customer is shown the first one.
  const refused = await orderFlow(await chatWith("a"), "88000000");
  assert.match(refused, new RegExp(`№${firstOrder.orderNumber}`));
  assert.doesNotMatch(refused, /бүртгэгдлээ/);
  assert.equal(await prisma.order.count(), 1);
  assert.equal(await stockNow(), 1);
  // (b) More than 5 units of one option never becomes a chat order.
  const bulk = await (await chatWith("b"))("Тест сэрум 6 ширхэг авъя");
  assert.match(bulk, /хамгийн ихдээ 5 ширхэг|нөөц хүрэлцэхгүй/);
  assert.equal(await prisma.order.count(), 1);
  // (c) The website checkout is not limited by the chat policy: the same phone orders on the site.
  const { placeOrder: placeWebOrder } = await import("../server/services/placeOrder.js");
  const webGuest = await prisma.user.create({ data: { email: `guest-${crypto.randomUUID()}@guest.invalid` } });
  const web = await placeWebOrder({ userId: webGuest.id, items: [{ productId: product.id, size: "5 мл", quantity: 1 }], paymentMethod: "QPAY", firstName: "Бат", lastName: "-", phone: "88000000", city: "Улаанбаатар", district: "Баянгол", khoroo: "3", address: "x" });
  assert.equal(web.order.source, "web");
  assert.ok(web.order.expiresAt && Math.abs(web.order.expiresAt.getTime() - Date.now() - 15 * 60_000) < 60_000, "QPay: 15 minutes");
  assert.equal(await stockNow(), 0);
  // (d) The secured cron endpoint: refused without the secret, expires due orders once, records the run.
  process.env.CRON_SECRET = "integration-test-cron-secret-value";
  process.env.VERCEL_ENV = "production";
  await prisma.order.updateMany({ where: { id: { in: [firstOrder.id, web.order.id] } }, data: { expiresAt: new Date(Date.now() - 1000) } });
  const cronRoute = "../src/pages/api/jobs/expire-orders.ts";
  assert.equal((await call(cronRoute, { query: {} })).statusCode, 401);
  const cronRun = await call(cronRoute, { query: {}, user: null });
  assert.equal(cronRun.statusCode, 401, "an admin token is not the cron secret");
  const handler = (await import(cronRoute)).default;
  const cronRes = { statusCode: 200, headers: {}, body: undefined, headersSent: false, status(code) { this.statusCode = code; return this; }, setHeader() { return this; }, json(payload) { this.body = payload; this.headersSent = true; return this; }, end() { this.headersSent = true; return this; } };
  await handler({ method: "POST", query: {}, headers: { authorization: "Bearer integration-test-cron-secret-value" }, socket: { remoteAddress: "127.0.0.1" } }, cronRes);
  assert.equal(cronRes.statusCode, 200);
  assert.equal(cronRes.body.expired, 2);
  assert.equal(await stockNow(), 3, "both reservations returned their stock");
  const expiredRow = await prisma.order.findUniqueOrThrow({ where: { id: firstOrder.id } });
  assert.equal(expiredRow.status, "CANCELLED"); assert.ok(expiredRow.expiredAt);
  const again = { ...cronRes, body: undefined };
  await handler({ method: "POST", query: {}, headers: { authorization: "Bearer integration-test-cron-secret-value" }, socket: { remoteAddress: "127.0.0.1" } }, again);
  assert.equal(again.body.expired, 0, "a repeated run restocks nothing twice");
  assert.equal(await stockNow(), 3);
  const runs = await prisma.jobRun.findMany({ where: { name: "expire-orders" }, orderBy: { startedAt: "asc" } });
  assert.deepEqual(runs.map((run) => [run.trigger, run.ok, run.processed]), [["cron", true, 2], ["cron", true, 0]]);
  delete process.env.VERCEL_ENV; delete process.env.CRON_SECRET;
  // (e) After the expiry the same phone may order again (a legitimate purchase), and the audit trail has it all.
  const second = await orderFlow(await chatWith("e"), "88000000");
  assert.match(second, /бүртгэгдлээ/);
  assert.equal(await prisma.order.count({ where: { source: "chat", status: "WAITING_PAYMENT" } }), 1);
  await backgroundSettled();
  const audit = await prisma.chatAuditLog.findMany({ orderBy: { createdAt: "asc" } });
  const actions = audit.map((row) => row.action);
  for (const expected of ["chat_order_created", "orders_expired", "conversation_notes", "faq_created", "product_facts_updated"]) assert.ok(actions.includes(expected), `audit has ${expected}: ${actions.join(",")}`);
  assert.ok(audit.every((row) => !JSON.stringify(row.details).includes("Баянгол") && !JSON.stringify(row).includes("test-key-not-real")), "no address or secret in the audit log");
  assert.equal((await call("../src/pages/api/chatbot/admin/audit.ts", { query: {}, user: shopper })).statusCode, 403);
  assert.ok((await call("../src/pages/api/chatbot/admin/audit.ts", { query: {}, user: admin })).body.rows.length >= 5);
  console.log("PASS reservation policy: one unpaid chat order per phone, the per-item cap, the website unaffected, cron expiry once, audit trail"); passed += 1;
  // (f) Two chats confirm for the same phone at the same moment: the per-phone lock lets exactly one through.
  const sayF1 = await chatWith("f1"); const sayF2 = await chatWith("f2");
  for (const say of [sayF1, sayF2]) { await say("Тест сэрум авъя"); await say("энд захиалъя"); await say("Бат 77001122"); await say("Баянгол дүүрэг 3-р хороо 5-р байр"); }
  const both = await Promise.allSettled([sayF1("тийм"), sayF2("тийм")]);
  assert.ok(both.every((outcome) => outcome.status === "fulfilled"), JSON.stringify(both));
  assert.equal(await prisma.order.count({ where: { phone: "77001122" } }), 1, "exactly one order for the phone");
  assert.equal(both.filter((outcome) => /бүртгэгдлээ/.test(outcome.value)).length, 1);
  assert.equal(both.filter((outcome) => /№/.test(outcome.value) && !/бүртгэгдлээ/.test(outcome.value)).length, 1, "the other chat is shown the existing order");
  console.log("PASS concurrent confirmations for one phone create exactly one reservation"); passed += 1;

  // Model usage is recorded per model with an estimated cost; the owner's model choice is the model called.
  const { resetAiUsageCacheForTests } = await import("../src/chatbot/aiUsage.ts");
  const { invalidateSettings } = await import("../src/chatbot/settings.mjs");
  const settingsRefresh = () => new Promise((resolve) => setTimeout(resolve, 5_200));
  process.env.AI_USAGE_ENVIRONMENT = "production";
  await prisma.chatSettings.update({ where: { id: "default" }, data: { aiModel: "gpt-4.1-mini", aiDailyBudgetUsd: 5 } });
  invalidateSettings(); resetAiUsageCacheForTests();
  await settingsRefresh(); // a settings change reaches every process within the 5-second settings cache
  modelMode = "ok"; modelCalls.length = 0;
  // A fresh chat: the first one has used up its 15-messages-a-minute rate limit (which is itself working).
  const usageConversation = await prisma.chatConversation.create({ data: { channel: "website", tokenHash: "z", locale: "mn" } });
  const usageTurn = async (text) => (await handleCustomerMessage({ conversationId: usageConversation.id, text, clientMessageId: crypto.randomUUID() })).reply?.text ?? "";
  const answered = await usageTurn("Чамайг хэн хийсэн бэ?");
  await backgroundSettled();
  assert.ok(answered);
  assert.ok(modelCalls.length >= 1);
  assert.ok(modelCalls.every((callMade) => callMade.model === "gpt-4.1-mini"), `only the chosen model is called: ${JSON.stringify(modelCalls)}`);
  const usage = await prisma.chatAiUsage.findMany();
  const recordedCalls = usage.reduce((sum, row) => sum + row.calls, 0);
  assert.equal(recordedCalls, modelCalls.length);
  assert.equal(usage.reduce((sum, row) => sum + row.promptTokens, 0), 1000 * modelCalls.length);
  assert.ok(Math.abs(usage.reduce((sum, row) => sum + row.estCostUsd, 0) - modelCalls.length * (1000 * 0.4 + 50 * 1.6) / 1e6) < 1e-9);
  assert.ok(usage.every((row) => row.environment === "production" && row.model === "gpt-4.1-mini"));
  console.log(`PASS ${recordedCalls} model call(s) recorded with tokens and estimated cost, on the owner's chosen model`); passed += 1;

  // Over the daily budget the model is not called at all, and the customer still gets an answer.
  await prisma.chatSettings.update({ where: { id: "default" }, data: { aiDailyBudgetUsd: 0.000001 } });
  invalidateSettings(); resetAiUsageCacheForTests();
  await settingsRefresh(); // a settings change reaches every process within the 5-second settings cache
  modelCalls.length = 0;
  assert.ok(await usageTurn("Чамайг хэн хийсэн бэ?"));
  assert.equal(modelCalls.length, 0, "no model call over budget");
  console.log("PASS over the daily budget the model is skipped and the assistant still answers"); passed += 1;

  // The admin test chat never creates a real order.
  const ordersBeforeTestChat = await prisma.order.count();
  const testConversation = await prisma.chatConversation.create({ data: { channel: "test", tokenHash: "y", locale: "mn" } });
  const testTurn = async (text) => (await handleCustomerMessage({ conversationId: testConversation.id, text, clientMessageId: crypto.randomUUID() })).reply?.text ?? "";
  await testTurn("Тест сэрум авъя"); await testTurn("энд захиалъя"); await testTurn("Тест 99112233"); await testTurn("Хан-Уул 2-р хороо 3-р байр");
  assert.match(await testTurn("тийм"), /TEST-/);
  assert.equal(await prisma.order.count(), ordersBeforeTestChat, "the test chat created no order");
  console.log("PASS the admin test chat simulates orders and never creates one"); passed += 1;

  // Chat customers are stored like checkout guests (emails are never sent to them).
  const guest = await prisma.user.findFirstOrThrow({ where: { email: { endsWith: "@guest.invalid" } } });
  assert.match(guest.email, /^guest-chat-/);
  const { isDeliverableEmail } = await import("../server/utils/orderNotify.js");
  assert.equal(isDeliverableEmail(guest.email), false);
  console.log("PASS chat-order customers are synthetic guests that are never emailed"); passed += 1;

  await backgroundSettled();
  console.log(`Chat assistant integration: ${passed} checks passed against an isolated temporary PostgreSQL cluster.`);
} catch (error) {
  console.error(String(error?.stack || error).replaceAll(password, "[redacted]"));
  failed = true;
} finally {
  await prisma?.$disconnect().catch(() => {});
  if (started) await pg.stop().catch(() => {});
  // Delete only the directory this run created inside the system temp folder.
  const resolved = path.resolve(directory);
  if (path.basename(resolved).startsWith("eyebrow-chatbot-") && path.dirname(resolved) === path.resolve(os.tmpdir())) {
    await rm(resolved, { recursive: true, force: true }).catch(() => {});
  } else console.error("Refusing to remove an unexpected integration directory");
}
// Set explicitly: the embedded server's shutdown must not turn a failed run into exit code 0.
process.exit(failed ? 1 : 0);
