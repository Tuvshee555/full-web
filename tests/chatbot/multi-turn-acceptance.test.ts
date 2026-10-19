import test from "node:test";
import assert from "node:assert/strict";
import { multiTurnScenarios } from "../../scripts/chatbot-scenarios.mjs";
import { products, fakeOrder } from "./helpers/fixtures";
import { runFlow } from "./helpers/flow";

const scenarios = multiTurnScenarios({ products, orderNumber: fakeOrder.number, phone: fakeOrder.phone, wrongPhone: fakeOrder.wrongPhone });
for (const scenario of scenarios) test(`multi-turn acceptance: ${scenario.id}`, async () => {
  assert.ok(scenario.turns.length >= 4);
  const results = await runFlow(scenario.turns.map((turn: { text: string }) => turn.text), scenario.locale as "mn" | "en");
  for (let i = 0; i < results.length; i++) {
    const text = results[i].text, item = scenario.turns[i];
    const prose = products.reduce((result, product) => result.replaceAll(product.productName, ""), text);
    if (scenario.locale === "en") assert.doesNotMatch(prose, /[А-Яа-яӨҮөү]{4,}/);
    else assert.match(prose, /[А-Яа-яӨҮөү]/);
    if (item.card) assert.match(text, /QPay/);
    if (item.order === "correct") assert.match(text, /paid|төлбөр төлөгдсөн/i);
    if (item.order === "wrong" || item.order === "missing") assert.doesNotMatch(text, /Order status:|Захиалгын төлөв:/);
  }
});
