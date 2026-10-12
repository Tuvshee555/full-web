import dotenv from "dotenv";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { multiTurnScenarios } from "./chatbot-scenarios.mjs";
dotenv.config({ path: [".env.local", ".env"], quiet: true });
const { prisma } = await import("../server/utils/prisma.js");
const { handleCustomerMessage } = await import("../src/chatbot/handler.ts");
const { getSettings } = await import("../src/chatbot/settings.js");
const { readContext } = await import("../src/chatbot/catalogue.ts");
const { stockLevel, stockLabel } = await import("../server/utils/stockLevel.js");
const args = process.argv.slice(2), urlAt = args.indexOf("--url");
const remote = urlAt >= 0 ? args[urlAt + 1]?.replace(/\/$/, "") : null;
assert.ok(urlAt < 0 || /^https?:\/\//.test(remote || ""), "--url requires HTTP(S) origin");
if (remote) assert.ok((process.env.CHATBOT_QA_SECRET || "").length >= 32, "CHATBOT_QA_SECRET required for HTTP QA");
const settings = await getSettings();
assert.ok(settings.enabled, "Enable bot before QA");
const contexts = { mn: await readContext(settings, "mn"), en: await readContext(settings, "en") };
assert.ok(contexts.mn.products.length, "QA requires database catalogue");
const runId = randomUUID(), orderNumber = `QA-${runId.slice(0, 12)}`;
const phone = "00000001", wrongPhone = "00000002", privateMarker = `QA_PRIVATE_${runId}`;
const scenarios = multiTurnScenarios({ products: contexts.mn.products, orderNumber, phone, wrongPhone });
const rows = [], conversations = [];
let userId, orderId;
async function request(method, route, body, token) {
  const response = await fetch(`${remote}/api/chatbot/public/${route}`, { method, headers: { "Content-Type": "application/json", "x-chatbot-qa-secret": process.env.CHATBOT_QA_SECRET, ...(token ? { "x-chat-token": token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(35_000) });
  if (!response.ok) throw Object.assign(new Error("QA_HTTP_FAILED"), { code: `HTTP_${response.status}` });
  return response.status === 204 ? null : response.json();
}
function assess(item, result, locale) {
  const context = contexts[locale], text = result?.reply?.text || "", meta = result?.reply?.metadata || result?.metadata || {};
  const hard = [], quality = [];
  if (!text.trim()) hard.push("silent customer turn");
  if (result.paused) hard.push("handoff incorrectly paused bot");
  if (meta.verified === false) hard.push("unverified reply sent");
  const amounts = new Set([context.deliveryFee, ...context.products.flatMap(p => [p.price, p.oldPrice, ...p.sizes.map(s => s.price)].filter(v => v != null).map(Number))]);
  for (const m of text.matchAll(/([\d,]+(?:\.\d+)?)\s*(?:₮|MNT\b)/gi)) if (!amounts.has(Number(m[1].replaceAll(",", "")))) hard.push("invented price");
  for (const p of context.products) {
    for (const line of text.split("\n").filter(line => line.includes(p.foodName))) {
      const m = /([\d,]+(?:\.\d+)?)\s*₮/.exec(line);
      if (m && !new Set([p.price, p.oldPrice, ...p.sizes.map(s => s.price)].filter(v => v != null).map(Number)).has(Number(m[1].replaceAll(",", "")))) hard.push("product price mismatch");
    }
    for (const s of p.sizes) for (const line of text.split("\n").filter(line => line.includes(s.label))) {
      const actual = stockLabel(stockLevel(s, settings.lowStockThreshold), locale);
      for (const level of ["low", "soldout", "available"]) { const candidate = stockLabel(level, locale); if (line.toLowerCase().includes(candidate.toLowerCase()) && candidate !== actual) hard.push("variant stock mismatch"); }
      if (!settings.showExactStock && s.stock != null && new RegExp(`\\(${s.stock}\\)`).test(line)) hard.push("hidden stock exposed");
    }
  }
  if ([privateMarker, phone, wrongPhone, orderNumber].some(value => text.includes(value))) hard.push("private order details echoed");
  const status = /Order status:|Захиалгын төлөв:/.test(text);
  if (["wrong", "missing"].includes(item.order) && status) hard.push("order privacy leak");
  if (item.order === "correct" && !/paid|төлбөр төлөгдсөн/i.test(text)) quality.push("correct credentials did not return paid status");
  if (/100\s*%|guaranteed regrowth|will regrow|баталгаатай.*ургана/i.test(text)) hard.push("unsupported growth claim");
  const prose = context.products.reduce((value, p) => value.replaceAll(p.foodName, ""), text);
  if (locale === "en" && /[А-Яа-яӨҮөү]{4,}/.test(prose)) hard.push("Mongolian prose in English answer");
  if (locale === "mn" && text && !/[А-Яа-яӨҮөү]/.test(prose)) hard.push("Mongolian turn lacks Cyrillic answer");
  if (item.card && !/QPay/i.test(text)) quality.push("card answer lacks supported payment methods");
  const intents = meta.intents || (meta.topic ? [meta.topic] : []);
  if (intents.length && !item.intents.some(intent => intents.includes(intent))) quality.push(`unexpected intent (${intents.join(",")})`);
  return { hard: [...new Set(hard)], quality: [...new Set(quality)] };
}
try {
  const user = await prisma.user.create({ data: { email: `chatbot-qa-${runId}@guest.invalid`, firstName: "Тест", lastName: "Захиалга" } }); userId = user.id;
  const order = await prisma.foodOrder.create({ data: { userId, orderNumber, totalPrice: contexts.mn.products[0].price, deliveryFee: 0, status: "PAID", paymentMethod: "BANK", firstName: "Тест", lastName: "Захиалга", phone, address: privateMarker } }); orderId = order.id;
  async function runScenario(scenario) {
    let id, token;
    if (remote) { const c = await request("POST", "conversations", { locale: scenario.locale }); id = c.conversationId; token = c.token; }
    else { const c = await prisma.chatConversation.create({ data: { channel: "test", tokenHash: runId, locale: scenario.locale } }); id = c.id; }
    conversations.push({ id, token });
    for (let i = 0; i < scenario.turns.length; i++) {
      const item = scenario.turns[i];
      try { const result = remote ? await request("POST", `conversations/${id}/messages`, { text: item.text, clientMessageId: randomUUID() }, token) : await handleCustomerMessage({ conversationId: id, text: item.text, clientMessageId: randomUUID() }); const evaluation = assess(item, result, scenario.locale); rows.push({ scenario: scenario.id, turn: i + 1, locale: scenario.locale, message: item.text, reply: result.reply?.text || "", ...evaluation, pass: !evaluation.hard.length && !evaluation.quality.length }); }
      catch (error) { rows.push({ scenario: scenario.id, turn: i + 1, locale: scenario.locale, message: item.text, reply: "", hard: [error.code || "handler failure"], quality: [], pass: false }); }
    }
    const subset = rows.filter(row => row.scenario === scenario.id); console.log(`${scenario.id}: ${subset.filter(row => row.pass).length}/${subset.length} passed`);
  }
  for (let i = 0; i < scenarios.length; i += 3) await Promise.all(scenarios.slice(i, i + 3).map(runScenario));
  const passed = rows.filter(row => row.pass).length, hardFailures = rows.filter(row => row.hard.length).length;
  const summary = { runId, runtime: remote || "local handler", model: process.env.OPENAI_MODEL || "gpt-4o", conversations: scenarios.length, turns: rows.length, passed, passRate: Number((passed / rows.length * 100).toFixed(2)), hardCriteriaPassed: rows.length - hardFailures, hardCriteriaRate: Number(((rows.length - hardFailures) / rows.length * 100).toFixed(2)), rows };
  const suffix = remote ? "PRODUCTION" : "LOCAL", cell = value => String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
  await fs.mkdir("docs/chatbot", { recursive: true }); await fs.writeFile(`docs/chatbot/QA_MULTITURN_${suffix}.json`, JSON.stringify(summary, null, 2) + "\n");
  await fs.writeFile(`docs/chatbot/QA_MULTITURN_${suffix}.md`, `# Multi-turn QA: ${suffix}\n\n${passed}/${rows.length} (${summary.passRate}%) passed across ${scenarios.length} conversations. Hard criteria ${summary.hardCriteriaPassed}/${rows.length} (${summary.hardCriteriaRate}%). Products/variants were read from the database. QA channels suppress owner alerts; cleanup uses exact IDs.\n\n| Conversation / turn | Customer | Reply | Result | Reason |\n| --- | --- | --- | --- | --- |\n${rows.map(row => `| ${cell(row.scenario)} / ${row.turn} | ${cell(row.message)} | ${cell(row.reply)} | ${row.pass ? "PASS" : "FAIL"} | ${cell([...row.hard, ...row.quality].join("; ") || "Evidence/language/privacy checks passed")} |`).join("\n")}\n`);
  console.log(JSON.stringify({ conversations: scenarios.length, turns: rows.length, passed, passRate: summary.passRate, hardCriteriaRate: summary.hardCriteriaRate }));
  if (summary.passRate < 95 || hardFailures) process.exitCode = 1;
} finally {
  for (const c of conversations) { if (remote) await request("DELETE", `conversations/${c.id}`, null, c.token).catch(() => {}); await prisma.chatErrorLog.deleteMany({ where: { conversationId: c.id } }); await prisma.chatConversation.deleteMany({ where: { id: c.id, channel: "test" } }); }
  if (orderId) await prisma.$transaction(async tx => { await tx.payment.deleteMany({ where: { orderId } }); await tx.lemonPayment.deleteMany({ where: { orderId } }); await tx.orderItem.deleteMany({ where: { orderId } }); await tx.foodOrder.deleteMany({ where: { id: orderId, userId, firstName: "Тест", lastName: "Захиалга" } }); });
  if (userId) await prisma.user.deleteMany({ where: { id: userId, email: `chatbot-qa-${runId}@guest.invalid` } });
  await prisma.$disconnect(); console.log("Exact QA IDs cleaned up; no stock reserved or payment invoices created.");
}
