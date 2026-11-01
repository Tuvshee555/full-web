import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import en from "../../src/admin/messages/en.json";
import mn from "../../src/admin/messages/mn.json";
import { STATUS_FLOW, nextStepKey, paymentDisplay, orderSteps, type OrderStatus } from "../../src/app/(admin)/admin/[locale]/(orders)/components/type";

type Messages = Record<string, unknown>;
const LOCALES: [string, Messages][] = [["en", en as Messages], ["mn", mn as Messages]];

/** Same lookup as ClientI18nProvider: a string, or a counted phrase { one, other }. */
function resolves(messages: Messages, key: string) {
  const value = key.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Messages)[k] : undefined), messages);
  return typeof value === "string" || (Boolean(value) && typeof value === "object" && typeof (value as Messages).other === "string");
}

function leaves(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  const object = value as Messages;
  if ("other" in object) return [prefix];
  return Object.entries(object).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
}

function adminSources() {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) files.push(full);
    }
  };
  walk("src/admin");
  walk("src/app/(admin)");
  return files;
}

test("admin translations have the same keys in Mongolian and English", () => {
  assert.deepEqual(leaves(mn).sort(), leaves(en).sort());
});

test("every translation key written in the admin code exists in both languages", () => {
  const keys = new Set<string>();
  // Any quoted "section.key" counts, so keys chosen in a condition (a ? "x.y" : "x.z") are checked too.
  const sections = new Set(Object.keys(en));
  for (const file of adminSources()) {
    const source = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const match of source.matchAll(/\bt\(\s*"([^"]+)"/g)) keys.add(match[1]);
    for (const match of source.matchAll(/"([a-z_]+(?:\.[A-Za-z_]+)+)"/g)) if (sections.has(match[1].split(".")[0])) keys.add(match[1]);
  }
  assert.ok(keys.size > 300, `expected the scan to find the admin's keys, found ${keys.size}`);
  for (const [locale, messages] of LOCALES) {
    const missing = [...keys].filter((key) => !resolves(messages, key));
    assert.deepEqual(missing, [], `${locale} is missing keys`);
  }
});

test("keys built from order data exist for every status, method and step", () => {
  const statuses = Object.keys(STATUS_FLOW) as OrderStatus[];
  const methods = ["QPAY", "BANK", "COD", "LEMON", undefined];
  const payments = ["PAID", "UNPAID", "REVIEW", "REFUNDED", undefined] as const;
  const keys = new Set<string>();
  for (const status of statuses) {
    keys.add(`order_status.${status}`);
    for (const next of STATUS_FLOW[status]) keys.add(`order_action.${next}`);
    for (const paymentMethod of methods) {
      keys.add(`payment_method.${paymentMethod ?? "UNKNOWN"}`);
      keys.add(`orders.payment_help.${paymentMethod ?? "UNKNOWN"}`);
      for (const step of orderSteps({ status, paymentMethod })) keys.add(`orders.steps.${step.key}`).add(`orders.steps.state_${step.state}`);
      for (const paymentStatus of payments) {
        const order = { status, paymentMethod, paymentStatus };
        keys.add(`orders.next.${nextStepKey(order)}`).add(`orders.next_short.${nextStepKey(order)}`).add(`payment_state.${paymentDisplay(order).key}`);
      }
    }
    keys.add(`orders.done.${status}`);
  }
  keys.delete("orders.done.PENDING");
  for (const tab of ["all", "awaiting_payment", "to_ship", "delivering", "delivered", "cancelled"]) keys.add(`orders.tabs.${tab}`).add(`orders.empty.${tab}.title`).add(`orders.empty.${tab}.body`);
  keys.add("orders.empty.search.title").add("orders.empty.search.body");
  for (const next of ["DELIVERING", "DELIVERED"]) keys.add(`orders.bulk.${next}`).add(`orders.bulk_done.${next}`).add(`orders.bulk_confirm.${next}.title`).add(`orders.bulk_confirm.${next}.body`);
  for (const view of ["overview", "orders", "messages", "products", "customers", "revenue", "assistant"]) keys.add(`nav.${view}`);
  for (const group of ["go", "orders", "customers", "products"]) keys.add(`search.groups.${group}`);
  for (const state of ["ok", "low", "partial", "soldout", "untracked"]) keys.add(`stock.state.${state}`);
  for (const filter of ["all", "restock", "soldout", "in_stock", "untracked"]) keys.add(`products.filter.stock_${filter}`);
  for (const sort of ["newest", "name", "price_low", "price_high", "stock"]) keys.add(`products.sort.${sort}`);
  for (const channel of ["website", "messenger", "instagram"]) keys.add(`chat.channel.${channel}`);
  for (const delivery of ["sent", "sending", "failed", "suppressed", "uncertain"]) keys.add(`chat.delivery.${delivery}`);
  for (const status of ["new", "contacted", "done"]) keys.add(`requests.mark.${status}`).add(`requests.toast.${status}`).add(`requests.status.${status}`).add(`requests.empty.${status}`);
  for (const tab of ["settings", "test", "activity", "log"]) keys.add(`assistant.tabs.${tab}`);
  for (const code of ["required", "too_long", "facts", "threshold"]) keys.add(`assistant.errors.${code}`);
  for (const field of ["greetingMn", "greetingEn", "handoffMn", "handoffEn", "extraKnowledgeMn", "extraKnowledgeEn"]) keys.add(`assistant.fields.${field}`);
  for (const level of ["all", "error", "warn", "info"]) keys.add(`log.levels.${level}`);
  for (const hours of ["24", "72", "168"]) keys.add(`log.range_${hours}`);
  for (const [locale, messages] of LOCALES) {
    const missing = [...keys].filter((key) => !resolves(messages, key));
    assert.deepEqual(missing, [], `${locale} is missing keys`);
  }
});

test("placeholders match between the two languages", () => {
  const lookup = (messages: Messages, key: string) => key.split(".").reduce<unknown>((acc, k) => (acc as Messages)[k], messages);
  const names = (value: unknown) => {
    const text = typeof value === "string" ? value : Object.values(value as Messages).join(" ");
    return [...new Set(text.match(/\{\w+\}/g) ?? [])].sort();
  };
  for (const key of leaves(en)) {
    assert.deepEqual(names(lookup(mn as Messages, key)), names(lookup(en as Messages, key)), key);
  }
});
